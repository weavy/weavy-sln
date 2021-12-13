using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web.Http;
using System.Web.Http.Description;
using Weavy.Core;
using Weavy.Core.Localization;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Web.Api.Controllers;
using Weavy.Web.Api.Models;
using Weavy.Web.Models;

namespace Weavy.Areas.Api.Controllers {

    /// <summary>
    /// Api controller for manipulating Conversations.
    /// </summary>
    [RoutePrefix("api")]
    public class ConversationsController : WeavyApiController {

        private static readonly StringLocalizer T = StringLocalizer.CreateInstance();

        /// <summary>
        /// Get the conversation with the specified id.
        /// </summary>
        /// <param name="id">The conversation id.</param>
        /// <example>GET /api/conversations/527</example>
        /// <returns>The conversation.</returns>
        [HttpGet]
        [ResponseType(typeof(ConversationOutModel))]
        [Route("conversations/{id:int}")]
        public IHttpActionResult Get(int id) {

            // read conversation
            ConversationService.SetRead(id, DateTime.UtcNow);
            var c = GetConversation(id);
            var conversationOut = GetConversationOut(c);

            // copy members property
            conversationOut.Members = c.Members;

            return Ok(conversationOut);
        }

        /// <summary>
        /// Get all conversations for the current user.
        /// </summary>        
        /// <example>GET /api/conversations</example>
        /// <returns>The users conversations.</returns>
        [HttpGet]
        [ResponseType(typeof(List<ConversationOutModel>))]
        [Route("conversations")]
        public IHttpActionResult List(Query query) {
            var result = ConversationService.Search(new ConversationQuery(query) { OrderBy = "PinnedAt DESC, LastMessageAt DESC" });
            var conversations = new List<ConversationOutModel>();

            foreach (var c in result) {
                var conversationOut = GetConversationOut(c);
                conversations.Add(conversationOut);
            }
            return Ok(conversations);
        }

        /// <summary>
        /// Create a new or get the existing conversation between the current and specified user.
        /// </summary>
        /// <param name="model">The <see cref="ConversationIn"/> to insert.</param>
        /// <returns>The conversation.</returns>
        [HttpPost]
        [ResponseType(typeof(Conversation))]
        [Route("conversations")]
        public IHttpActionResult Create(ConversationInModel model) {
            string name = null;
            if (model.Members.Count() > 1) {
                name = string.Join(", ", model.Members.Select(u => UserService.Get(u).GetTitle()));
            }

            // create new room or one-on-one conversation or get the existing one
            return Ok(ConversationService.Insert(new Conversation() { Name = name }, model.Members));
        }

        /// <summary>
        /// Get the messages in the specified conversation.
        /// </summary>
        /// <param name="id">The conversation id.</param>
        /// <param name="opts">Query options for paging, sorting etc.</param>
        /// <returns>Returns a potentially paged list of the messages in the conversation.</returns>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<MessageOutModel>))]
        [Route("conversations/{id:int}/messages")]
        public IHttpActionResult GetMessages(int id, QueryOptions opts) {
            var messagesOut = new List<MessageOutModel>();
            var conversation = GetConversation(id);
            var messages = ConversationService.GetMessages(id, opts);
            foreach (var m in messages) {
                var seenBy = GetSeenBy(m, messages, conversation.Members);
                var messageOut = GetMessageOut(m, seenBy);
                messagesOut.Add(messageOut);
            }
            messagesOut.Reverse();

            return Ok(new ScrollableList<MessageOutModel>(messagesOut, null, null, null, Request.RequestUri));
        }

        /// <summary>
        /// Creates a new message in the specified conversation.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="model"></param>
        /// <returns></returns>
        [HttpPost]
        [ResponseType(typeof(Message))]
        [Route("conversations/{id:int}/messages")]
        public IHttpActionResult InsertMessage(int id, MessageInModel model) {
            var conversation = GetConversation(id);
            return Ok(MessageService.Insert(new Message { Text = model.Text, }, conversation));
        }

        /// <summary>
        /// Called by current user to indicate that they are typing in a conversation.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <returns></returns>
        [HttpPost]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/typing")]
        public IHttpActionResult StartTyping(int id) {
            if (ConfigurationService.Typing) {
                // push typing event to other conversation members
                var conversation = GetConversation(id);
                PushService.PushToUsers(PushService.EVENT_TYPING, new { Conversation = id, User = WeavyContext.Current.User, Name = WeavyContext.Current.User.Profile.Name ?? WeavyContext.Current.User.Username }, conversation.MemberIds.Where(x => x != WeavyContext.Current.User.Id));
                return Ok(conversation);
            }
            return BadRequest();
        }

        /// <summary>
        /// Add members to the conversation.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="users">Ids of users to add.</param>
        /// <returns>200 OK</returns>
        [HttpPost]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/members")]
        public IHttpActionResult AddMembers(int id, [FromBody]int[] users) {
            foreach (var userId in users) {
                ConversationService.AddMember(id, userId);
            }
            return Ok(GetConversation(id));
        }

        /// <summary>
        /// Remove members from the conversation.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="user">Id of member to remove from conversation.</param>
        /// <returns>200 OK</returns>
        [HttpDelete]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/members/{user:int}")]
        public IHttpActionResult RemoveMember(int id, int user) {
            ConversationService.RemoveMember(id, user);
            return Ok(GetConversation(id));
        }

        /// <summary>
        /// Set the room name.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="model">Room name, or <c>null</c> to remove existing name.</param>
        /// <returns>The updated conversation.</returns>
        [HttpPut]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/name")]
        public IHttpActionResult SetName(int id, NameInModel model) {
            var conversation = GetConversation(id);
            if (conversation == null || !conversation.IsRoom) {
                ThrowResponseException(HttpStatusCode.NotFound, "Conversation " + id + " not found.");
            }
            if (model.Name.IsNullOrWhiteSpace()) {
                model.Name = null;
            }
            conversation.Name = model.Name;
            conversation = ConversationService.Update(conversation);

            // HACK: set Name to GetTitle() so that returned json has conversation title in the name property
            conversation.Name = conversation.GetTitle();
            return Ok(conversation);
        }

        /// <summary>
        /// Called by current user to indicate that they are no longer typing.
        /// </summary>
        /// <param name="id"></param>
        /// <returns>The conversation.</returns>
        [HttpDelete]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/typing")]
        public IHttpActionResult StopTyping(int id) {
            var conversation = GetConversation(id);
            // push typing event to other conversation members
            PushService.PushToUsers("typing-stopped.weavy", new { Conversation = id, User = WeavyContext.Current.User, Name = WeavyContext.Current.User.Profile.Name ?? WeavyContext.Current.User.Username }, conversation.MemberIds.Where(x => x != WeavyContext.Current.User.Id));
            return Ok(conversation);
        }

        /// <summary>
        /// Marks a conversation as read for the current user.
        /// </summary>
        /// <param name="id">Id of the conversation to mark as read.</param>
        /// <returns>The read conversation.</returns>
        [HttpPost]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/read")]
        public IHttpActionResult Read(int id) {
            ConversationService.SetRead(id, readAt: DateTime.UtcNow);
            return Ok(ConversationService.Get(id));
        }

        /// <summary>
        /// Mark specified conversation as unread.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        /// <returns>200 OK</returns>
        [HttpPost]
        [ResponseType(typeof(Conversation))]
        [Route("conversations/{id:int}/unread")]
        public IHttpActionResult SetUnread(int id) {
            ConversationService.SetRead(id, null);
            return Ok(ConversationService.Get(id));
        }

        /// <summary>
        /// Get the number of unread conversations.
        /// </summary>
        /// <returns>The number of unread conversations.</returns>
        [HttpGet]
        [ResponseType(typeof(int))]
        [Route("conversations/unread")]
        public IHttpActionResult GetUnread() {
            return Ok(ConversationService.GetUnread().Count());
        }

        /// <summary>
        /// Pins the conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        /// <returns>200 OK</returns>
        [HttpPost]
        [Route("conversations/{id:int}/pin")]
        public IHttpActionResult Pin(int id) {
            ConversationService.SetPinned(id, DateTime.UtcNow);
            return Ok();
        }

        /// <summary>
        /// Unpins the conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        /// <returns>200 OK</returns>
        [HttpPost]
        [Route("conversations/{id:int}/unpin")]
        public IHttpActionResult UnPin(int id) {
            ConversationService.SetPinned(id, null);
            return Ok();
        }

        /// <summary>
        /// Stars the conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        /// <returns>200 OK</returns>
        [HttpPost]
        [Route("conversations/{id:int}/star")]
        public IHttpActionResult Star(int id) {
            var conversation = GetConversation(id);
            EntityService.Star(conversation);
            return Ok();
        }

        /// <summary>
        /// Unstars the conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        /// <returns>200 OK</returns>
        [HttpPost]
        [Route("conversations/{id:int}/unstar")]
        public IHttpActionResult UnStar(int id) {
            var conversation = GetConversation(id);
            EntityService.Unstar(conversation);
            return Ok();
        }

        /// <summary>
        /// Returns the user settings.
        /// </summary>
        /// <returns>The user settings.</returns>
        [HttpGet]
        [ResponseType(typeof(SettingsModel))]
        [Route("conversations/settings")]        
        public IHttpActionResult GetSettings() {
            var settings = new SettingsModel {
                EnterToSend = User.Profile.Value<bool?>(UserUtils.EnterToSendKey) ?? false,
                AvatarId = User.Avatar?.Id,
                ThumbnailUrl = User.AvatarUrl(size: 128),
                TimeZones = TimeZoneInfo.GetSystemTimeZones().Select(x => new { Label = x.DisplayName, Value = x.Id }) 
            };

            if (User.Profile.Value<string>(UserUtils.TimeZoneKey) != null) {
                var tz = TimeZoneInfo.GetSystemTimeZones().FirstOrDefault(x => x.Id == User.Profile.Value<string>(UserUtils.TimeZoneKey));
                if (tz != null) {
                    settings.TimeZone = new { Label = tz.DisplayName, Value = tz.Id };
                }                
            }          
            return Ok(settings);
        }

        /// <summary>
        /// Saves the settings.
        /// </summary>
        /// <returns>The updated settings.</returns>
        [HttpPost]
        [ResponseType(typeof(SettingsModel))]
        [Route("conversations/settings")]
        public IHttpActionResult SaveSettings(SettingsModel settings) {
            User.Profile[UserUtils.TimeZoneKey] = settings.TimeZone;
            User.Profile[UserUtils.EnterToSendKey] = settings.EnterToSend;

            if (settings.AvatarId == null) {
                User.Avatar = null;
            } else if (settings.AvatarId.Value != User.Avatar?.Id) {
                var blob = BlobService.Get(settings.AvatarId.Value);

                if (blob != null) {
                    User.Avatar = blob;
                }
            }          
            UserService.Update(User);
            return Ok(settings);
        }

        /// <summary>
        /// Gets a conversation by its id. Throws a 404 http error if the conversation is not found.
        /// </summary>
        /// <param name="id"></param>
        private Conversation GetConversation(int id) {
            var conversation = ConversationService.Get(id);
            if (conversation == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "Conversation with id " + id + " not found");
            }
            return conversation;
        }

        /// <summary>
        /// Returns a <see cref="ConversationOutModel"/> object from a <see cref="Conversation"/>.
        /// </summary>
        /// <param name="conversation"></param>
        /// <returns></returns>
        private ConversationOutModel GetConversationOut(Conversation conversation) {
            var conversationOut = new ConversationOutModel() {
                Id = conversation.Id,
                AvatarUrl = conversation.AvatarUrl(48),
                Title = conversation.GetTitle(),
                IsPinned = conversation.IsPinned,
                IsStarred = conversation.IsStarred(),
                IsRead = conversation.IsRead,
                IsRoom = conversation.IsRoom,
                Excerpt = (conversation.LastMessage?.CreatedById == User.Id ? T["You:"] + " " : "") + conversation.GetExcerpt(true)
            };

            if (!conversation.IsRoom) {
                conversationOut.Presence = conversation.Members.FirstOrDefault(x => x.Id != User.Id)?.Presence;
            }

            if (conversation.LastMessage != null) {
                var local = conversation.LastMessage.CreatedAt.ToLocal();
                string formatted = conversation.LastMessage.CreatedAt.When();
                conversationOut.LastMessageAt = local;
                conversationOut.LastMessageAtString = formatted;
            }
            return conversationOut;
        }

        /// <summary>
        /// Returns a <see cref="MessageOutModel"/> object from a <see cref="Message"/>.
        /// </summary>
        /// <param name="message"></param>
        /// <param name="seenBy"></param>
        /// <returns></returns>
        private MessageOutModel GetMessageOut(Message message, IEnumerable<ConversationMember> seenBy) {
            return new MessageOutModel {
                Id = message.Id,
                CreatedAt = message.CreatedAt,
                CreatedById = message.CreatedBy().Id,
                CreatedByName = message.CreatedBy().Profile.Name,
                CreatedByThumb = message.CreatedBy().ThumbPlaceholderUrl(),
                Attachments = message.Attachments(),
                Html = message.Html.ToAbsoluteUrls(),
                SeenBy = seenBy
            };
        }

        /// <summary>
        /// Helper for displaying seen by indicator.
        /// </summary>
        /// <param name="message">The message for which to get seen by indicator.</param>
        /// <param name="messages">The messages in the conversation.</param>
        /// <param name="members">The members in the conversation.</param>
        /// <returns></returns>
        private IEnumerable<ConversationMember> GetSeenBy(Message message, IEnumerable<Message> messages, IEnumerable<ConversationMember> members) {

            // get messages created after timmestamp
            var after = messages.Where(x => x.CreatedAt > message.CreatedAt);

            // get other members
            var others = members.Where(x => x.Id != WeavyContext.Current.User.Id);

            //  return member if message is read by member and there are no later messages read by or created by member
            foreach (ConversationMember m in others) {
                if (m.ReadAt >= message.CreatedAt && !after.Any(x => m.ReadAt >= x.CreatedAt || m.Id == x.CreatedById)) {
                    yield return m;
                }
            }
        }
    }
}

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Mvc;
using System.Web.Routing;
using System.Web.SessionState;
using NLog;
using Weavy.Areas.Apps.Models;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Web.Controllers;
using Weavy.Web.Models;
using Weavy.Web.Utils;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Messenger"/> application.
    /// </summary>
    [SessionState(SessionStateBehavior.Disabled)] // NOTE: disable session to support multiple concurrent ajax requests from the same user
    public class MessengerController : AppController<Messenger> {

        private static readonly Logger _log = LogManager.GetCurrentClassLogger();
        private static readonly ConcurrentDictionary<int, HashSet<int>> _deliveredQueue = new ConcurrentDictionary<int, HashSet<int>>(); // conversationid -> userids
        private static Timer _deliveredTimer = new Timer(ProcessDelivered, null, 5000, 5000);

        // url prefix for embedded
        private static string E_PREFIX = ControllerUtils.EMBEDDED_PREFIX.RightAfter(ControllerUtils.ROOT_PREFIX);

        /// <summary>
        /// Url prefix for messenger
        /// </summary>
        public const string MESSENGER_PREFIX = "messenger";

        // limit page size to 25 for messenger
        private const int MAX_PAGE_SIZE = 25;

        /// <summary>
        /// Display the messenger app.
        /// </summary>
        /// <param name="app">The <see cref="Messenger"/> app.</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>
        public override ActionResult Get(Messenger app, Query query) {
            return IsEmbedded ? Index(query) : View(app);
        }

        /// <summary>
        /// Display fullscreen layout with conversation list and conversation.
        /// </summary>
        /// <param name="opts"></param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX)]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX, Name = nameof(MessengerController) + nameof(Index), Order = 1)]
        public ActionResult Index(QueryOptions opts) {
            return Messenger(null, opts);
        }

        /// <summary>
        /// Display fullscreen layout with conversation list and conversation.
        /// </summary>
        /// <param name="id">Id of selected conversation (if any).</param>
        /// <param name="opts"></param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/{id:int}")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/{id:int}", Name = nameof(MessengerController) + nameof(Messenger), Order = 1)]
        public ActionResult Messenger(int? id, QueryOptions opts) {

            // limit page size to 25
            opts.Top = Math.Min(opts.Top ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);

            var model = new Messenger { ConversationId = id, IsMessenger = true };

            if (model.ConversationId != null) {
                // get selected conversation
                model.Conversation = ConversationService.Get(model.ConversationId.Value);
                if (model.Conversation == null) {
                    ThrowResponseException(HttpStatusCode.NotFound, $"Conversation with id {model.ConversationId.Value} not found");
                }
            } else {
                // get most recent conversation
                model.Conversation = ConversationService.Search(new ConversationQuery { OrderBy = "PinnedAt DESC, LastMessageAt DESC", Top = 1 }).FirstOrDefault();
            }

            if (model.Conversation != null) {
                if (model.ConversationId != null) {
                    // mark conversation as read (if needed)
                    if (model.Conversation.ReadAt == null) {
                        model.Conversation = ConversationService.SetRead(model.Conversation.Id, DateTime.UtcNow);
                    } else if (model.Conversation.ReadAt < model.Conversation.LastMessage?.CreatedAt) {
                        // NOTE: do not assign the read conversation to model.Conversation since that will prevent rendering of the "New messages" separator
                        ConversationService.SetRead(model.Conversation.Id, DateTime.UtcNow);
                    }
                }

                // get first page of messages (and reverse them for easier rendering in correct order)
                model.Messages = ConversationService.GetMessages(model.Conversation.Id, new QueryOptions { Top = MAX_PAGE_SIZE });
                model.Messages.Reverse();
            }

            // Meetings
            model.ZoomEnabled = ConfigurationService.ZoomMeetings;
            model.TeamsEnabled = ConfigurationService.TeamsMeetings;

            // NOTE: we load conversations last so that selected conversation does not appear unread in the list
            var query = new ConversationQuery(opts);
            query.UserId = User.Id;
            query.OrderBy = "PinnedAt DESC, LastMessageAt DESC";
            model.Conversations = ConversationService.Search(query);

            // make sure selected conversation is visible in conversations list
            while (model.Conversation != null && !model.Conversations.Any(x => x.Id == model.Conversation.Id)) {
                query.Top += PageSizes.First();
                model.Conversations = ConversationService.Search(query);
            }

            return View(nameof(Messenger), model);
        }

        /// <summary>
        /// Create new conversation then redirect back to messenger with new conversation selected.
        /// </summary>
        /// <param name="users">Id of users to add as members.</param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX)]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX, Name = nameof(MessengerController) + nameof(InsertMessengerConversation), Order = 1)]
        public ActionResult InsertMessengerConversation(IEnumerable<int> users) {
            var conversation = ConversationService.Insert(new Conversation(), users);
            return RedirectToAction<MessengerController>(c => c.Messenger(conversation.Id, null));
        }

        /// <summary>
        /// Post new message into specified conversation then redirect back to full messenger.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="message"></param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/{id:int}")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/{id:int}", Name = nameof(MessengerController) + nameof(InsertMessengerMessage), Order = 1)]
        public ActionResult InsertMessengerMessage(int id, MessageIn message) {
            var msg = CreateMessage(id, message);
            return RedirectToAction<MessengerController>(c => c.Messenger(id, null));
        }

        /// <summary>
        /// Display specified conversation only (without conversation list).
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/conversations/{id:int}")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/conversations/{id:int}", Name = nameof(MessengerController) + nameof(Conversation), Order = 1)]
        public ActionResult Conversation(int id) {
            var model = new Messenger { IsMessenger = false };

            // get conversation
            model.Conversation = ConversationService.Get(id);
            if (model.Conversation == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Conversation with id {id} not found");
            }

            // mark conversation as read (if needed)
            if (model.Conversation.ReadAt == null) {
                model.Conversation = ConversationService.SetRead(id, DateTime.UtcNow);
            } else if (model.Conversation.LastMessage != null && model.Conversation.ReadAt < model.Conversation.LastMessage.CreatedAt) {
                // NOTE: do not assign the read conversation to model.Conversation since that will prevent rendering of the "New messages" separator
                ConversationService.SetRead(model.Conversation.Id, DateTime.UtcNow);
            }

            // get first page of messages (and reverse them for easier rendering in correct order)
            model.Messages = ConversationService.GetMessages(id, new QueryOptions { Top = MAX_PAGE_SIZE });
            model.Messages.Reverse();

            return View(model);
        }

        /// <summary>
        /// Display list of conversations.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/conversations")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/conversations", Name = nameof(MessengerController) + nameof(Conversations), Order = 1)]
        public ActionResult Conversations(Query query) {

            // limit page size to 25
            query.Top = Math.Min(query.Top ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);

            var cq = new ConversationQuery(query);
            cq.UserId = User.Id;
            cq.OrderBy = "PinnedAt DESC, LastMessageAt DESC";

            var model = new Messenger();
            model.IsMessenger = false;
            model.Conversations = ConversationService.Search(cq);

            // search or infinite scroll, return partial view
            if (Request.IsAjaxRequest()) {
                model.IsMessenger = IsMessenger(Request.Headers["Referer"]);
                return PartialView("_Conversations", model);
            }

            return View(model);
        }

        /// <summary>
        /// Update settings.
        /// </summary>
        /// <param name="model"></param>
        /// <returns>The updated user.</returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/settings")]
        public JsonResult UpdateSettings(MessengerSettings model) {
            // merge in settings
            User.MergeSettings(new Dictionary<string, object> {
                { UserUtils.EnterToSendKey, model.EnterToSend},
                { UserUtils.DesktopNotificationsKey , model.DesktopNotifications},
                { UserUtils.EmailNotificationsKey,  model.EmailNotifications},
                { UserUtils.MobileNotificationsKey, model.MobileNotifications},
                { UserUtils.TimeZoneKey , model.Timezone }
            });
            var user = UserService.Update(User);
            return Json(new MessengerSettings(user));
        }

        /// <summary>
        /// Create new conversation. 
        /// </summary>
        /// <param name="users">Id of users to add as members.</param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/conversations")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/conversations", Name = nameof(MessengerController) + nameof(InsertConversation), Order = 1)]
        public ActionResult InsertConversation(IEnumerable<int> users) {
            var conversation = ConversationService.Insert(new Conversation(), users);
            return RedirectToAction<MessengerController>(c => c.Conversation(conversation.Id));
        }

        /// <summary>
        /// Post new message into specified conversation.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="message"></param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/conversations/{id:int}")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/conversations/{id:int}", Name = nameof(MessengerController) + nameof(InsertMessage), Order = 1)]
        public ActionResult InsertMessage(int id, MessageIn message) {
            var msg = CreateMessage(id, message);
            return RedirectToAction<MessengerController>(c => c.Conversation(id));
        }

        /// <summary>
        /// Returns partial html for the specified message.
        /// </summary>
        /// <param name="id">Id of message.</param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/m/{id:int}")]
        public PartialViewResult PartialMessage(int id) {
            var model = MessageService.Get(id);
            ViewBag.Messenger = new Messenger { Conversation = model.Conversation, IsMessenger = IsMessenger(Request.Headers["Referer"]) };
            return PartialView("_Message", model);
        }

        /// <summary>
        /// Returns partial html for the specified conversation.
        /// </summary>
        /// <param name="id">Id of message.</param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}")]
        public PartialViewResult PartialConversation(int id) {
            var model = ConversationService.Get(id);
            ViewBag.Messenger = new Messenger { Conversation = model, IsMessenger = IsMessenger(Request.Headers["Referer"]) };
            return PartialView("_Conversation", model);
        }

        /// <summary>
        /// Returns partial html for the info modal.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/info")]
        public PartialViewResult PartialInfo(int id) {
            var model = ConversationService.Get(id);
            return PartialView("_InfoModal", model);
        }

        /// <summary>
        /// Returns partial html for messages in the specified conversation.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="opts"></param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/messages")]
        public PartialViewResult PartialMessages(int id, QueryOptions opts) {

            // limit page size to 25
            opts.Top = Math.Min(opts.Top ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);

            var model = new Messenger();
            model.Conversation = ConversationService.Get(id);
            model.Messages = ConversationService.GetMessages(model.Conversation.Id, opts);
            model.Messages.Reverse();
            model.IsMessenger = IsMessenger(Request.Headers["Referer"]);
            return PartialView("_Messages", model);
        }

        /// <summary>
        ///  Returns partial html for the profile modal
        /// </summary>
        /// <param name="id">Id of user.</param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/people/{id:int}")]
        public PartialViewResult PartialUser(int id) {
            var model = UserService.Get(id);
            return PartialView("_User", model);
        }

        /// <summary>
        /// Returns partial html for the specified meeting.
        /// </summary>
        /// <param name="provider">A string defining the video provider.</param>
        /// <param name="id">The conversation id.</param>
        /// <returns></returns>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/meeting")]
        public PartialViewResult PartialMeeting(string provider, int id) {

            var model = new PartialMeetingModel {
                Topic = $"{provider.ToTitleCase()} meeting",
                Meeting = MeetingService.CreateMeeting(provider),
                //ConversationId = id
            };
                        
            return PartialView($"_Meeting{provider}", model);
        }

        /// <summary>
        /// Star specified conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/star")]
        public HttpStatusCodeResult Star(int id) {
            var conversation = ConversationService.Get(id);
            EntityService.Star(conversation);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Unstar specified conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/unstar")]
        public HttpStatusCodeResult Unstar(int id) {
            var conversation = ConversationService.Get(id);
            EntityService.Unstar(conversation);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Pin specified conversation (to top of conversations list).
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/pin")]
        public HttpStatusCodeResult Pin(int id) {
            ConversationService.SetPinned(id, DateTime.UtcNow);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Unpin specified conversation (from top of conversations list).
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/unpin")]
        public HttpStatusCodeResult Unpin(int id) {
            ConversationService.SetPinned(id, null);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Set DeliveredAt for the specified conversation.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/delivered")]
        public HttpStatusCodeResult SetDelivered(int id) {
            // this method gets called via AJAX when the client is notified about a new message over the realtime connection,
            // since there could potentially be a lot of active connections we need to throttle these requests
            // to prevent hammering the db with multiple simultaneous requests and risk getting "The request limit for the database is 60 and has been reached"
            //ConversationService.SetDelivered(id, DateTime.UtcNow);
            var userids = _deliveredQueue.GetOrAdd(id, (key) => new HashSet<int>());
            lock (userids) {
                userids.Add(User.Id);
            }

            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Mark specified conversation as read.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/read")]
        public HttpStatusCodeResult SetRead(int id) {
            ConversationService.SetRead(id, DateTime.UtcNow);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Mark specified conversation as unread.
        /// </summary>
        /// <param name="id">Conversation id.</param>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/unread")]
        public HttpStatusCodeResult SetUnread(int id) {
            ConversationService.SetRead(id, null);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Set room name.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="name">Room name, or <c>null</c> to remove existing name.</param>
        /// <returns></returns>
        [HttpPut]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/name")]
        public ActionResult SetName(int id, string name) {
            var conversation = ConversationService.Get(id);
            if (conversation == null || !conversation.IsRoom) {
                ThrowResponseException(HttpStatusCode.NotFound, "Conversation " + id + " not found.");
            }
            if (name.IsNullOrWhiteSpace()) {
                name = null;
            }
            conversation.Name = name;
            conversation = ConversationService.Update(conversation);

            // HACK: set Name to GetTitle() so that returned json has conversation title in the name property
            conversation.Name = conversation.GetTitle();

            return Content(conversation.SerializeToJson(), "application/json");
        }

        /// <summary>
        /// Set room avatar.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="blobId">Id of blob to use as avatar, or <c>null</c> to remove existing avatar.</param>
        /// <returns></returns>
        [HttpPut]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/avatar")]
        public HttpStatusCodeResult SetAvatar(int id, int? blobId) {
            var conversation = ConversationService.Get(id);
            if (conversation == null || !conversation.IsRoom) {
                ThrowResponseException(HttpStatusCode.NotFound, "Conversation " + id + " not found.");
            }

            if (blobId != null) {
                var blob = BlobService.Get(blobId.Value);
                conversation.Avatar = blob;
            } else {
                conversation.Avatar = null;
            }
            ConversationService.Update(conversation);

            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Add conversation members.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="users">Ids of users to add.</param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/members")]
        public HttpStatusCodeResult AddMembers(int id, IEnumerable<int> users) {
            foreach (var userId in users) {
                ConversationService.AddMember(id, userId);
            }
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Remove conversation member.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <param name="user">Id of member to remove from conversation.</param>
        /// <returns></returns>
        [HttpDelete]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/members")]
        public HttpStatusCodeResult RemoveMember(int id, int user) {
            ConversationService.RemoveMember(id, user);
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Leave conversation.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/leave")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/leave", Name = nameof(MessengerController) + nameof(Leave), Order = 1)]
        public ActionResult Leave(int id) {
            ConversationService.RemoveMember(id);
            if (IsMessenger(Request.Headers["Referer"])) {
                return RedirectToAction<MessengerController>(c => c.Index(null));
            } else {
                return RedirectToAction<MessengerController>(c => c.Conversations(null));
            }
        }

        /// <summary>
        /// Called by current user to indicate that they are typing in a conversation.
        /// </summary>
        /// <param name="id">Id of conversation.</param>
        /// <returns></returns>
        [HttpPost]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/c/{id:int}/typing")]
        public HttpStatusCodeResult Typing(int id) {
            var conversation = ConversationService.Get(id);
            // push typing event to other conversation members
            PushService.PushToUsers(PushService.EVENT_TYPING, new TypingModel { Conversation = id, User = WeavyContext.Current.User }, conversation.MemberIds.Where(x => x != WeavyContext.Current.User.Id));
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Returns partial html for the new message and add people modal.
        /// </summary>
        /// <param name="query"></param>
        /// <param name="users">Id of users that are already selected</param>
        [HttpGet]
        [Route(ControllerUtils.ROOT_PREFIX + MESSENGER_PREFIX + "/people")]
        public PartialViewResult PartialPeople(UserQuery query, IEnumerable<int> users) {
            UserSearchResult model = null;

            // get selected users
            ViewBag.Selected = new List<User>();
            if (users != null && users.Any()) {
                ViewBag.Selected = UserService.Get(users);
            }

            // no search criteria, try to fetch most recently contacted people instead
            if (query.Text.IsNullOrEmpty()) {
                var conversations = ConversationService.Search(new ConversationQuery { UserId = User.Id, SearchRooms = false, OrderBy = "LastMessageAt DESC", Top = 10 });
                List<int> ids = new List<int>();
                foreach (var c in conversations) {
                    ids.Add(c.MemberIds.FirstOrDefault(x => x != User.Id));
                }
                var recent = UserService.Get(ids).Where(x => !x.IsSuspended && !x.IsTrashed());
                if (recent.Any()) {
                    model = new UserSearchResult(new UserQuery(), recent, recent.Count());
                }
            }

            // perform normal search
            if (model == null) {
                query.Suspended = false;
                query.Trashed = false;
                query.OrderBy = "Name";
                query.Count = true;
                query.Top = 10;
                model = UserService.Search(query);
            }

            return PartialView("_People", model);
        }

        /// <summary>
        /// Helper method for inserting message into specified conversation.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="message"></param>
        /// <returns></returns>
        private Message CreateMessage(int id, MessageIn message) {
            Message msg = null;

            var conversation = ConversationService.Get(id);
            if (conversation == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "Conversation with id " + id + " not found");
            }

            // create and insert new message
            try {
                msg = MessageService.Insert(new Message { Text = message.Text }, conversation, blobs: message.Blobs, embeds: message.Embeds, meetings: message.Meetings);
            } catch (Exception ex) {
                // TODO: handle some way?
                _log.Warn(ex.Message);
            }

            return msg;
        }
       
        // helper method that checks if the specified url is for the full messenger or not.
        private bool IsMessenger(string referer) {
            // /m, /m/id, /e/m or /e/m/id
            var pattern = @"^/(" + E_PREFIX + ")?" + MESSENGER_PREFIX + @"(/\d+)?/?$";
            var url = referer?.RemoveLeading(WeavyContext.Current.ApplicationUrl.RemoveTrailing("/")) ?? "";
            return Regex.IsMatch(url.LeftBefore("?"), pattern, RegexOptions.IgnoreCase);
        }
        
        // callback for processing the queue with SetDelivered updates
        private static void ProcessDelivered(object state) {
            try {
                foreach (var entry in _deliveredQueue) {
                    int conversationId = entry.Key;
                    var userIds = entry.Value;
                    lock (userIds) {
                        foreach (var userId in userIds) {
                            ConversationService.SetDelivered(conversationId, DateTime.UtcNow, userId);
                        }
                        userIds.Clear();
                    }
                }
            } catch (Exception ex) {
                _log.Warn(ex.Message);
            }
        }

    }
}

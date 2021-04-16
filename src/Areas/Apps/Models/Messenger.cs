using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using Weavy.Core;
using Weavy.Core.Collections;
using Weavy.Core.Models;
using Weavy.Core.Utils;

namespace Weavy.Areas.Apps.Models {

    /// <summary>
    /// App for private messaging between people.
    /// </summary>
    [Serializable]
    [Guid("42BD69CB-523E-415D-9794-1E53415A3E30")]
    [App(Icon = "message", Name = "Messenger", Description = "App for private messaging between people.", AllowMultiple = false, IsSystem = true)]
    public class Messenger : App {

        private Lazy<User> _other = null;

        /// <summary>
        /// Initializes a new instance of the <see cref="Messenger"/> app.
        /// </summary>
        public Messenger() {
        }

        /// <summary>
        /// A list of all active conversations.
        /// </summary>
        public ConversationSearchResult Conversations { get; set; } = new ConversationSearchResult();

        /// <summary>
        /// Id of the selected conversation.
        /// </summary>
        public int? ConversationId { get; set; }

        /// <summary>
        /// The active conversation.
        /// </summary>
        public Conversation Conversation { get; set; }

        /// <summary>
        /// A list of messages in the active conversation.
        /// </summary>
        public PagedList<Message> Messages { get; set; } = new PagedList<Message>(null, 0, 0, 0);

        /// <summary>
        /// Gets the other person in a one-to-one conversation.
        /// </summary>
        public User Other {
            get {
                if (_other == null) {
                    _other = new Lazy<User>(() => {
                        if (Conversation == null || Conversation.IsRoom) {
                            return null;
                        } else {
                            return Conversation.Members.FirstOrDefault(x => x.Id != WeavyContext.Current.User.Id) ?? Conversation.Members.FirstOrDefault();
                        }
                    });
                }
                return _other.Value;
            }
        }

        /// <summary>
        /// Gets or sets the user settings for the current user.
        /// </summary>
        public MessengerSettings Settings { get; set; } = new MessengerSettings(WeavyContext.Current.User);

        /// <summary>
        /// Gets the number of unread conversations.
        /// </summary>
        public int Unread => Conversations?.Count(x => !x.IsRead) ?? 0;

        /// <summary>
        /// Gets or sets a value indicating of we should render full messenger or not.
        /// </summary>
        public bool IsMessenger {
            get {
                // NOTE: for now, only supported mode is full messenger
                return true;
            }
        }
        
        /// <summary>
        /// If Zoom meetings are enabled in app settings
        /// </summary>
        public bool ZoomEnabled { get; internal set; }

        /// <summary>
        /// If Microsoft Teams meetings are enabled in app settings
        /// </summary>
        public bool TeamsEnabled { get; internal set; }

        /// <summary>
        /// Helper for displaying seen by indicator.
        /// </summary>
        /// <param name="message">The message for which to get seen by indicator.</param>
        /// <returns></returns>
        public IEnumerable<ConversationMember> GetSeenBy(Message message) {

            // get messages created after timmestamp
            var after = Messages.Where(x => x.CreatedAt > message.CreatedAt);

            // get other members
            var others = Conversation.Members.Where(x => x.Id != WeavyContext.Current.User.Id);

            //  return member if message is read by member and there are no later messages read by or created by member
            foreach (ConversationMember m in others) {
                if (m.ReadAt >= message.CreatedAt && !after.Any(x => m.ReadAt >= x.CreatedAt || m.Id == x.CreatedById)) {
                    yield return m;
                }
            }
        }

    }

    /// <summary>
    /// View model for user settings in messenger.
    /// </summary>
    public class MessengerSettings {

        /// <summary>
        /// Default constructor.
        /// </summary>
        public MessengerSettings() {
        }

        /// <summary>
        /// Get properties from user object.
        /// </summary>
        public MessengerSettings(User user) {
            var settings = user.GetSettings();
            EnterToSend = settings.EnterToSend;
            DesktopNotifications = settings.DesktopNotifications;
            EmailNotifications = settings.EmailNotifications;
            MobileNotifications = settings.MobileNotifications;
            Timezone = settings.TimeZone;
        }

        /// <summary>
        /// Gets or sets a value indicating whether Enter should send a message or insert a new line.
        /// </summary>
        [Display(Name = "Enter to send", Description = "Shift+Enter (new line)", GroupName = "Message")]
        public bool EnterToSend { get; set; }

        /// <summary>
        /// True if desktop notifications is active.
        /// </summary>
        [Display(Name = "Desktop notifications", Description = "Display notifications on your desktop.", GroupName = "Notifications")]
        public bool DesktopNotifications { get; set; }

        /// <summary>
        /// True if the user wants email notifications.
        /// </summary>
        [Display(Name = "Email notifications", Description = "Get email notifications when you're away so you don't miss a beat.", GroupName = "Notifications")]
        public bool EmailNotifications { get; set; }

        /// <summary>
        /// True if we should push messages to mobile app.
        /// </summary>
        [Display(Name = "Mobile notifications", Description = "Get notifications on your mobile device.", GroupName = "Notifications")]
        public bool MobileNotifications { get; set; }

        /// <summary>
        /// The users timezone.
        /// </summary>
        [Display(Name = "Time zone", Description = "Your current time zone.", GroupName = "Time")]
        [UIHint("TimeZone")]
        public string Timezone { get; set; }

    }

    
}

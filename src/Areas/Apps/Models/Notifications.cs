using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using Weavy.Core.Attributes;
using Weavy.Core.Models;

namespace Weavy.Areas.Apps.Models {
    
    /// <summary>
    /// App for embedding notifications in a space.
    /// </summary>
    [Serializable]
    [Guid("F667C9EE-B1F1-49E6-B32F-8A363F5CDB96")]
    [App(Icon = "bell", Name = "Notifications", Description = "App for embedding notifications in a space.", AllowMultiple = false, IsSystem = true)]
    public class Notifications : App {

        /// <summary>
        /// Gets or sets the unread notifcations.
        /// </summary>
        public IList<Notification> UnreadNotifications { get; set; }

        /// <summary>
        /// Gets or sets the read notifcations.
        /// </summary>
        public IList<Notification> ReadNotifications { get; set; }

        /// <summary>
        /// Gets or sets the parent item to get notifications for.
        /// </summary>
        public IEntity Parent { get; set; }

    }
}

using System;
using System.Runtime.InteropServices;
using Weavy.Core;
using Weavy.Core.Models;

namespace Weavy.Areas.Apps.Models {
    /// <summary>
    /// An task management app.
    /// </summary>
    [Serializable]
    [Guid("F1C835B0-E2A7-4CF3-8900-FE95B6504145")]
    [App(Icon = "checkbox-marked-outline", Name = "Tasks", Description = "A task management app.", AllowMultiple = true, Children = new Type[] { typeof(TaskItem) }, AllowChildrenWithSameName = true)]
    public class Tasks : App {

        /// <summary>
        /// Gets or sets the tasks to display in the task list.
        /// </summary>
        public ContentSearchResult<TaskItem> Result { get; set; }

        /// <summary>
        /// Gets a value indicating whether completed tasks hould be hidden or not.
        /// </summary>
        public bool HideCompleted => WeavyContext.Current.User.Profile[$"tasklist_{Id}_hidden"] as bool? ?? false;
    }

}

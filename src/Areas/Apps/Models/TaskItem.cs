using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Weavy.Core.Models;
using Weavy.Core.Services;

namespace Weavy.Areas.Apps.Models {
    /// <summary>
    /// A content type representing a task in the <see cref="Tasks"/> app.
    /// </summary>
    [Serializable]
    [Guid("F16EFF39-3BD7-4FB6-8DBF-F8FE88BBF3EB")]
    [Content(Icon = "checkbox-marked-outline", Name = "Task", SingularName = "a task", PluralName = "Tasks", Description = "A task in the tasks app.", Parents = new Type[] { typeof(Tasks) })]
    public class TaskItem : Content, ICommentable, IStarrable, ISortable, IHasAttachments {


        [NonSerialized]
        private Lazy<User> _assignedTo = null;

        /// <summary>
        /// 
        /// </summary>
        public TaskItem() {
            StarredByIds = new List<int>();
            CommentIds = new List<int>();
            AttachmentIds = new List<int>();
        }

        /// <summary>
        ///  Gets or sets the task text.
        /// </summary>
        [Display(Name="Text", Order = 10)]
        public override string Name { get; set; }

        /// <summary>
        /// Gets or sets additional notes.
        /// </summary>
        [DataType(DataType.MultilineText)]
        [Display(Name = "Description")]
        public string Description { get; set; }

        /// <summary>
        /// The due date of the task
        /// </summary>
        [DataType(DataType.Date)]
        [Display(Name = "Due date")]
        public DateTime? DueDate { get; set; }

        /// <summary>
        /// The id of the user that the task is assigned to
        /// </summary>        
        [Display(Name = "Assigned to")]
        public int? AssignedTo { get; set; }

        /// <summary>
        /// If the task is completed or not.
        /// </summary>
        public bool Completed { get; set; }

        /// <summary>
        /// The sort order of the task
        /// </summary>
        public long? SortOrder { get; set; }

        /// <summary>
        /// If the task i starred or not
        /// </summary>
        public bool IsStarred => this.IsStarred();

        /// <summary>
        /// Gets the ids of all comments.
        /// </summary>       
        public IEnumerable<int> CommentIds { get; set; }

        /// <summary>
        /// Gets the ids of all that starred this task
        /// </summary>
        public IEnumerable<int> StarredByIds { get; set; }

        /// <summary>
        /// Gets the ids of all files attached to the <see cref="TaskItem"/>.
        /// </summary>
        public IEnumerable<int> AttachmentIds { get; set; }

        /// <summary>
        /// A lazy property returning the user object of the assigned user
        /// </summary>        
        public User AssignedToUser {
            get {
                if (_assignedTo == null) {
                    _assignedTo = new Lazy<User>(() => {
                        if (!AssignedTo.HasValue) {
                            return null;
                        }
                        return UserService.Get(AssignedTo.Value);
                    });
                }
                return _assignedTo.Value;
            }
        }
        
      
        
    }

}

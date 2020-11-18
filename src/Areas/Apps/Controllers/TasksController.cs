using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web.Mvc;
using Weavy.Areas.Apps.Models;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Web.Controllers;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Tasks"/> app.
    /// </summary>
    [RoutePrefix("{id:int}/F1C835B0-E2A7-4CF3-8900-FE95B6504145")]
    public class TasksController : AppController<Tasks> {

        /// <summary>
        /// Get tasks app.
        /// </summary>
        /// <param name="app">The app to display.</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>        
        public override ActionResult Get(Tasks app, Query query) {
            // get all tasks in app
            app.Result = ContentService.Search(new ContentQuery<TaskItem>(query) { AppId = app.Id, Depth = 1, OrderBy = "SortOrder, CreatedAt DESC", Count = true });
            return View(app);
        }

        /// <summary>
        /// Add a task to the specified tasks app.
        /// </summary>
        /// <param name="id">The id of the app</param>
        /// <param name="task"></param>
        /// <returns></returns>
        [HttpPost]
        [Route("tasks")]
        public JsonResult InsertTask(int id, TaskItem task) {
            var app = GetApp(id);

            // perform some simple text processing for emoji etc.
            task.Name = task.Name.TweetText();

            // extract @mention from text if no assignee was supplied
            if (task.AssignedTo == null) {
                var tokens = task.Name.ExtractTokens();
                var mention = tokens.FirstOrDefault(t => t.Type == Core.TwitterText.TokenType.Mention);
                if (mention != null && mention.UserId != null) {
                    task.AssignedTo = mention.UserId;
                }
            }

            // insert task
            task = ContentService.Insert(task, app);

            // notify assigned user
            if (task.AssignedTo != null) {
                NotifyAssignedUser(task);
            }

            return Json(task);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="id">The id of the app</param>
        /// <param name="taskId">The id of the task to toggle</param>
        /// <param name="completed">If the task is completed or not</param>
        /// <returns></returns>
        [HttpPost]
        [Route("tasks/{taskId:int}/completed")]
        public JsonResult ToggleCompleted(int id, int taskId, bool completed) {
            var app = GetApp(id);
            var task = ContentService.Get<TaskItem>(taskId);

            if (task != null) {
                task.Completed = completed;
                task = ContentService.Update(task);
            }

            // return json
            return Json(task);
        }

        /// <summary>
        /// Save a users preference regarding visibility of completed tasks.
        /// </summary>
        /// <param name="id">The id of the app.</param>        
        /// <param name="hide"><c>true</c> completed tasks should be hidden, otherwise <c>false</c>.</param>
        /// <returns></returns>
        [HttpPost]
        [Route("tasks/hide")]
        public JsonResult ToggleHideCompleted(int id, bool hide) {
            var app = GetApp(id);

            if (app != null) {
                User.Profile[$"tasklist_{app.Id}_hidden"] = hide;
                UserService.Update(User);
            }

            // return json
            return Json(HttpStatusCode.OK);
        }

        /// <summary>
        /// Get partial html for edit task modal.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [Route("tasks/{taskId:int}/edit")]
        public PartialViewResult EditModal(int taskId) {
            var task = ContentService.Get<TaskItem>(taskId);
            if (task == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "Task with id " + taskId + " not found.");
            }
            return PartialView("_EditTask", task);
        }

        /// <summary>
        /// Get partial html for add task modal.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet]
        [Route("tasks/add")]
        public PartialViewResult AddModal(int id) {
            _ = GetApp(id);
            var model = new TaskItem();
            return PartialView("_AddTask", model);
        }

        /// <summary>
        /// Update a task and return partial html for the edit task modal.
        /// </summary>
        /// <returns></returns>
        [HttpPut]
        [Route("tasks/{taskId:int}/edit")]
        public ActionResult Update(int taskId) {

            TaskItem task = ContentService.Get<TaskItem>(taskId);
            if (task == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "Task with id " + taskId + " not found.");
            }

            // save reference to previously assigned user
            var assignedTo = task.AssignedTo;

            TryUpdateModel(task);
            if (ModelState.IsValid) {

                // perform some simple text processing for emoji etc.
                task.Name = task.Name.TweetText();

                // extract @mention from text if no assignee was supplied
                if (task.AssignedTo == null) {
                    var tokens = task.Name.ExtractTokens();
                    var mention = tokens.FirstOrDefault(t => t.Type == Core.TwitterText.TokenType.Mention);
                    if (mention != null && mention.UserId != null) {
                        task.AssignedTo = mention.UserId;
                    }
                }

                // update task
                task = ContentService.Update(task);

                // notify assigned user
                if (task.AssignedTo != null && task.AssignedTo != assignedTo) {
                    NotifyAssignedUser(task);
                }
            }

            return PartialView("_EditTask", task);
        }

        /// <summary>
        /// Get partial html for a row in the task list.
        /// </summary>
        /// <param name="id">The id of the app</param>
        /// <param name="taskId">The id of the task to get</param>
        /// <returns></returns>
        [HttpGet]
        [Route("tasks/{taskId:int}")]
        public PartialViewResult GetTask(int id, int taskId) {
            var task = GetContent(taskId) as TaskItem;
            return PartialView("_Task", task);
        }

        /// <summary>
        /// Update the sort order of tasks in the specified app.
        /// </summary>
        /// <param name="id">Id of the tasks app.</param>
        /// <param name="ids">Ids of the tasks to sort.</param>
        /// <returns></returns>
        [HttpPost]
        [Route("tasks/sort")]
        public ActionResult UpdateSortOrder(int id, IEnumerable<int> ids) {
            int order = 0;
            foreach (var i in ids) {
                var task = ContentService.Get<TaskItem>(i);
                if (task != null && task.SortOrder != order) {
                    task.SortOrder = order;
                    ContentService.Update(task);
                }
                order++; 
            }
            return new HttpStatusCodeResult(HttpStatusCode.OK);
        }

        /// <summary>
        /// Notify user when a task was assigned.
        /// </summary>
        /// <param name="task"></param>
        private void NotifyAssignedUser(TaskItem task) {
            var html = $@"<span class=""actor"">@{task.CreatedBy().Username}</span> assigned you to the <span class=""subject"">task</span> {task.Name.Quote(true)}";
            NotificationService.Insert(new Notification(task.AssignedTo.Value, html) { Link = task });
        }
    }
}

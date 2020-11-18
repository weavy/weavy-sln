using System.Web.Mvc;
using Weavy.Areas.Apps.Models;
using Weavy.Core.Models;
using Weavy.Core.Utils;
using Weavy.Web.Controllers;

namespace Weavy.Areas.Apps.Controllers {
    /// <summary>
    /// Controller for <see cref="TaskItem"/>.
    /// </summary>
    [RoutePrefix("{id:int}/F16EFF39-3BD7-4FB6-8DBF-F8FE88BBF3EB")]
    public class TaskItemController : ContentController<TaskItem> {

        /// <summary>
        /// Redirect to task app with #task-{id} in the url fragment.
        /// </summary>
        /// <param name="content"></param>
        /// <param name="query"></param>
        /// <returns></returns>
        public override ActionResult Get(TaskItem content, Query query) {
            return Redirect(content.App().Url() + $"#task-{content.Id}");
        }
    }
}

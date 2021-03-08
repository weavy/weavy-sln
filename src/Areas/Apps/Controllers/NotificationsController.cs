using System.Linq;
using System.Web.Mvc;
using Weavy.Areas.Apps.Models;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Controllers;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Notifications"/> app.
    /// </summary>
    public class NotificationsController : AppController<Notifications> {

        /// <summary>
        /// Displays notifications.
        /// </summary>
        /// <param name="app">The Notifications app.</param>
        /// <param name="query">Query object for paging.</param>
        public override ActionResult Get(Notifications app, Query query) {

            app.Result = NotificationService.Search(new NotificationQuery(query) {
                OrderBy = "Id DESC",
                SearchRead = null,
                Top = PageSizes.First()
            });

            if (Request.IsAjaxRequest()) {
                return PartialView("_Notifications", app.Result);
            }

            return View(app);
        }
    }
}

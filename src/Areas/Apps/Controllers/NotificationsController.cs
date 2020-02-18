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
        /// Display notifications for the <see cref="Notifications"/>.
        /// </summary>
        /// <param name="app">Id of app</param>
        public override ActionResult Get(Notifications app, Query query) {

            if (app.SpaceId != null && app.SpaceId != -1) {
                app.Parent = app.Space();
            }

            // get all unread notifications
            app.UnreadNotifications = NotificationService.Search(new NotificationQuery(query) {
                UserId = User.Id,
                SearchRead = false,
                OrderBy = "Id DESC",
                ParentId = app.SpaceId == -1 ? null : app.SpaceId,
                ParentType = app.SpaceId == -1 ? null : EntityType.Space as EntityType?
            });

            // fill up with some unread
            var more = PageSizes.First() / 2 - app.UnreadNotifications.Count;
            if (more > 0) {
                app.ReadNotifications = NotificationService.Search(new NotificationQuery(query) {
                    UserId = User.Id,
                    OrderBy = "Id DESC",
                    SearchRead = true,
                    Top = more,
                    ParentId = app.SpaceId == -1 ? null : app.SpaceId,
                    ParentType = app.SpaceId == -1 ? null : EntityType.Space as EntityType?
                });
            }

            if (Request.IsAjaxRequest()) {
                return PartialView(app);
            }

            return View(app);
        }
    }
}

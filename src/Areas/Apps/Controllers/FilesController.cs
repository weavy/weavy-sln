using System.Web.Mvc;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Controllers;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Files"/> app.
    /// </summary>
    public class FilesController : AppController<Files> {

        /// <summary>
        /// Display root content in specified <see cref="Files"/> app.
        /// </summary>
        /// <param name="app">Id of app</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>
        public override ActionResult Get(Files app, Query query) {

            // get items to display
            app.Items = ContentService.Search(new ContentQuery(query) { AppId = app.Id, Depth = 1, TransientBy = User.Id, Count = true });

            // return partial view for ajax requests, i.e. infinite scroll
            if (Request.IsAjaxRequest()) {
                return PartialView(app.Items);
            }

            return View(app);

        }
    }
}

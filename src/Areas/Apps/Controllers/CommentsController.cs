using System.Web.Mvc;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Controllers;
using Weavy.Web.Models;

namespace Weavy.Areas.Apps.Controllers {
    /// <summary>
    /// Controller for the <see cref="Comments"/> app.
    /// </summary>
    public class CommentsController : AppController<Comments> {

        /// <summary>
        /// Display <see cref="Comments"/> objects in current app.
        /// </summary>
        /// <param name="app">The app</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>
        public override ActionResult Get(Comments app, Query query) {
            
            var commentsQuery = new CommentQuery(query) { Parent = app };

            commentsQuery.Top = PageSizes[0] / 5; // NOTE: reduced number of items/page for better perf.
            
            app.SearchResult = CommentService.Search(commentsQuery);
            if (Request.IsAjaxRequest()) {
                // infinite scroll, return partial view                
                return PartialView("_CommentSearchResult", app.SearchResult);
            }

            // REVIEW: can we do this automagically?
            return View(app);
        }
    }
}

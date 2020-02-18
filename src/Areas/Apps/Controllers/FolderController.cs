using System.Web.Mvc;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Controllers;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Folder"/> content type.
    /// </summary>
    public class FolderController : ContentController<Folder> {

        /// <summary>
        /// Display content in specified <see cref="Folder"/>.
        /// </summary>
        /// <param name="content">The current <see cref="Folder"/>.</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>
        public override ActionResult Get(Folder content, Query query) {

            // get folder content
            content.Items = ContentService.Search(new ContentQuery(query) { ParentId = content.Id, Depth = 1, TransientBy = User.Id, Count = true });

            // return partial view for ajax requests, i.e. infinite scroll
            if (Request.IsAjaxRequest()) {
                return PartialView(content.Items);
            }

            return View(content);
        }
    }
}

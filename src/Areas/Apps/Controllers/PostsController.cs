using System.Web.Mvc;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web;
using Weavy.Web.Controllers;
using Weavy.Web.Models;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Posts"/> app.
    /// </summary>
    public class PostsController : AppController<Posts> {

        /// <summary>
        /// Display latest <see cref="Post"/> objects in current space.
        /// </summary>
        /// <param name="app">The app</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>
        public override ActionResult Get(Posts app, Query query) {
            var model = new PostsViewModel();

            if (!IsEmbedded) {
                model.Members = SpaceService.GetMembers(WeavyContext.Current.Space.Id, new MemberQuery { Top = 6, OrderBy = "Random", Count = true });
            }

            query.Top = 10; // NOTE: low number of items/page for better perf.
            model.Posts = PostService.GetPosts(app.Id, opts: query);
            if (Request.IsAjaxRequest()) {
                // infinite scroll, return partial view                
                return PartialView("_Posts", model.Posts);
            }

            // REVIEW: can we do this automagically?
            return View(IsEmbedded ? "Get.Embedded": null, model);
        }
    }
}

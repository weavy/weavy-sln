using System;
using System.Web;
using System.Web.Mvc;
using Weavy.Core;
using Weavy.Core.Utils;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web;
using Weavy.Web.Controllers;
using Weavy.Web.Utils;

namespace Weavy.Areas.Apps.Controllers {

    /// <summary>
    /// Controller for the <see cref="Search"/> app.
    /// </summary>
    public class SearchController : AppController<Search> {

        /// <summary>
        /// Display search results.
        /// </summary>
        /// <param name="app">The app</param>
        /// <param name="query">An object with query parameters for search, paging etc.</param>
        public override ActionResult Get(Search app, Query query) {
            return Search(app.Id, null, query);
        }

        /// <summary>
        /// Display search results.
        /// </summary>
        /// <param name="id">The app id</param>
        /// <param name="tab"></param>
        /// <param name="query"></param>
        /// <returns></returns>
        [HttpGet]
        // NOTE: Using best practice of adding AppGuid to routes in order to avoid route conflicts with built-in controllers/actions
        [Route("{id:int}/0337A872-D760-4CBF-8AC4-1FBD9EAC1E47/{tab:vals(posts|files|comments)?}")]
        [Route(ControllerUtils.EMBEDDED_PREFIX + "apps/{id:int}/0337A872-D760-4CBF-8AC4-1FBD9EAC1E47/{tab:vals(posts|files|comments)?}", Name = nameof(SearchController) + "Search", Order = 1)]
        public ActionResult Search(int id, string tab = null, Query query = null) {
            var app = GetApp(id) as Search;

            // set space and entitity types to search
            query.SpaceId = app.SpaceId;
            if (tab == "posts") {
                query.EntityTypes = new EntityType[] { EntityType.Post };
            } else if (tab == "files") {
                query.EntityTypes = new EntityType[] { EntityType.Content };
            } else if (tab == "comments") {
                query.EntityTypes = new EntityType[] { EntityType.Comment };
            } else { 
                // search "everything"
                query.EntityTypes = new EntityType[] { EntityType.Post, EntityType.Content, EntityType.Comment };
            }

            app.Result = IndexService.Search(query);

            if (Request.IsAjaxRequest()) {
                return PartialView("_SearchResult", app.Result);
            }

            return View(nameof(Get), app);
        }

        /// <summary>
        /// Helper method for deciding if the specified tab is selected.
        /// </summary>
        /// <param name="request">Current request</param>
        /// <param name="tab">Tab</param>
        /// <returns></returns>
        public static bool IsTabActive(HttpRequestBase request, string tab) {
            var ctx = WeavyContext.Current;
            var url = request.RawUrl.RemoveLeading(ControllerUtils.EMBEDDED_PREFIX.Substring(1).RemoveTrailingSlash(), StringComparison.OrdinalIgnoreCase).LeftBefore("?");
            string href = ctx.ApplicationPath + "apps/" + ctx.App.Id + "/" + typeof(Search).GUID + "/" + tab;
            return url.Equals(href, StringComparison.OrdinalIgnoreCase);
        }
    }
}

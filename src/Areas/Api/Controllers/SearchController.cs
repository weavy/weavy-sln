using System.Net;
using System.Web.Http;
using System.Web.Http.Description;
using Weavy.Areas.Api.Models;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Web.Api.Controllers;
using Weavy.Web.Api.Models;

namespace Weavy.Areas.Api.Controllers {

    /// <summary>
    /// Provides search functionality.
    /// </summary>
    [RoutePrefix("api")]
    public class SearchController : WeavyApiController {

        /// <summary>
        /// Performs a search against the index.
        /// </summary>
        /// <param name="query">A <see cref="Query"/> object that contains the parameters to use in the search.</param>
        /// <returns>The results from the search.</returns>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<IndexDocument>))]
        [Route("search")]
        public IHttpActionResult Get(Query query) {
            query.Count = true;
            var result = IndexService.Search(query);
            var model = new ScrollableList<IndexDocument>(result, Request.RequestUri);
            return Ok(model);
        }
    }
}

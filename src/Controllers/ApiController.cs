using System.Net;
using System.Web.Http;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Api.Controllers;
using Weavy.Web.Api.Models;

namespace Weavy.Controllers {

    /// <summary>
    /// Example JSON API controller with methods that you want to call from the Weavy client.
    /// Feel free to add, remove, or modify these methods to better suit your needs.
    /// </summary>
    [RoutePrefix("api")]
    public class ApiController : WeavyApiController {
     
        /// <summary>
        /// Creates a new space.
        /// </summary>
        /// <param name="space">The space to insert.</param>
        /// <returns>The created space.</returns>
        [HttpPost]
        [Route("spaces")]
        public Space InsertSpace(Space space) {
            return SpaceService.Insert(space);
        }

        /// <summary>
        /// Get the space with the specified id.
        /// </summary>
        /// <param name="id">The space id.</param>
        /// <returns>An instance of the <see cref="Space"/> class.</returns>
        [HttpGet]
        [Route("spaces/{id:int}")]
        public Space GetSpace(int id) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "Space with id " + id + " not found");
            }
            return space;
        }

        /// <summary>
        /// Performs a search against the index.
        /// </summary>
        /// <param name="query">The <see cref="Query"/> object that contains the parameters to use in the search.</param>
        /// <returns>A <see cref="ScrollableList&lt;IndexDocument&gt;"/> with the results from the search.</returns>
        [HttpGet]
        [Route("search")]
        public ScrollableList<IndexDocument> Search(Query query) {
            if (query != null) {
                var result = IndexService.Search(query, true);
                return new ScrollableList<IndexDocument>(result, Request.RequestUri);
            } else {
                return null;
            }
        }
    }
}

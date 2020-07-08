using System.Net;
using System.Web.Http;
using System.Web.Http.Description;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Api.Controllers;
using Weavy.Web.Api.Models;

namespace Weavy.Areas.Api.Controllers {

    /// <summary>
    /// Apps can display rich interactive web content. All apps belongs to a specific <see cref="Space"/>. There are built in apps you can use or create your own to fit your need. 
    /// Some examples of built in apps are the <see cref="Files"/> app and <see cref="Posts"/> app.
    /// </summary>
    [RoutePrefix("api")]
    public class AppsController : WeavyApiController {

        /// <summary>
        /// Get the <see cref="App"/> with the specified id.
        /// </summary>
        /// <param name="id">The app id.</param>
        /// <example>GET /api/apps/527</example>
        /// <returns>The specified app.</returns>
        [HttpGet]
        [ResponseType(typeof(App))]
        [Route("apps/{id:int}")]
        public IHttpActionResult Get(int id) {
            var app = AppService.Get(id);
            if (app == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"App with id {id} not found.");
            }
            return Ok(app);
        }

        /// <summary>
        /// Inserts a new <see cref="App"/> in the specified <see cref="Space"/>.
        /// </summary>
        /// <param name="id">Id of the <see cref="Space"/> where the <see cref="App"/> should be inserted.</param>
        /// <param name="model">The <see cref="App"/> to insert.</param>
        /// <example>
        /// POST /api/spaces/1/apps
        ///
        /// {
        ///   "name": "Files",
        ///   "guid": "523edd88-4bbf-4547-b60f-2859a6d2ddc1"
        /// }
        /// </example>
        /// <returns>The inserted <see cref="App"/>.</returns>
        [HttpPost]
        [ResponseType(typeof(App))]
        [Route("spaces/{id:int}/apps")]
        public IHttpActionResult Insert(int id, App model) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }

            var app = AppService.Insert(model, space);
            return Created($"{WeavyContext.Current.ApplicationPath}api/apps/{app.Id}", app);
        }

        /// <summary>
        /// Updates the specified app by setting the values of the parameters passed. 
        /// Any parameters not provided will be left unchanged. 
        /// </summary>
        /// <param name="id">Id of the app to update.</param>
        /// <param name="model">Contains the new properties for the app.</param>
        /// <example>
        /// PATCH /api/spaces/527/apps
        ///
        /// {
        ///   "name": "Files"
        /// }
        /// </example>
        /// <returns>The updated app.</returns>
        [HttpPatch]
        [ResponseType(typeof(App))]
        [Route("apps/{id:int}")]
        public IHttpActionResult Update(int id, Delta<App> model) {
            var app = AppService.Get(id);
            if (app == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"App with id {id} not found.");
            }

            model.Patch(app);
            app = AppService.Update(app);
            return Ok(app);
        }

        /// <summary>
        /// List apps in the specified space.
        /// </summary>
        /// <param name="id">Id of the space for which to list apps.</param>
        /// <param name="opts">Query options for paging, sorting etc.</param>
        /// <returns>A list of apps.</returns>
        /// <example>GET /api/spaces/1/apps?top=2&amp;skip=2</example>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<App>))]
        [Route("spaces/{id:int}/apps")]
        public IHttpActionResult List(int id, QueryOptions opts) {
            var apps = AppService.Search(new AppQuery(opts) { SpaceId = id, Count = true });
            return Ok(new ScrollableList<App>(apps, Request.RequestUri));
        }

        /// <summary>
        /// Search for apps according to the specified query object.
        /// </summary>
        /// <param name="query">The query object.</param>
        /// <returns>A list of apps.</returns>
        /// <example>GET api/apps?top=2&amp;skip=2&amp;q=test</example>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<App>))]
        [Route("apps")]
        public IHttpActionResult Search(AppQuery query) {
            query.Count = true;
            var apps = AppService.Search(query);
            return Ok(new ScrollableList<App>(apps, Request.RequestUri));
        }

        /// <summary>
        /// Trashes the app with the specified id.
        /// </summary>
        /// <param name="id">Id of the app to trash.</param>
        /// <returns>Returns the trashed app.</returns>
        [HttpPost]
        [ResponseType(typeof(App))]
        [Route("apps/{id:int}/trash")]
        public IHttpActionResult Trash(int id) {
            var app = AppService.Get(id, trashed: true);
            if (app == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"App with id {id} not found.");
            }
            app = AppService.Trash(id);
            return Ok(app);
        }

        /// <summary>
        /// Restores the app with the specified id.
        /// </summary>
        /// <param name="id">Id of the app to restore.</param>
        /// <returns>Returns the restored app.</returns>
        [HttpPost]
        [ResponseType(typeof(App))]
        [Route("apps/{id:int}/restore")]
        public IHttpActionResult Restore(int id) {
            var app = AppService.Get(id, trashed: true);
            if (app == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"App with id {id} not found.");
            }
            app = AppService.Restore(id);
            return Ok(app);
        }

        /// <summary>
        /// Permanently delete the app with the specified id.
        /// </summary>
        /// <param name="id">Id of the app to delete.</param>
        /// <returns>The deleted app.</returns>
        [HttpDelete]
        [ResponseType(typeof(App))]
        [Route("apps/{id:int}")]
        public IHttpActionResult Delete(int id) {
            var app = AppService.Get(id, trashed: true);
            if (app == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"App with id {id} not found.");
            }
            app = AppService.Delete(id);
            return Ok(app);
        }
    }
}

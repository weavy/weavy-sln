using System.Collections.Generic;
using System.Linq;
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
    /// The Users API has methods for manipulating users. 
    /// Each user has a profile that holds all the personal details of the user.
    /// This includes basic information like the name and email address, but can also include other properties like phone number etc.
    /// </summary>
    [RoutePrefix("api")]
    public class UsersController : WeavyApiController {

        /// <summary>
        /// Get the user with the specified id.
        /// </summary>
        /// <param name="id">The user id.</param>
        /// <returns>Returns the user.</returns>
        [HttpGet]
        [ResponseType(typeof(User))]
        [Route("users/{id:int}")]
        public IHttpActionResult Get(int id) {
            var user = UserService.Get(id);
            if (user == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "User with id " + id + " not found");
            }
            return Ok(user);
        }

        /// <summary>
        /// Retrieves a list of users.
        /// </summary>
        /// <param name="ids">A comma-separated list of user ids.</param>
        /// <returns>Returns a list of users.</returns>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<User>))]
        [Route("users/{ids:ints}")]
        public IHttpActionResult GetUsers(IEnumerable<int> ids) {
            ids = ids.Distinct();
            return Ok(new ScrollableList<User>(UserService.Get(ids), null, null, null, Request.RequestUri));
        }

        /// <summary>
        /// Inserts a new user.
        /// </summary>
        /// <param name="model">The properties of the user to insert.</param>
        /// <returns>The inserted user.</returns>
        [HttpPost]
        [ResponseType(typeof(User))]
        [Route("users")]
        public IHttpActionResult Insert(User model) {
            var user = UserService.Insert(model);
            return Created($"/api/users/{user.Id}", UserService.Get(user.Id));
        }

        /// <summary>
        /// Updates a user.
        /// </summary>
        /// <param name="id">The id of the user to update.</param>
        /// <param name="model">Contains the new properties for the user.</param>
        /// <returns>The updated user.</returns>
        [HttpPatch]
        [ResponseType(typeof(User))]
        [Route("users/{id:int}")]
        public IHttpActionResult Update(int id, Delta<User> model) {
            var user = UserService.Get(id);
            if (user == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "User with id " + id + " not found");
            }
            model.Patch(user);
            UserService.Update(user);
            return Ok(UserService.Get(user.Id));
        }

        /// <summary>
        /// Updates the profile for a user.
        /// </summary>
        /// <param name="id">The id of the user to update.</param>
        /// <param name="model">Contains the new properties for the profile.</param>
        /// <returns>The updated user.</returns>
        [HttpPatch]
        [ResponseType(typeof(User))]
        [Route("users/{id:int}/profile")]
        public IHttpActionResult UpdateProfile(int id, Delta<ProfileBase> model) {
            var user = UserService.Get(id);
            if (user == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "User with id " + id + " not found");
            }
            model.Patch(user.Profile);
            UserService.Update(user);
            return Ok(UserService.Get(user.Id));
        }

        /// <summary>
        /// Trash a user.
        /// </summary>
        /// <param name="id">Id of the user to trash.</param>
        /// <returns>The trashed user.</returns>
        [HttpPost]
        [ResponseType(typeof(User))]
        [Route("users/{id:int}/trash")]
        public IHttpActionResult Trash(int id) {
            var user = UserService.Get(id, trashed: true);
            if (user == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "User with id " + id + " not found");
            }
            user = UserService.Trash(id);
            return Ok(user);
        }

        /// <summary>
        /// Restores a trashed user.
        /// </summary>
        /// <param name="id">Id of user to restore.</param>
        /// <returns>The restored user.</returns>
        [HttpPost]
        [ResponseType(typeof(User))]
        [Route("users/{id:int}/restore")]
        public IHttpActionResult Restore(int id) {
            var user = UserService.Get(id, trashed: true);
            if (user == null) {
                ThrowResponseException(HttpStatusCode.NotFound, "User with id " + id + " not found");
            }
            user = UserService.Restore(id);
            return Ok(user);
        }

        /// <summary>
        /// Searches for users according to the specified query object.
        /// </summary>
        /// <param name="query">The query object.</param>
        /// <returns>A list of users.</returns>
        /// <example>GET /api/users?top=20&amp;q=test</example>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<User>))]
        [Route("users")]
        public IHttpActionResult Search(UserQuery query) {
            query.Count = true;
            var result = UserService.Search(query);
            return Ok(new ScrollableList<User>(result, Request.RequestUri));
        }
    }
}

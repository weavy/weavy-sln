using System.Collections.Generic;
using System.Net;
using System.Web.Http;
using System.Web.Http.Description;
using Weavy.Areas.Api.Models;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Api.Controllers;
using Weavy.Web.Api.Models;

namespace Weavy.Areas.Api.Controllers {

    /// <summary>
    /// A space is a work area. Apps, Items, Posts and other things all exists in the context of a space. 
    /// Users can be members of a space which give them certain permissions.
    /// </summary>
    [RoutePrefix("api")]
    public class SpacesController : WeavyApiController {

        /// <summary>
        /// Get the space with the specified id.
        /// </summary>
        /// <param name="id">The space id.</param>
        /// <example>GET /api/spaces/432</example>
        /// <returns>Returns the space.</returns>
        [HttpGet]
        [ResponseType(typeof(Space))]
        [Route("spaces/{id:int}")]
        public IHttpActionResult Get(int id) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            return Ok(space);
        }

        /// <summary>
        /// Searches for spaces according to the specified query object.
        /// </summary>
        /// <param name="query">The query object.</param>
        /// <returns>A list of spaces.</returns>
        /// <example>GET /api/spaces/search?q=test</example>
        [HttpGet]
        [ResponseType(typeof(ScrollableList<Space>))]
        [Route("spaces")]
        public IHttpActionResult Search(SpaceQuery query) {
            query.Count = true;
            var result = SpaceService.Search(query);
            return Ok(new ScrollableList<Space>(result, Request.RequestUri));
        }

        /// <summary>
        /// Creates a new space.
        /// </summary>
        /// <param name="model">The space to insert.</param>
        /// <example>
        /// POST /api/spaces
        ///
        /// {
        ///   "name": "A space",
        ///   "key": "ext_222"
        /// }
        /// </example>
        /// <returns>The created space.</returns>
        [HttpPost]
        [ResponseType(typeof(Space))]
        [Route("spaces")]
        public IHttpActionResult Insert(Space model) {
            var space = SpaceService.Insert(model);
            return Created($"/api/spaces/{space.Id}", space);
        }

        /// <summary>
        /// Updates the specified space by setting the values of the parameters passed. 
        /// Any parameters not provided will be left unchanged. 
        /// </summary>
        /// <param name="id">The id of the space to update.</param>
        /// <param name="model">The updated properties.</param>
        /// <example>
        /// PATCH /api/spaces/432
        ///
        /// {
        ///   "name": "A space"
        /// }
        /// </example>
        /// <returns>The updated space.</returns>
        [HttpPatch]
        [ResponseType(typeof(Space))]
        [Route("spaces/{id:int}")]
        public IHttpActionResult Update(int id, Delta<Space> model) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }

            // patch the original space
            model.Patch(space);

            space = SpaceService.Update(space);
            return Ok(space);
        }

        /// <summary>
        /// Trashes the space with the specified id.
        /// </summary>
        /// <param name="id">Id of the space to trash.</param>
        /// <returns>Returns the trashed space.</returns>
        [HttpPost]
        [ResponseType(typeof(Space))]
        [Route("spaces/{id:int}/trash")]
        public IHttpActionResult Trash(int id) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            space = SpaceService.Trash(id);
            return Ok(space);
        }

        /// <summary>
        /// Restores the space with the specified id.
        /// </summary>
        /// <param name="id">Id of the space to restore.</param>
        /// <returns>Returns the restored space.</returns>
        [HttpPost]
        [ResponseType(typeof(Space))]
        [Route("spaces/{id:int}/restore")]
        public IHttpActionResult Restore(int id) {
            var space = SpaceService.Get(id, trashed: true);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            space = SpaceService.Restore(id);
            return Ok(space);
        }

        /// <summary>
        /// Permanently deletes the space with the specified id.
        /// </summary>
        /// <param name="id">Id of the space to delete.</param>
        /// <returns>The deleted space.</returns>
        [HttpDelete]
        [ResponseType(typeof(Space))]
        [Route("spaces/{id:int}")]
        public IHttpActionResult Delete(int id) {
            var space = SpaceService.Get(id, trashed: true);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            space = SpaceService.Delete(id);
            return Ok(space);
        }

        /// <summary>
        /// Gets the members of the space.
        /// </summary>
        /// <param name="id">The space id.</param>
        /// <returns>A list of space members.</returns>
        [HttpGet]
        [ResponseType(typeof(List<Member>))]
        [Route("spaces/{id:int}/members")]
        public IHttpActionResult GetMembers(int id) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            var members = SpaceService.GetMembers(id);
            return Ok(members);
        }

        /// <summary>
        /// Add members to a space.
        /// </summary>
        /// <param name="id">The space id.</param>
        /// <param name="members">The ids of the users to add.</param>
        /// <example>
        /// POST /api/spaces/3/members
        /// 
        /// [23,24]
        /// </example>
        /// <returns>The added members.</returns>        
        [HttpPost]
        [ResponseType(typeof(List<Member>))]
        [Route("spaces/{id:int}/members")]
        public IHttpActionResult AddMembers(int id, int[] members) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            var inserted = new List<Member>();
            foreach (var member in members) {
                var user = UserService.Get(member);
                if (user != null) {
                    inserted.Add(SpaceService.AddMember(id, user.Id));
                }
            }
            return Ok(inserted);
        }

        /// <summary>
        /// Update a space member.
        /// </summary>
        /// <param name="id">The space id.</param>
        /// <param name="userid">The id of the user to update.</param>
        /// <param name="access">The access level to set.</param>
        /// <example>
        /// PUT /api/spaces/3/members/23
        /// 
        /// "admin"
        /// </example>
        /// <returns>The updated member.</returns>
        [HttpPut]
        [ResponseType(typeof(Member))]
        [Route("spaces/{id:int}/members/{userid:int}")]
        public IHttpActionResult UpdateMember(int id, int userid, [FromBody]Access access) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            return Ok(SpaceService.AddMember(id, userid, access));
        }

        /// <summary>
        /// Removes a member from the space.
        /// </summary>
        /// <param name="id">The space id.</param>
        /// <param name="userid">The user to remove from the space.</param>
        /// <example>
        /// DELETE /api/spaces/3/members/23
        /// </example>
        /// <returns>The member that was removed.</returns>
        [HttpDelete]
        [ResponseType(typeof(Member))]
        [Route("spaces/{id:int}/members/{userid:int}")]
        public IHttpActionResult RemoveMember(int id, int userid) {
            var space = SpaceService.Get(id);
            if (space == null) {
                ThrowResponseException(HttpStatusCode.NotFound, $"Space with id {id} not found.");
            }
            return Ok(SpaceService.RemoveMember(id, userid));
        }
    }
}

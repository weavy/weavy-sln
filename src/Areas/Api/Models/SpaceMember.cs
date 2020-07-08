using Weavy.Core.Models;

namespace Weavy.Areas.Api.Models {

    /// <summary>
    /// Model for a space member.
    /// </summary>
    public class SpaceMember {

        /// <summary>
        /// The id of the user to update.
        /// </summary>
        public int UserId { get; set; }

        /// <summary>
        /// The access level for the user.
        /// </summary>
        public Access Access { get; set; }
    }
}

using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Areas.Api.Models {

    /// <summary>
    ///  An object used to create and update a user.
    /// </summary>
    public class UserIn : IValidatableObject {

        /// <summary>
        /// The blob id of avatar to use for the profile image.
        /// </summary>
        public int? AvatarId { get; set; }

        /// <summary>
        /// The name of the user.
        /// </summary>
        [StringLength(256)]
        public string Name { get; set; }

        /// <summary>
        /// The email address for the user.
        /// </summary>
        [EmailAddress]
        [StringLength(256)]
        public string Email { get; set; }

        /// <summary>
        /// The username.
        /// </summary>
        [Required]
        [RegularExpression(HtmlExtensions.UsernamePattern, ErrorMessage = "Invalid username. Valid characters are [a-zA-Z0-9_].")]
        [StringLength(32)]
        public string Username { get; set; }

        /// <summary>
        /// The password to set for the user.
        /// </summary>
        public string Password { get; set; }

        /// <summary>
        /// A comment about the user.
        /// </summary>
        public string Comment { get; set; }

        /// <summary>
        /// The id of the directory where the user should be added.
        /// </summary>
        public int? DirectoryId { get; set; }

        /// <summary>
        /// A flag indicating if the user should have admin privaligies.
        /// </summary>
        public bool IsAdmin { get; set; }

        /// <summary>
        /// A flag indicating if the user is suspended.
        /// </summary>
        public bool IsSuspended { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            // validate password complexity
            if (Password != null) {
                foreach (var res in ValidationUtils.ValidatePassword(Password)) {
                    yield return new ValidationResult(res.ErrorMessage, new[] { nameof(Password) });
                }
            }
        }
    }
}

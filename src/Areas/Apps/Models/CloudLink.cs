using System;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using Weavy.Core.Utils;
using Weavy.Core.Models;

namespace Weavy.Areas.Apps.Models {

    /// <summary>
    /// A link to a file stored in the cloud.
    /// </summary>
    [Serializable]
    [Guid("4C11EB4C-80C1-42E2-8972-BF967AD48289")]
    [Content(Icon = "cloud", Color = "light-blue", Name = "Cloud file", Description = "A link to a file stored in the cloud.", SingularName = "a cloud file", PluralName = "Cloud files", CreateVerb = "Save", ModifyVerb = "Save", Parents = new Type[] { typeof(Files), typeof(Folder) }, CreateMode = UpsertMode.None, ModifyMode = UpsertMode.Modal)]
    public class CloudLink : Link {

        /// <summary>
        /// Gets or sets the provider of the link.
        /// </summary>
        [Required]
        [ScaffoldColumn(false)]
        public virtual string Provider { get; set; }

        /// <summary>
        /// Gets or sets the provider document kind.
        /// </summary>        
        [ScaffoldColumn(false)]
        public virtual string Kind { get; set; }

        /// <summary>
        /// Gets a value indicating whether the link should be embedded or not.
        /// </summary>      
        public bool Embedded => Provider.ToSpinalCase() == "google-drive";

        /// <summary>
        /// Gets the the icon to use.
        /// </summary>
        /// <returns></returns>
        public override Icon GetIcon() {

            // get icon name and color
            var icon = FileUtils.GetIcon(Name);
            if (Provider.ToSpinalCase() == "google-drive") {
                switch (Kind?.ToLower()) {
                    case "document":
                        icon.Name = "file-document-box";
                        icon.Color = "native";
                        break;
                    case "spreadsheet":
                        icon.Name = "file-sheet-box";
                        icon.Color = "native";
                        break;
                    case "presentation":
                        icon.Name = "file-slide-box";
                        icon.Color = "native";
                        break;
                }
            }

            // add overlay
            icon.Name += "+" + Provider.ToSpinalCase();

            return icon;
        }

        /// <summary>
        /// Gets the kind of content this link points to.
        /// </summary>
        public override string GetKind() {
            var kind = FileUtils.GetKind(Name);
            if (Provider.ToSpinalCase() == "google-drive") {
                kind = Kind?.ToLower() ?? kind;
            }

            return kind;
        }
    }
}

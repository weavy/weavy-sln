using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using Weavy.Core.Attributes;
using Weavy.Core.Models;

namespace Weavy.Areas.Apps.Models {

    /// <summary>
    /// A content type representing a link to (external) content.
    /// </summary>
    [Serializable]
    [Guid("F1EB7D53-4219-485C-8970-CCE683F3232C")]
    [Content(Icon = "link-variant", Color = "blue", Name = "Link", Description = "A link.", SingularName = "a link", PluralName = "links", CreateVerb = "Save", ModifyVerb = "Save", Parents = new Type[] { typeof(Files), typeof(Folder) }, CreateMode = UpsertMode.Modal, ModifyMode = UpsertMode.Modal)]
    public class Link : Content, IStarrable {

        /// <summary>
        /// Gets or sets the uri of the linked resource.
        /// </summary>
        [Required]
        [DataType(DataType.Url)]
        [Display(Description = "Full url to the linked resource including http(s)://")]
        [Uri(ErrorMessage = "Must be a valid and fully-qualified url.")]
        public virtual string Uri { get; set; }
              
        /// <summary>
        /// Gets the ids of the users that have starred the item.
        /// </summary>
        [ScaffoldColumn(false)]
        public IEnumerable<int> StarredByIds { get; set; }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Description;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Web.Api.Controllers;
using Weavy.Web.Api.Models;
using Weavy.Web.Api.Streamers;

namespace Weavy.Areas.Api.Controllers {

    /// <summary>
    /// Api controller for manipulating Blobs.
    /// </summary>
    [RoutePrefix("api")]
    public class BlobsController : WeavyApiController {
        
        /// <summary>
        /// Uploads new blob(s). Use multipart/form-data for the request format.
        /// After upload the blobs can be used for setting avatars or as references when creating attachments and/or files. 
        /// </summary>
        /// <returns>The uploaded blobs(s).</returns>
        [HttpPost]
        [Route("blobs")]
        public async Task<ScrollableList<Blob>> Upload() {
            // check if the request contains multipart/form-data. 
            if (!Request.Content.IsMimeMultipartContent()) {
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);
            }

            // write uploaded files to local disk cache
            var provider = await Request.Content.ReadAsMultipartAsync(new BlobMultipartFormDataRemoteStreamProvider());

            // iterate over the uploaded files and store them as blobs in the database
            List<Blob> blobs = new List<Blob>();
            foreach (var data in provider.FileData) {
                var blob = provider.GetBlob(data);
                if (blob != null) {
                    try {
                        blob = BlobService.Insert(blob, System.IO.File.OpenRead(data.Location));
                        blobs.Add(blob);
                    } catch {
                        ThrowResponseException(HttpStatusCode.InternalServerError, "Failed to upload blobs");
                    }
                }
            }
            return new ScrollableList<Blob>(blobs, null, null, blobs.Count(), Request.RequestUri);
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using Weavy.Areas.Apps.Models;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Utils {

    /// <summary>
    /// Provides extension and helper methods for generating html markup.
    /// </summary>
    public static class HtmlUtils {
        
        /// <summary>
        /// Returns a FAB with links for adding content in the root folder of a <see cref="Files"/> app.
        /// </summary>
        /// <param name="helper"></param>
        /// <param name="app"></param>
        /// <returns></returns>
        public static MvcHtmlString FAB(this HtmlHelper helper, Files app) {
            if (app == null) {
                return null;
            }

            var pmeta = app.MetaData();
            return RenderFAB(app.Url(), app.AppGuid.Value, $"/a/apps/{app.Id}/content/upload", pmeta.IsContentAllowed, app.HasPermission);
        }
        
        /// <summary>
        /// Returns a FAB with links for adding content to a <see cref="Folder"/>.
        /// </summary>
        /// <param name="helper"></param>
        /// <param name="folder"></param>
        /// <returns></returns>
        public static MvcHtmlString FAB(this HtmlHelper helper, Folder folder) {
            if (folder == null) {
                return null;
            }

            var pmeta = folder.MetaData();
            return RenderFAB(folder.Url(), folder.ContentGuid.Value, $"/a/content/{folder.Id}/upload", pmeta.IsChildAllowed, folder.HasPermission);
        }
        
        /// <summary>
        /// Render the FAB
        /// </summary>
        /// <param name="url">The url to the current page</param>
        /// <param name="guid">The guid of the current app or content type</param>
        /// <param name="uploadUrl">The url to upload loca files to</param>
        /// <param name="allowdFunc">func for checking if content is allowed</param>
        /// <param name="permissionFunc">func for checking permission</param>
        /// <returns></returns>
        private static MvcHtmlString RenderFAB(string url, Guid guid, string uploadUrl, Func<Guid, bool> allowdFunc, Func<Permission, User, bool> permissionFunc) {
            var container = new TagBuilder("div");
            container.Attributes["class"] = "fab dropup";

            // fab button
            var button = new TagBuilder("button");
            button.AddCssClass("btn btn-round btn-primary dropdown-toggle");
            button.Attributes["type"] = "button";
            button.Attributes["title"] = "Create";
            button.Attributes["data-toggle"] = "dropdown";
            button.Attributes["aria-haspopup"] = "true";
            button.Attributes["aria-expanded"] = "false";
            button.InnerHtml = Weavy.Web.Utils.Svg.Icon("plus").ToString();

            // dropdown menu
            var menu = new TagBuilder("div");
            menu.Attributes["role"] = "menu";
            menu.AddCssClass("dropdown-menu dropdown-menu-right");

            // create content
            if (permissionFunc(Permission.Content, null)) {
                // get allowed content types                
                List<Content> allowed = new List<Content>();
                foreach (var ct in PluginService.GetContentTypes()) {
                    if (allowdFunc(ct.Id)) {
                        var child = ContentService.New(ct.Id);
                        if (child != null && child.MetaData().IsParentAllowed(guid)) {
                            allowed.Add(child);
                        }
                    }
                }

                var content = new List<dynamic>();
                
                content.AddRange(allowed.Where(x => x.MetaData().CreateMode != UpsertMode.None).Select(x => new {
                    Url = x.MetaData().CreateMode == UpsertMode.Modal ? "#upsert-content-modal" : $"{url}/content/{x.ContentGuid}",
                    Param = x.ContentGuid,
                    x.MetaData().Icon,
                    x.MetaData().Color,
                    x.MetaData().Name,
                    Path = x.MetaData().CreateMode == UpsertMode.Modal ? $"{url}/content/{x.ContentGuid}" : "",
                    SortOrder = 1
                }));

                // google and o365       
                if (allowdFunc(typeof(CloudLink).GUID)) {
                    content.Add(new { Url = "#google-modal", Icon = "google-drive", Color = "native", Name = "Google Drive file", Param = "", SortOrder = 2, Css = "", Path = "" });
                    content.Add(new { Url = "#o365-modal", Icon = "office", Color = "native", Name = "Office 365 file", Param = "", SortOrder = 3, Css = "", Path = "" });
                }

                if (content.Any()) {
                    menu.InnerHtml += @"<h6 class=""dropdown-header"">New</h6>";
                    foreach (var c in content.OrderBy(x => x.SortOrder)) {
                        if (c.Url.StartsWith("#")) {
                            menu.InnerHtml += $@"<a class=""dropdown-item"" href=""#"" data-toggle=""modal"" data-target=""{c.Url}"" data-param=""{c.Param}"" data-path=""{c.Path}"" data-title=""New {c.Name}"">{Weavy.Web.Utils.Svg.Icon(c.Icon, c.Color)} {c.Name}</a>";
                        } else {
                            menu.InnerHtml += $@"<a class=""dropdown-item"" href=""{c.Url}"">{Weavy.Web.Utils.Svg.Icon(c.Icon, c.Color)} {c.Name}</a>";
                        }
                    }
                }

                // files
                var files = new List<dynamic>();
                if (allowdFunc(typeof(File).GUID)) {
                    files.Add(new { Url = "#filebrowser-modal", Icon = "cloud", Color = "light-blue", Name = "Cloud", Param = "", Css = "d-desktop" });
                    files.Add(new { Url = "upload", Icon = "laptop", Color = "theme-700", Name = "Your computer", Param = "", Css = "" });

                }
                if (files.Any()) {
                    if (content.Any()) {
                        menu.InnerHtml += @"<h6 class=""dropdown-header"">Add file from</h6>";
                    }
                    foreach (var c in files) {
                        if (c.Url.StartsWith("#")) {
                            menu.InnerHtml += $@"<a class=""dropdown-item"" href=""#"" data-toggle=""modal"" data-target=""{c.Url}"" data-param=""{c.Param}"" data-type=""{c.Name}"">{Weavy.Web.Utils.Svg.Icon(c.Icon, c.Color)} {c.Name}</a>";
                        } else if (c.Url == "upload") {
                            menu.InnerHtml += $@"<div class=""dropdown-item fab-upload"">{Weavy.Web.Utils.Svg.Icon(c.Icon, c.Color)} {c.Name}<input type=""file"" data-single-file-uploads=""false"" data-url=""{uploadUrl}"" multiple /></div>";
                        } else {
                            menu.InnerHtml += $@"<a class=""dropdown-item"" href=""{c.Url}"">{Weavy.Web.Utils.Svg.Icon(c.Icon, c.Color)} {c.Name}</a>";
                        }
                    }
                }
            }

            if (menu.InnerHtml.IsNullOrEmpty()) {
                return null;
            }

            container.InnerHtml += button.ToString();
            container.InnerHtml += menu.ToString();
            return MvcHtmlString.Create(container.ToString());
        }

    }
}

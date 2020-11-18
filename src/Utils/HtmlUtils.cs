using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using Weavy.Core.Localization;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Web.Utils;
// NOTE: using static directive to prevent clash with 'Svg' namespace when generating wvy-sln
using static Weavy.Web.Utils.Svg;

namespace Weavy.Utils {

    /// <summary>
    /// Provides extension and helper methods for generating html markup.
    /// </summary>
    public static class HtmlUtils {

        private static readonly StringLocalizer T = StringLocalizer.CreateInstance();

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
            return RenderFAB(app, app.AppGuid.Value, $"/a/apps/{app.Id}/files", pmeta.IsChildAllowed, app.HasPermission);
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
            return RenderFAB(folder, folder.ContentGuid.Value, $"/a/content/{folder.Id}/files", pmeta.IsChildAllowed, folder.HasPermission);
        }

        /// <summary>
        /// Renders the cloud picker and file upload controls.
        /// </summary>
        /// <param name="helper"></param>        
        /// <param name="multiple"></param>
        /// <param name="accept"></param>
        /// <param name="kind"></param>
        /// <param name="align"></param>
        /// <param name="cssClass"></param>
        /// <param name="htmlAttributes"></param>
        /// <returns></returns>
        public static MvcHtmlString Filebrowser(this HtmlHelper helper, bool multiple, string accept, string kind, string align = null, string cssClass = null, object htmlAttributes = null) {

            var container = new TagBuilder("div");

            // no choosers if in webview
            if (WeavyContext.Current.Browser.Mobile) {
                container.Attributes["class"] = "btn btn-icon filebrowser " + cssClass;
                container.InnerHtml = Icon("attachment").ToString();

                var input = new TagBuilder("input");
                input.AddCssClass("file-ctrl");
                input.Attributes["type"] = "file";
                input.Attributes["accept"] = accept;
                input.Attributes["data-kind"] = kind;
                input.MergeAttributes(HtmlHelper.AnonymousObjectToHtmlAttributes(htmlAttributes));

                container.InnerHtml += input.ToString();
            } else {
                container.Attributes["class"] = "btn-group dropup filebrowser " + cssClass;

                // attach button
                var button = new TagBuilder("button");
                button.AddCssClass("btn btn-icon dropdown-toggle");
                button.Attributes["type"] = "button";
                button.Attributes["data-toggle"] = "dropdown";
                button.Attributes["aria-haspopup"] = "true";
                button.Attributes["aria-expanded"] = "false";
                button.InnerHtml = Icon("attachment").ToString();

                // dropdown menu
                var menu = new TagBuilder("div");
                menu.Attributes["role"] = "menu";
                menu.AddCssClass("dropdown-menu " + align);

                // add enabled providers based on weavy.blob-providers
                foreach (var provider in ConfigurationService.BlobProviders.Split(",".ToCharArray(), StringSplitOptions.RemoveEmptyEntries)) {
                    var providerAsKebab = provider.ToKebabCase();
                    menu.InnerHtml += $@"<a class=""dropdown-item"" href=""javascript:;"" data-chooser=""{providerAsKebab}"">{Icon(providerAsKebab, "native")} {provider}</a>";
                }

                var computer = new TagBuilder("div");
                computer.AddCssClass("dropdown-item position-relative");
                if(WeavyContext.Current.Browser.Desktop) {
                    computer.InnerHtml += $"{Icon("laptop", "theme-700")} {T["Your computer"]}";
                } else {
                    computer.InnerHtml += $"{Icon("cellphone-android", "theme-700")} {T["Your device"]}";
                }

                var input = new TagBuilder("input");
                input.AddCssClass("file-ctrl");
                input.Attributes["type"] = "file";
                input.Attributes["accept"] = accept;
                input.Attributes["data-kind"] = kind;
                input.MergeAttributes(HtmlHelper.AnonymousObjectToHtmlAttributes(htmlAttributes));

                if (multiple) {
                    input.MergeAttribute("multiple", string.Empty);
                }

                computer.InnerHtml += input.ToString();
                menu.InnerHtml += computer.ToString();
                container.InnerHtml += button.ToString();
                container.InnerHtml += menu.ToString();
            }
            return MvcHtmlString.Create(container.ToString());
        }

        /// <summary>
        /// Render the FAB
        /// </summary>
        /// <param name="entity">The current entity being viewed</param>
        /// <param name="guid">The guid of the current app or content type</param>
        /// <param name="insertUrl">The url to upload loca files to</param>
        /// <param name="allowdFunc">func for checking if content is allowed</param>
        /// <param name="permissionFunc">func for checking permission</param>
        /// <returns></returns>
        private static MvcHtmlString RenderFAB(IEntity entity, Guid guid, string insertUrl, Func<Guid, bool> allowdFunc, Func<Permission, User, bool> permissionFunc) {
            var url = entity.Url();
            var container = new TagBuilder("div");
            container.Attributes["class"] = "fabs";

            // create fab
            var create = new TagBuilder("div");
            create.Attributes["class"] = "fab create dropup filebrowser";

            var createButton = new TagBuilder("button");
            createButton.AddCssClass("btn btn-round btn-primary dropdown-toggle");
            createButton.Attributes["type"] = "button";
            createButton.Attributes["title"] = T["Create"];
            createButton.Attributes["data-toggle"] = "dropdown";
            createButton.Attributes["aria-haspopup"] = "true";
            createButton.Attributes["aria-expanded"] = "false";
            createButton.InnerHtml = Icon("plus").ToString();

            var createMenu = new TagBuilder("div");
            createMenu.Attributes["role"] = "menu";
            createMenu.AddCssClass("dropdown-menu dropdown-menu-right");

            // add fab
            var add = new TagBuilder("div");
            add.Attributes["class"] = "fab add dropup filebrowser";

            var addButton = new TagBuilder("button");
            addButton.Attributes["type"] = "button";
            addButton.Attributes["title"] = T["Add file"];
            addButton.InnerHtml = Icon("attachment").ToString();

            var addMenu = new TagBuilder("div");

            // special for webview
            if (WeavyContext.Current.Browser.Mobile) {
                addButton.Attributes["class"] = "btn btn-round btn-secondary";

                var input = new TagBuilder("input");
                input.AddCssClass("file-ctrl");
                input.Attributes["type"] = "file";
                input.Attributes["accept"] = ConfigurationService.BlobWhitelist;
                input.Attributes["data-kind"] = entity.Type.ToString().ToLower();
                input.Attributes["data-insert-url"] = insertUrl;
                input.MergeAttribute("multiple", string.Empty);

                addButton.InnerHtml += input.ToString();
            } else {
                addButton.AddCssClass("btn btn-round btn-secondary dropdown-toggle");
                addButton.Attributes["data-toggle"] = "dropdown";
                addButton.Attributes["aria-haspopup"] = "true";
                addButton.Attributes["aria-expanded"] = "false";

                addMenu.Attributes["role"] = "menu";
                addMenu.AddCssClass("dropdown-menu dropdown-menu-right");
            }

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

                var createContent = new List<dynamic>();

                createContent.AddRange(allowed.Where(x => x.MetaData().CreateMode != UpsertMode.None).Select(x => new {
                    Url = x.MetaData().CreateMode == UpsertMode.Modal ? "#upsert-content-modal" : $"{url}/content/{x.ContentGuid}",
                    Param = x.ContentGuid,
                    x.MetaData().Icon,
                    x.MetaData().Color,
                    x.MetaData().Name,
                    Title = x.MetaData().CreateVerb + " " + x.MetaData().Name?.ToLower(),
                    Path = x.MetaData().CreateMode == UpsertMode.Modal ? $"{url}/content/{x.ContentGuid}" : "",
                    SortOrder = 1
                }));

                if (createContent.Any()) {
                    foreach (var c in createContent.OrderBy(x => x.SortOrder)) {
                        if (c.Url.StartsWith("#")) {
                            createMenu.InnerHtml += $@"<a class=""dropdown-item"" href=""#"" data-toggle=""modal"" data-target=""{c.Url}"" data-param=""{c.Param}"" data-path=""{c.Path}"" data-title=""{c.Title}"">{Icon(c.Icon, c.Color)} {c.Name}</a>";
                        } else {
                            createMenu.InnerHtml += $@"<a class=""dropdown-item"" href=""{c.Url}"" target=""overlay"">{Icon(c.Icon, c.Color)} {c.Name}</a>";
                        }
                    }
                }

                // MS office
                createMenu.InnerHtml += $@"<a class=""dropdown-item"" href=""#"" data-toggle=""menu"" data-target=""office"">{Icon("office", "native")} Office <span>{Icon("chevron-right")}</span></a>";
                createMenu.InnerHtml += $@"<a class=""d-none"" data-menu=""office"" href=""#""><h6 class=""dropdown-header"">{Icon("chevron-left")}Office</h6></a>";
                createMenu.InnerHtml += $@"<a class=""dropdown-item d-none"" data-menu=""office"" href=""#"" data-toggle=""modal"" data-target=""#office-modal"" data-param="".docx"" data-type=""Word"">{Icon(FileUtils.GetIcon(".docx"), "native")} Word</a>";
                createMenu.InnerHtml += $@"<a class=""dropdown-item d-none"" data-menu=""office"" href=""#"" data-toggle=""modal"" data-target=""#office-modal"" data-param="".xlsx"" data-type=""Excel"">{Icon(FileUtils.GetIcon(".xlsx"), "native")} Excel</a>";
                createMenu.InnerHtml += $@"<a class=""dropdown-item d-none"" data-menu=""office"" href=""#"" data-toggle=""modal"" data-target=""#office-modal"" data-param="".pptx"" data-type=""Powerpoint"">{Icon(FileUtils.GetIcon(".pptx"), "native")} Powerpoint</a>";

                // not available in webview or if google drive is not configured
                if (!WeavyContext.Current.Browser.Mobile && ConfigurationService.BlobProviders.Contains("Google Drive")) {
                    // google docs
                    createMenu.InnerHtml += $@"<a class=""dropdown-item"" href=""#"" data-toggle=""menu"" data-target=""google"">{Icon("google-drive", "native")} Google <span>{Icon("chevron-right")}</span></a>";
                    createMenu.InnerHtml += $@"<a class=""d-none"" data-menu=""google"" href=""#""><h6 class=""dropdown-header"">{Icon("chevron-left")}Google</h6></a>";
                    createMenu.InnerHtml += $@"<a class=""dropdown-item d-none"" data-menu=""google"" href=""#"" data-toggle=""modal"" data-target=""#google-drive-modal"" data-param=""document"" data-type=""Docs"">{Icon("file-document-box", "native")} Docs</a>";
                    createMenu.InnerHtml += $@"<a class=""dropdown-item d-none"" data-menu=""google"" href=""#"" data-toggle=""modal"" data-target=""#google-drive-modal"" data-param=""spreadsheet"" data-type=""Sheets"">{Icon("file-sheet-box", "native")} Sheets</a>";
                    createMenu.InnerHtml += $@"<a class=""dropdown-item d-none"" data-menu=""google"" href=""#"" data-toggle=""modal"" data-target=""#google-drive-modal"" data-param=""presentation"" data-type=""Slides"">{Icon("file-slide-box", "native")} Slides</a>";
                }

                // local and cloud files
                var files = new List<dynamic>();
                if (allowdFunc(typeof(File).GUID)) {
                    foreach (var p in ConfigurationService.BlobProviders.Split(",".ToCharArray(), StringSplitOptions.RemoveEmptyEntries)) {
                        files.Add(new { Url = "#", Icon = p.ToKebabCase(), Color = "native", Name = p, Provider = p.ToKebabCase(), Css = "d-desktop" });
                    }

                    if (WeavyContext.Current.Browser.Desktop) {
                        files.Add(new { Url = "upload", Icon = "laptop", Color = "theme-700", Name = T["Your computer"], Css = "" });
                    } else {
                        files.Add(new { Url = "upload", Icon = "cellphone-android", Color = "theme-700", Name = T["Your device"], Css = "" });
                    }
                }

                if (files.Any() && !WeavyContext.Current.Browser.Mobile) {
                    foreach (var c in files) {
                        if (c.Url.StartsWith("#")) {
                            addMenu.InnerHtml += $@"<a class=""dropdown-item"" href=""javascript:;"" data-chooser=""{c.Provider}"">{Icon(c.Icon, c.Color)} {c.Name}</a>";
                        } else if (c.Url == "upload") {
                            addMenu.InnerHtml += $@"<div class=""dropdown-item fab-upload"">{Icon(c.Icon, c.Color)} {c.Name}<input type=""file"" data-kind=""{entity.Type.ToString().ToLower()}"" data-insert-url=""{insertUrl}"" data-dropzone=""html"" accept=""{ConfigurationService.BlobWhitelist}"" multiple /></div>";
                        } else {
                            addMenu.InnerHtml += $@"<a class=""dropdown-item"" href=""{c.Url}"">{Icon(c.Icon, c.Color)} {c.Name}</a>";
                        }
                    }
                }
            }

            if (createMenu.InnerHtml.IsNullOrEmpty() && addMenu.InnerHtml.IsNullOrEmpty()) {
                return null;
            }

            create.InnerHtml += createButton.ToString();
            create.InnerHtml += createMenu.ToString();
            container.InnerHtml = create.ToString();

            add.InnerHtml += addButton.ToString();
            add.InnerHtml += addMenu.ToString();
            container.InnerHtml += add.ToString();

            return MvcHtmlString.Create(container.ToString());
        }
    }
}

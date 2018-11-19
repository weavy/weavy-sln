var weavy = weavy || {};

weavy.tiny = (function ($) {

    document.addEventListener("turbolinks:load", init);
    document.addEventListener("turbolinks:before-cache", destroy);

    // init tinymce
    function init() {
        //console.debug("tiny.js:init");
        tinymce.init({
            selector: '.html-editor',
            skin_url: window.tinymceSkinURL,
            plugins: 'anchor autolink codesample hr link lists media preview table textcolor wordcount weavy_paste weavy_sourcecode weavy_autocomplete weavy_image weavy_link weavy_toolbar weavy_shortcuts',
            menubar: false,
            toolbar1: 'formatselect | bold | italic | strikethrough | underline | bullist | numlist | weavy_link | weavy_image | table | alignleft | aligncenter | alignright | removeformat | toggle_toolbar',
            toolbar2: 'media | codesample | unlink |  outdent | indent | forecolor | backcolor | removeformat | help | code',
            image_advtab: true,
            formats: {
                underline: { inline: 'u' },
                strikethrough: { inline: 's' }
            },
            convert_urls: false,
            entity_encoding: "raw",
            extended_valid_elements: 'em,i[class|title]',
            paste_data_images: true,
            statusbar: false,
            upload_paste_data_images: true,
            codesample_content_css: window.tinymceCodesampleCSS,
            init_instance_callback: function (editor) {
                console.debug("tinymce initialized for '" + editor.id + "'");
            },

            setup: function (editor) {
                try {
                    document.dispatchEvent(new CustomEvent("tinymce.setup", { detail: editor }));
                } catch (e) {
                    // Deprecated, used in IE
                    var setupEvent = document.createEvent("CustomEvent");
                    setupEvent.initCustomEvent("tinymce.setup", true, true, editor);
                    document.dispatchEvent(setupEvent);
                }

                editor.on('change', function () {
                    editor.save();
                });

            }
        });

        /* Insert link - TinyMCE
        **************************************************************/
        // link to value in url field
        $(".ui-insertlink form.properties").on("submit", function (e) {
            if (editorType === "html") {
                e.preventDefault();
                e.stopPropagation();

                var form = $(this);
                var field = form.find(".form-control");
                var url = field.val();
                if (url.length > 0) {
                    var external = true;
                    if (url.indexOf("/") == 0) {
                        external = false;
                    }
                    parent.tinymce.activeEditor.windowManager.getParams().insertLink(url, url, external);
                }

                parent.tinymce.activeEditor.windowManager.close();
                return false;
            }
        });

        // cancel button
        $(".ui-insertlink form.properties .btn-secondary").on("click", function () {
            if (editorType === "html") {
                parent.tinymce.activeEditor.windowManager.close();
                return false;
            }

        });

        // link to attachment
        $(".ui-insertlink .attachments div.card").on("click", function (e) {
            if (editorType === "html") {
                parent.tinymce.activeEditor.windowManager.getParams().insertLink($(this).data("url"), $(this).data("text"), false);
                parent.tinymce.activeEditor.windowManager.close();
                return false;
            }
        });

        // link to serch result
        $(".ui-insertlink .result a").on("click", function (e) {
            if (editorType === "html") {
                e.preventDefault();
                e.stopPropagation();
                parent.tinymce.activeEditor.windowManager.getParams().insertLink($(this).attr("href"), $(this).data("text"), false);
                parent.tinymce.activeEditor.windowManager.close();
                return false;
            }
        });

        /*****************************
         * TinyMCE file/image picker *
         *****************************/
        $(".ui-insertimage input[type=file]").fileupload({
            dataType: "json",
            pasteZone: null,
            add: function (e, data) {
                var uploadErrors = []; //incentiveFileUpload.validateFileUpload(data.files, $(this).data("max-size"), $(this).data("allowed-extensions"));
                var group = $(this).closest(".form-group");
                group.find(".help-block").text("");
                group.removeClass("has-error");

                // basic check for duplicate filenames
                var existing = _.map($(".result [data-filename]"), function (f) { return $(f).data("filename") });

                _.each(data.files, function (file) {
                    if (_.contains(existing, file.name)) {
                        uploadErrors.push("There is already a file named " + file.name);
                    }
                });

                if (uploadErrors.length > 0) {
                    group.addClass("has-error");
                    group.find(".help-block").text(uploadErrors.join(" "));
                } else {
                    data.submit();
                }
            },
            progressall: function (e, data) {
                $(this).closest(".tab-content").children(".progress").css("width", parseInt(data.loaded / data.total * 100, 10) + "%").show();
            },
            done: function (e, data) {
                var group = $(this).closest(".form-group");
                group.removeClass("has-error");
                group.find(".help-block").text("");

                var container = $(".result");
                container.find(".remove").remove();

                // remove ?v= from thumburl since we don't want it here
                $.each(data.result.data, function (i, v) {
                    v.thumb_url = v.thumb_url.split('?')[0];
                });

                var html = "";
                _.each(data.result.data, function (f) {
                    html += '<div class="card mr-1" style="width: 96px;">' +
                        '<a href="javascript:;" class="thumbnail" data-name="' + f.name + '" data-file-url="' + f.file_url + '" data-thumb-url="' + f.thumb_url + '" data-width="' + f.width + '" data-height="' + f.height + '" title="' + f.name + '">' +
                        '<img src="' + f.thumb_url.replace("{options}", "96x96-crop,both") + '" alt="" />' +
                        '<div class="card-block p-1">' +
                        '<small title="' + f.name + '">' + f.name + '</small>' +
                        '<input type="hidden" name="blobs" value="' + f.id + '" />' +
                        '</div>'
                        '</a>' +
                        '</div>';
                });
                container.prepend(html);
                $("#filecount").text(container.children().length);

                setFileProperties(data.result.data[0]);
            },
            fail: function (e, data) {
                //var json = JSON.parse(data.jqXHR.responseText);
                //incentiveAlert.display(json.message);
            },
            always: function () {
                // reset progress bar
                $(this).closest(".tab-content").children(".progress").css("width", "0%").hide();
            }
        });

        if ($("#size").length > 0) {
            var url = $("input[name=url]").val()
            var width = $("input[name=width]").val()
            var height = $("input[name=height]").val()
            var sizer = $("#size button");
            sizer.removeClass("active");

            if (url.indexOf("/1024x0/") != -1) {
                sizer.eq(3).addClass("active");
            } else if (url.indexOf("/640x0/") != -1) {
                sizer.eq(2).addClass("active");
            } else if (url.indexOf("/240x0/") != -1) {
                sizer.eq(1).addClass("active");
            } else if (url.indexOf("/" + width + "x" + height + "/") != -1) {
                sizer.eq(4).addClass("active");
            }
        }

        // insert click
        $(".ui-insertimage form.properties").on("submit", function (e) {
            if (editorType === "html") {
                e.preventDefault();
                e.stopPropagation();
                var props = getFileProperties();
                if (props.url.length > 0) {
                    parent.tinymce.activeEditor.windowManager.getParams().insertImageOrDocument(props);
                }
                parent.tinymce.activeEditor.windowManager.close();
                return false;
            }
        });

        // cancel button
        $(".ui-insertimage .buttons .btn-secondary").on("click", function () {
            if (editorType === "html") {
                parent.tinymce.activeEditor.windowManager.close();
                return false;
            }
        });

        // click attachment
        $(".ui-insertimage .result").on("click", "a", function () {
            var props = new Object();
            props.name = $(this).data("name");
            props.file_url = $(this).data("file-url");
            props.thumb_url = $(this).data("thumb-url");
            props.width = $(this).data("width");
            props.height = $(this).data("height");
            setFileProperties(props);
        });

        // resize
        $(".ui-insertimage #size button").click(function (e) {
            var sizer = $("#size button").removeClass("active");
            var props = getFileProperties();
            console.log(props);
            if (/\.(png|jpg|jpeg|gif)$/i.test(props.name)) {
                var size = $(this).attr("id");
                console.log(size);
                var url = props.file_url;
                console.log(url);
                switch (size) {
                    case "small":
                        url = props.thumb_url.replace("{options}", "240x0")
                        break;
                    case "medium":
                        url = props.thumb_url.replace("{options}", "640x0")
                        break;
                    case "large":
                        url = props.thumb_url.replace("{options}", "1024x0")
                        break;
                    case "original":
                    default:
                        url = props.file_url;
                        break;
                }
                console.log(url);
                $("input[name=url]").val(convertToRelativeUrl(url));
            }
        });

        function getFileProperties() {
            var props = new Object();
            props.url = $("input[name=url]").val();
            props.description = $("input[name=alt]").val();
            props.name = $("input[name=name]").val();
            props.file_url = $("input[name=file_url]").val();
            props.thumb_url = $("input[name=thumb_url]").val();
            props.width = $("input[name=width]").val();
            props.height = $("input[name=height]").val();
            return props;
        }

        function setFileProperties(file) {
            console.log(file);

            var url = file.url || file.file_url;
            $("input[name=name]").val(file.name);
            $("input[name=url]").val(convertToRelativeUrl(url));
            $("input[name=alt]").val(file.description);
            $("input[name=file_url]").val(convertToRelativeUrl(file.file_url));
            $("input[name=thumb_url]").val(convertToRelativeUrl(file.thumb_url));
            $("input[name=width]").val(file.width);
            $("input[name=height]").val(file.height);

            // activate original size button
            $("button[name=size]").removeClass("active");
            $("button[name=size][id=original]").addClass("active");

            // select properties tab
            $("a[href='#nav-properties']").tab('show');
        }

        function convertToRelativeUrl(url) {
            if (url && url.length) {
                var rootPath = location.protocol + "//" + location.hostname + weavy.context.path;
                return url.replace(rootPath, weavy.context.path);
            } else {
                return null;
            }
        }
    }

    // destroy tinymce
    function destroy() {
        if (tinymce) {
            tinymce.remove();
        }
    }

    return {
        init: init,
        destroy: destroy
    }

})(jQuery)



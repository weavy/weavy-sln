/*global Turbolinks */
var wvy = wvy || {};

wvy.fileupload = (function ($) {

    var uploadUrl = wvy.url.resolve("/a/blobs");
    var insertExternalBlobUrl = wvy.url.resolve("/a/blobs/insert");
    var fileBrowserUrl = "https://filebrowser.weavycloud.com";

    var whenFilebrowserLoaded = $.Deferred();
    var whenGoogleInitComplete = $.Deferred();
    var whenGoogleAuthenticated = $.Deferred();
    var loadingStarted = false;
    var googleSubmitButton = "#google-drive-modal button[type=submit]";
    var $filebrowserFrame = null;

    if (wvy.turbolinks.enabled) {
        // init
        document.addEventListener("turbolinks:load", init);
    } else {
        $(document).ready(init);
    }

    // local file upload
    $(document).on("change", "input[type=file]", function () {
        var files = $(this)[0].files;

        if (files.length > 0) {
            uploadBlobs(files, $(this));
        }
    });

    // perform the actual upload
    function uploadBlobs(files, $input) {
        var $submit = $input.closest("form").find("button[type=submit]");
        var $dropzone = $input.closest($input.data("dropzone"));
        var $progress = $dropzone.find(".progress");
        var $progressBar = $progress.find(".progress-bar");

        beforeUpload($input, files).then(
            function () {
                // show progress
                $progress.removeClass("d-none");

                // add files to formdata object
                var formData = new FormData();
                $.each(files, function (i, file) {
                    formData.append("file-" + i, file);
                });

                // disable input
                $input.attr("disabled", true);
                $submit.attr("disabled", true);

                // upload blobs
                $.ajax({
                    type: "POST",
                    url: uploadUrl,
                    data: formData,
                    dataType: "json",
                    contentType: false,
                    processData: false,
                    xhr: function () {
                        var xhr = $.ajaxSettings.xhr();
                        xhr.upload.onprogress = function (e) {
                            if ($progressBar.length && e.lengthComputable) {
                                $progressBar.css("width", parseInt(e.loaded / e.total * 100, 10) + "%");
                            }
                        };
                        return xhr;
                    }
                }).done(function (response) {
                    $input.val("");
                    $progressBar.addClass("progress-bar-striped progress-bar-animated");
                    afterUpload($input, null, response.data).then(function () {
                        // reset progress
                        $progress.addClass("d-none");
                        $progressBar.removeClass("progress-bar-striped progress-bar-animated").css("width", "0%");
                    });
                }).fail(function (xhr, status, error) {
                    console.error(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : error);
                }).always(function () {
                    // activate input
                    $input.removeAttr("disabled");
                    $submit.removeAttr("disabled");
                });
            },
            function (error) {
                // cancelling upload
                console.log("Cancelling upload: " + error);
            }
        );
    }

    var loadFilebrowser = function () {
        if (!loadingStarted) {
            loadingStarted = true;

            fileBrowserUrl = wvy.config != null ? (wvy.config.fileBrowser || fileBrowserUrl) : fileBrowserUrl;
            console.debug("Using filebrowser: ", fileBrowserUrl);
            
            try {
                var origin = window.top.document.location.origin;
                $filebrowserFrame.attr("src", fileBrowserUrl + "?origin=" + origin + "&v=" + wvy.config.version + "&t=" + Date.now().toString());
            } catch (error) {
                wvy.postal.postToParent({ name: "request:origin" });
            }

            $filebrowserFrame.one("load", function () {
                console.log("filebrowser loaded");
                whenFilebrowserLoaded.resolve();
            });
        }

        return whenFilebrowserLoaded.promise();
    }

    function init() {
        whenFilebrowserLoaded = $.Deferred();
        whenGoogleInitComplete = $.Deferred();
        whenGoogleAuthenticated = $.Deferred();
        loadingStarted = false;
        $filebrowserFrame = $("#filebrowser");
    }

    // close dropup when selecting local files
    $(document).on("click", ".filebrowser.show input[type=file]", function () {
        $(this).closest(".filebrowser").find(".dropdown-toggle").dropdown("toggle");
    });

    // submit new google drive doc to filebrowser.weavycloud.com
    $(document).on("click", googleSubmitButton, function (e) {
        var type = $(this).data("type");
        var title = $("#google-drive-modal input[name=name]").val() || "New Google " + type;
        $(this).prop("disabled", true);

        loadFilebrowser().then(function () {
            whenGoogleInitComplete.then(function () {
                $filebrowserFrame[0].contentWindow.postMessage({ name: "create", title: title, type: type }, "*");
            });
        });
        return false;
    });

    // handle click on each provider when selecting adding new file from cloud provider
    $(document).on("click", "[data-chooser]", function (e) {
        var provider = $(this).data("chooser");
        var $target = $(this).parent().find("input[type=file]");

        if (!provider || $target.length === 0) {
            return;
        }

        $(".file-browser-active").removeClass("file-browser-active");
        $target.addClass("file-browser-active");

        var multiple = $target[0].hasAttribute("multiple");

        // maximize frame if Google Drive picker
        if (provider === "google-drive") {
            loadFilebrowser().then(function () {
                whenGoogleInitComplete.then(function () {
                    // show frame, but keep it hidden until user is signed in
                    $filebrowserFrame.show().addClass("invisible");

                    // don't display the frame until user has signed in seperated window
                    whenGoogleAuthenticated.then(function () {
                        $filebrowserFrame.removeClass("invisible");
                        wvy.postal.postToParent({ name: "maximize" })
                    });

                    // send message to filebrowser.weavycloud.com to open up correct picker
                    $filebrowserFrame[0].contentWindow.postMessage({ name: "open", provider: provider, multiple: multiple }, "*");
                });
            });
        } else {
            loadFilebrowser(multiple).then(function () {
                // send message to filebrowser.weavycloud.com to open up correct picker
                $filebrowserFrame[0].contentWindow.postMessage({ name: "open", provider: provider, multiple: multiple }, "*");
            });
        }
        return true;
    });

    // event handler for removing existing file from input field
    $(document).on("click", ".file-upload .clear", function (evt) {
        evt.preventDefault();

        var $upload = $(this).closest('.file-upload');
        $upload.find("input[type=hidden]").val("delete");

        var $custom = $upload.find(".custom-file-control");
        $custom.text("");

        var $img = $upload.find("img");
        $img.prop("src", $img.data("thumb"));
        $(this).addClass("d-none");

        var $svg = $upload.find("svg");
        $svg.addClass("d-none");
    });

    // handle custom link
    $(document).on("click", "#filebrowser-form button[type=submit]", function (e) {
        e.preventDefault();
        var url = $("#filebrowser-form input[name=url]").val();
        var title = $("#filebrowser-form input[name=linktitle]").val() || url;
        var embedded = $("#filebrowser-form input[name=linkembedded]").is(":checked");

        if (url !== "") {
            attach([{ url: url, title: title, embedded: embedded, guid: guid }], 'custom');
        }
    });

    // hide show custom link properties
    $(document).on("change keyup input", "#filebrowser-form input[name=url]", function (e) {
        if ($(this).val() !== "") {
            $("#filebrowser-form input[name=linktitle]").parent().removeClass("d-none");
            $("#filebrowser-form input[name=linkembedded]").parent().removeClass("d-none");
            $("#filebrowser-form button[type=submit]").prop("disabled", false);
        } else {
            $("#filebrowser-form input[name=linktitle]").parent().addClass("d-none");
            $("#filebrowser-form input[name=linkembedded]").parent().addClass("d-none");
            $("#filebrowser-form button[type=submit]").prop("disabled", true);
        }
    })

    wvy.postal.on("origin", wvy.postal.parentWeavyId, function (e) {
        // set correct origin to filebrowser.weavycloud.com. Required by Google Drive picker!
        $filebrowserFrame.attr("src", fileBrowserUrl + "?origin=" + e.data.url + "&v=" + wvy.config.version + "&t=" + Date.now().toString());
    });

    var attach = function (blobs, open) {
        var $target = $(".file-browser-active");

        if ($target.length === 0) {
            $target = $("input[type=file][data-insert-url]");
        }

        // insert external blobs
        $.ajax({
            url: insertExternalBlobUrl,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(blobs)
        }).done(function (response) {
            afterUpload($target, open ? "docs" : null, response.data);
        }).fail(function (xhr, status, error) {
            console.error(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : error);
        });
    }

    // listen to messages from filebrowser.weavycloud.com and weavy client
    window.addEventListener("message", function (e) {
        if (e.origin === fileBrowserUrl || e.data.weavyId !== undefined) {
            if (e.data.name === "addExternalBlobs") {
                // attach external blobs
                attach(e.data.blobs, e.data.open);
                $filebrowserFrame.hide();
            } else if (e.data.name === "closePicker") {
                // close Google Drive picker
                $filebrowserFrame.hide();
            } else if (e.data.name === "google-init-complete") {
                whenGoogleInitComplete.resolve();
            } else if (e.data.name === "google-user-authenticated") {
                whenGoogleAuthenticated.resolve();
            } else if (e.data.name === "google-cancelled") {
                $(googleSubmitButton).prop("disabled", false);
            }
        }
    });

    // replace existing files after uploading files to app or folder 
    $(document).on("submit", ".upload-replace", function (e) {
        e.preventDefault();
        var $form = $(this);
        var $alert = $(this).closest(".alert");
        var action = $(this).attr("action");
        var ids = $(this).find("input[name=blobs]").val().split(',').map(function (val) { return Number(val); });

        $.ajax({
            url: action,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(ids)
        }).done(function (data, status, xhr) {
            var url = $form.data("refresh-url");
            var $target = $($form.data("refresh-target"));

            if (url && $target.length) {
                $.get(wvy.url.resolve(url), function (html) {
                    $target.html(html);
                });
            } else {
                Turbolinks.visit(location.toString(), { action: "replace" })
            }
        }).fail(function (xhr, status, error) {
            var json = JSON.parse(xhr.responseText);
            wvy.alert.warning(json.message);
        }).always(function () {
            $alert.alert('close');
        });
    });

    // skip existing files after upload to app or folder
    $(document).on("click", ".upload-skip", function (e) {
        $(this).closest(".alert").alert('close');

        if ($(this).data("uploaded") > 0) {

            // refresh page to display uploaded files
            var url = $(this).data("refresh-url");
            var $target = $($(this).data("refresh-target"));

            if (url && $target.length) {
                $.get(wvy.url.resolve(url), function (html) {
                    $target.html(html);
                });
            } else {
                Turbolinks.visit(location.toString(), { action: "replace" })
            }
        }
    });

    // before blob is uploaded
    var beforeUpload = function ($input, files) {
        return new Promise(function (resolve, reject) {
            var kind = $input.data("kind");

            if (kind) {
                switch (kind) {
                    case "note":
                        var result = wvy.notesUI.blobExists($input, files);

                        if (result == null) {
                            resolve();
                        } else {
                            reject(result);
                        }
                }
            }
            resolve();
        });
    }

    // after blob is uploaded
    var afterUpload = function ($input, kind, blobs) {
        return new Promise(function (resolve, reject) {
            var type = kind || $input.data("kind");
            if (type) {
                switch (type) {
                    case "thumb":
                        $.ajax({
                            url: wvy.url.resolve("/a/blobs/" + blobs[0].id),
                            method: "GET",
                            contentType: "application/json"
                        }).then(function (response) {
                            var $container = $input.closest(".file-upload");
                            $container.find("input[type=hidden]").val(response.id);
                            $container.find(".clear").removeClass("d-none");
                            $container.find(".custom-file-control").text(response.name);
                            if (response.thumb) {
                                $container.find("img").removeClass("d-none").prop("src", response.thumb.replace("{options}", "256-crop"));
                            }
                            resolve();
                        });
                        break;
                    case "single-file":
                        var $control = $input.closest(".file-upload");
                        $control.find(".form-control").attr("placeholder", blobs[0].name);
                        $control.find("input[type=hidden]").val(blobs[0].id);
                        resolve()
                        break;
                    case "messenger":
                        wvy.messenger.showUploadedBlobs(blobs).then(function () {
                            resolve()
                        });
                        break;
                    case "posts":
                        wvy.posts.showUploadedBlobs($input, blobs).then(function () {
                            resolve()
                        });
                        break;
                    case "app":
                    case "docs":
                    case "content":
                        var insertUrl = $input.data("insert-url");
                        var blobIds = _.map([].concat(blobs), function (i) { return i.id });

                        // create files from blobs
                        $.ajax({
                            url: insertUrl,
                            method: "POST",
                            contentType: "application/json",
                            data: JSON.stringify(blobIds)
                        }).then(function (response) {
                            if (response.conflict_alert) {
                                wvy.alert.warning(response.conflict_alert);
                            } else if (response.inserted) {
                                Turbolinks.visit(window.location.toString(), { action: "replace" })
                            }
                            resolve();
                        });
                        break;
                    case "attach":
                        var attachUrl = $input.data("attach-url");
                        var blobIds = _.map([].concat(blobs), function (i) { return i.id });

                        // create attachments from blobs
                        $.ajax({
                            url: attachUrl,
                            method: "POST",
                            contentType: "application/json",
                            data: JSON.stringify(blobIds)
                        }).then(function (response) {
                            if (response.conflict_alert) {
                                // pass on needed refresh parameters
                                var $alert = $(response.conflict_alert);
                                $alert.find(".upload-replace").attr("data-refresh-url", $input.data("refresh-url")).attr("data-refresh-target", $input.data("refresh-target"));
                                $alert.find(".upload-skip").attr("data-refresh-url", $input.data("refresh-url")).attr("data-refresh-target", $input.data("refresh-target"));
                                wvy.alert.warning($alert.html());
                            } else if (response.attached) {

                                // items has been attached
                                var refreshUrl = $input.data("refresh-url");
                                var $refreshTarget = $($input.data("refresh-target"));

                                if (refreshUrl && $refreshTarget.length) {
                                    $.get(wvy.url.resolve(refreshUrl), function (html) {
                                        $refreshTarget.html(html);
                                        resolve();
                                    });
                                } else {
                                    // refresh entire page
                                    Turbolinks.visit(window.location.toString(), { action: "replace" })
                                    resolve();
                                }
                            } else {
                                resolve();
                            }
                        });
                        break;
                    case "note":
                        wvy.notesUI.appendBlob($input, blobs).then(function () {
                            resolve()
                        });
                        break;
                    default:
                        resolve();
                }
            }
        });
    };

    return {
        uploadBlobs: uploadBlobs
    }

})(jQuery);

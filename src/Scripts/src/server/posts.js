var wvy = wvy || {};

wvy.posts = (function ($) {

    // init editors on load
    document.addEventListener("turbolinks:load", function () {
        
        // initializing editor is very slow so we wrap the call in setTimeout to prevent blocking rendering
        setTimeout(function () {
            // create post editor
            var $postEditor = $("[data-editor='post']");
            if ($postEditor.length) {

                $postEditor.siblings(".weavy-editor-placeholder").hide();
                $postEditor.weavyEditor({
                    accept: wvy.config.blobWhitelist,
                    minimized: true,
                    onSubmit: function (e, data) {
                        var $editor = $(this);
                        var $form = $editor.closest("form");

                        // simple check to see that post contains any data
                        var json = $form.serializeObject(false);
                        if (json.text || json.html || json.blobs || json.embeds || json.meetings) {

                            // check meetings authentication            
                            if (json.meetings) {
                                var auth = $("a[data-meeting-authenticated='0']");

                                if (auth.length) {
                                    wvy.alert.info(wvy.t("Please sign in to the meeting provider before you submit the post!"), 3000)
                                    return false;
                                }
                            }

                            // remove .is-invalid
                            $form.removeClass("is-invalid");

                            // display "fake" post
                            $form.addClass("sending");

                            // disable submit button
                            $form.find("button[type=submit]").prop("disabled", true);

                            // submit form
                            $form.submit();

                            // reset editor
                            $editor.weavyEditor("reset");
                        } else {
                            $form.addClass("is-invalid");
                            $form.find("button[type=submit]").prop("disabled", false);
                        }
                    }
                });
            }
        }, 1);
    });

    // destroy editors
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor='post']").weavyEditor("destroy");
    });

    // populate feedback modal with fresh data
    function updateFeedback(id) {
        var $post = $("[data-post-id='" + id + "']");
        if (!$post.length) return;

        $.ajax({
            url: wvy.url.resolve("/posts/" + id + "/feedback"),
            method: "GET",
            contentType: "application/json"
        }).then(function (html) {
            $post.find(".card-feedback").html(html);
        });
    }

    // bind events
    wvy.comments.on("insert", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    wvy.comments.on("get", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    wvy.comments.on("trash", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    wvy.comments.on("restore", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    $(document).on("click", "[data-remove-attachment]", function (e) {
        e.preventDefault();
        var attachmentId = $(this).data("remove-attachment");
        $("#removedAttachments").append("<input type='hidden' name='removedAttachments' value='" + attachmentId + "'/>");
        $(this).parent().parent().remove();
    });

    // toogle visibility of post comments
    $(document).on("click", "[data-toggle=comments]", function (e) {
        e.preventDefault();

        var $post = $(this).closest(".post");
        var $comments = $post.find(".post-comments");
        var id = $post.data("post-id");

        if ($comments.find(".comment").length) {
            // show/hide existing comments
            $comments.toggleClass("d-none");
        } else {
            if ($comments.hasClass("d-none")) {
                wvy.comments.getComments(id, "post", true);
            } else {
                $comments.addClass("d-none");
            }
        }
    });

    // like post
    $(document).on("click", "[data-post-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("post-like");

        // REVIEW: show spinner during ajax call?
        wvy.api.like("post", id).then(function () {
            updateFeedback(id);
        });
    });

    // unlike post
    $(document).on("click", "[data-post-unlike]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("post-unlike");

        // REVIEW: show spinner during ajax call?
        wvy.api.unlike("post", id).then(function () {
            updateFeedback(id);
        });
    });

    // trash post
    $(document).on("click", "[data-trash=post][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        wvy.api.trash("post", id).then(function () {
            $("[data-type=post][data-id=" + id + "]").slideUp("fast");
            wvy.alert.alert("success", wvy.t("Post was trashed.") + " <button type='button' class='btn btn-link alert-link' data-restore='post' data-id='" + id + "'>" + wvy.t("Undo") + "</button>.", 5000, "alert-trash-post-" + id);
        });
    });

    // restore post
    $(document).on("click", "[data-restore=post][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        wvy.api.restore("post", id).then(function () {
            $("[data-type=post][data-id=" + id + "]").slideDown("fast");
            wvy.alert.alert("success", wvy.t("Post was restored."), 5000, "alert-trash-post-" + id);
        });
    });

    // vote for a poll option
    $(document).on("change", ".poll input[type=radio]", function (evt) {
        evt.preventDefault();
        var radio = $(this);
        var form = radio.closest("form");
        var url = wvy.url.resolve(form[0].action + "/" + radio.val());
        var poll = form.closest(".poll");

        if (!poll.hasClass("loading")) {
            $.ajax({
                url: url,
                type: "POST",
                beforeSend: function (xhr, settings) {
                    // animate progressbar(s)
                    poll.addClass("loading");
                    $(".progress-bar", poll).css("width", "100%");
                },
                success: function (html, status, xhr) {
                    poll.replaceWith(html);
                },
                error: function (xhr, status, error) {
                    var json = JSON.parse(xhr.responseText);
                    console.error(json.message);
                }
            });
        }
    });

    // rtm post
    wvy.connection.default.on("post-inserted.weavy", function (e, post) {
        // check that app of post is loaded
        if (wvy.context.app && wvy.context.app === post.appId) {

            // do nothing if no posts on page
            var $posts = $(".posts");
            if (!$posts.length) {
                return;
            }

            // do nothing if .sending
            if ($(".post-form").hasClass("sending")) {
                return;
            }

            // do nothing if already exists
            var $post = $(".post[data-post-id=" + post.id + "]", $posts);
            if ($post.length) {
                return;
            }

            // fetch and display partial post 
            $.ajax({
                contentType: "application/json; charset=utf-8",
                type: "GET",
                url: wvy.url.resolve((wvy.context.embedded ? "/e" : "") + "/posts/" + post.id)
            }).then(function (post) {
                var $post = $(".post[data-post-id=" + post.id + "]", $(".posts"));
                if ($post.length === 0) {
                    $(post).prependTo($posts);
                }
            });
        }
    });

    // rtm like post
    wvy.connection.default.on("like.weavy", function (e, liked) {
        if (liked.type === 'post') {
            updateFeedback(liked.id);
        }
    });

    // rtm unlike post
    wvy.connection.default.on("unlike.weavy", function (e, unliked) {
        if (unliked.type === 'post') {
            updateFeedback(unliked.id);
        }
    });

    // feedback details modal (likes, votes etc.)
    $(document).on("show.bs.modal", "#feedback-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.data("modal-title");

        // clear modal content and show spinner
        var $modal = $(this);
        var $spinner = $(".spinner", $modal).addClass("spin").show();
        var $body = $(".modal-body", $modal).empty();
        $(".modal-title", $modal).text(title);

        $.ajax({
            url: wvy.url.resolve(path),
            type: "GET"
        }).then(function (html) {
            $body.html(html);
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
    });

    // load edit post modal
    $(document).on("show.bs.modal", "#edit-post-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.attr("title");

        // clear show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        var $spinner = $(".spinner", $div).addClass("spin");
        $(".modal-title", $div).text(title);
        $div.removeClass("d-none");

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);

            $("#edit-post-modal [data-editor=post]").weavyEditor({
                accept: wvy.config.blobWhitelist,
                collapsed: true,
                pickerCss: 'collapsed-static',
                submitButton: $form.find("button[type=submit]"),
                onSubmit: function (e, d) {
                    e.preventDefault();
                    $(this).closest("form").submit();
                }
            });
            $div.addClass("d-none");
        }).always(function () {
            // stop spinner
            $spinner.removeClass("spin");
        });
    });

    $(document).on("hide.bs.modal", "#edit-post-modal", function (e) {
        $("#edit-post-modal [data-editor=post]").weavyEditor("destroy");
    });

    // update post
    $(document).on("submit", "#edit-post-modal form.modal-content", function (e) {
        e.preventDefault();
        var $form = $(this);
        var data = $form.serializeObject();

        // fix poll options for ajax post
        var indices = data["options.Index"];

        if (indices) {
            if (!$.isArray(indices)) {
                var optId = indices;
                indices = [];
                indices[0] = optId;
            }

            data["options"] = [];
            indices.map(function (i, index) {
                var id = data["options[" + i + "].Id"];
                data["options"].push({ id: id, text: data["options[" + i + "].Text"] })
                delete data["options[" + i + "].Text"];
                delete data["options[" + i + "].Id"];
            });
            delete data["options.Index"];
        }
        
        // fetch modal content from server
        $.ajax({
            contentType: "application/json; charset=utf-8",
            url: $form.attr("action"),
            type: "PUT",
            data: JSON.stringify(data)
        }).then(function (html) {            
            if (typeof (html) === "string") {
                // must remove editor before binding the new one
                $("#edit-post-modal [data-editor=post]").weavyEditor("destroy");
                $form.replaceWith(html);

                $("#edit-post-modal [data-editor=post]").weavyEditor({
                    accept: wvy.config.blobWhitelist,
                    collapsed: true,
                    pickerCss: 'collapsed-static',
                    submitButton: $form.find("button[type=submit]"),
                    onSubmit: function (e, d) {
                        e.preventDefault();
                        $(this).closest("form").submit();
                    }
                });
            } else {
                window.location.replace(html.Data.Redirect);
            }
        });
    });

    // load move form
    $(document).on("show.bs.modal", "#move-post-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.attr("title");

        // clear show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        var $spinner = $(".spinner", $div).addClass("spin");
        $(".modal-title", $div).text(title);
        $div.removeClass("d-none");

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);

            $div.addClass("d-none");
        }).always(function () {
            // stop spinner
            $spinner.removeClass("spin");
        });
    });

    var showUploadedBlobs = function ($input, blobs) {
        return new Promise(function (resolve, reject) {
            // call server to get partial html for uploaded files
            var qs = "?" + blobs.map(function (x) { return "ids=" + x.id; }).join("&");
            $.get(wvy.url.resolve("/content/blobs" + qs), function (html) {
                $input.closest(".weavy-editor").find(".uploads .table-attachments").append(html);
                resolve();
            });
        });
    }

    return {
        updateFeedback: updateFeedback,
        showUploadedBlobs: showUploadedBlobs
    }
})(jQuery);

var wvy = wvy || {};

wvy.posts = (function ($) {

    // init edit post editor
    document.addEventListener("turbolinks:load", function () {
        var $editor = $("[data-editor-location='post-edit']").weavyEditor({
            mode: 'fixed',
            onSubmit: function (e, d) {
                e.preventDefault();
                $(this).closest("form").submit();
            }
        });
        $editor.weavyEditor("focus");
    });

    // destroy edit post editor
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor-location='post-edit']").weavyEditor("destroy");
    });

    // insert post
    function insertPost(e, data, editor) {
        e.preventDefault();
        var $editor = $(editor);
        var $form = $editor.closest("form");
        var $button = $form.find("button[type='submit']");
        data = $form.serializeObject();
        var method = "POST";
        var url = wvy.url.resolve($form.attr("action"));

        // disable submit button
        $button.prop("disabled", true);

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
                data["options"].push({ id: 0, text: data["options[" + i + "].Text"] })
                delete data["options[" + i + "].Text"];
                delete data["options[" + i + "].Id"];
            });
            delete data["options.Index"];
        }

        // make sure blobs is an array
        if (data.blobs) {
            if (!$.isArray(data.blobs)) {
                var id = data.blobs;
                data.blobs = [];
                data.blobs[0] = id;
            }
        }

        // insert temporary post
        var $container = $(".posts");
        $("<div class='card post fake-post'>" +
            "<div class='card-header media'>" +
            "<div class='fake-user'></div>" +
            "<div class='media-title'><div class='fake-text fake-text-50'></div>" +
            "<div class='fake-text fake-text-25'></div></div>" +
            "</div>" +
            "<div class='card-body'>" +
            "<div class='fake-text'></div>" +
            "<div class='fake-text fake-text-50'></div>" +
            "<div class='fake-text fake-text-75'></div>" +
            "</div>" +
            "</div> ").prependTo($container);

        // reset form
        $form.removeClass("is-invalid");
        $editor.weavyEditor('reset');

        // insert post
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: method || "POST",
            url: url,
            data: JSON.stringify(data)
        }).then(function (post) {
            // NOTE: insert from rtm for now, see if we can find a better/faster solution later

            // reset form
            $editor.weavyEditor('reset');
        }).fail(function () {
            $form.addClass("is-invalid");

            $(".fake-post").remove();
        }).always(function () {
            $button.prop("disabled", false);
        });
    }

    // update post feedback partial view
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

    // like post
    $(document).on("click", "[data-post-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("post-like");

        // REVIEW: show spinner during ajax call?
        wvy.api.like("post", id).then(function () {
            var $post = $el.closest(".post");
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
            var $post = $el.closest(".post");
            updateFeedback(id);
        });
    });

    // trash post
    $(document).on("click", "[data-trash=post][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        wvy.api.trash("post", id).then(function () {
            $("[data-type=post][data-id=" + id + "]").slideUp("fast");
            wvy.alert.alert("success", "Post was trashed. <button type='button' class='btn btn-link alert-link' data-restore='post' data-id='" + id + "'>Undo</button>.", 5000, "alert-trash-post-" + id);
        });
    });

    // restore post
    $(document).on("click", "[data-restore=post][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        wvy.api.restore("post", id).then(function () {
            $("[data-type=post][data-id=" + id + "]").slideDown("fast");
            wvy.alert.alert("success", "Post was restored.", 5000, "alert-trash-post-" + id);
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
    wvy.realtime.on("post-inserted.weavy", function (e, post) {
        var uid = post.createdBy.id;

        // do nothing of we are displaying another space
        if (wvy.context.space !== post.spaceId) {
            return;
        }

        // do nothing if no posts on page
        var $posts = $(".posts");
        if (!$posts.length) {
            return;
        }

        // do nothing if already exists
        var $post = $("div[data-type=post][data-id='" + post.id + "']", $posts);
        if ($post.length) {
            return;
        }

        // fetch and display partial post 
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: "GET",
            url: wvy.url.resolve("/posts/" + post.id)
        }).then(function (post) {
            // remove fake post if rtm post created by current user
            if (wvy.context.user === uid) {
                $(".fake-post:last", $posts).remove()
            }

            $(post).prependTo($posts);
        });

    });

    // rtm like post
    wvy.realtime.on("like.weavy", function (e, liked) {
        if (liked.type === 'post') {
            updateFeedback(liked.id);
        }
    });

    // rtm unlike post
    wvy.realtime.on("unlike.weavy", function (e, unliked) {
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

    // load edit form
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

            $("[data-editor-location='post-edit']").weavyEditor({
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
                $form.replaceWith(html);

                $("[data-editor-location='post-edit']").weavyEditor({
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

    return {
        insert: insertPost,
        updateFeedback: updateFeedback
    }
})(jQuery);

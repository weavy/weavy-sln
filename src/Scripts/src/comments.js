var weavy = weavy || {};
weavy.comments = (function ($) {

    if (weavy.turbolinks.enabled) {
        // edit comment editor
        document.addEventListener("turbolinks:load", init);

        // destroy editors
        document.addEventListener("turbolinks:before-cache", function () {
            $("[data-editor-location='comment-edit']").weavyEditor("destroy");
            $(".weavy-editor").next("textarea.comments-form").weavyEditor("destroy");
        });
    } else {
        $(document).ready(init);
    }

    function init() {
        $("[data-editor-location='comment-edit']").weavyEditor({
            polls: false,            
            mode: 'fixed',
            onSubmit: function (e, data) {
                e.preventDefault();
                $(this).closest("form").submit();
            }
        });

        // any visible comment editors
        initCommentEditor($("textarea.comments-form:visible"));
    }

    // init comment editor
    function initCommentEditor($el) {
        if ($el.length === 0) return;
        
        $el.weavyEditor({
            context: weavy.browser.embedded,
            collapsed: true,
            embeds: false,
            polls: false,
            placeholder: 'Your comment...',
            onSubmit: function (e, d) {
                insertComment(e, d, this);
                $(this).closest("form").find("#contextUrl").attr("disabled", true);
            },
            onContextChange: function (e, data) {
                var $editor = $(this);                
                $editor.closest("form").find("input[name=hasContext]").val(data.has_context);
            }
        });
    }

    // insert comment
    var insertComment = function (e, d, editor) {
        e.preventDefault();
        var $editor = $(editor);

        var $form = $editor.closest("form");
        var $button = $form.find("button[type='submit']");

        // entity specific
        var entityType = $form.data("entity-type");
        var entityId = $form.data("entity-id");
        var $commentsContainer = $form.parent().find($form.data("comments-container"));

        var data = $form.serializeObject(true);
        data["text"] = d.text;

        var method = "POST";
        var url = weavy.url.resolve($form.attr("action"));

        // disable submit button
        $button.prop("disabled", true);

        // make sure blobs is an array
        if (data.blobs) {
            if (!$.isArray(data.blobs)) {
                var id = data.blobs;
                data.blobs = [];
                data.blobs[0] = id;
            }
        }

        var type = data.type;
        data.parent = { type: type, id: data.id };
        delete data.type;
        delete data.id;

        // insert temporary comment
        $("<div class='list-group-item comment fake-comment'>" + 
            "<div class='media'>" + 
                "<div class='fake-user'></div>" +
                "<div class='media-body'>" +
                    "<div class='fake-text fake-text-75'></div>" +
                    "<div class='fake-text fake-text-25'></div>" +
                "</div>" +
            "</div>" + 
            "</div>").appendTo($commentsContainer);

        // reset form
        $editor.weavyEditor('reset');

        // insert comment
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: method,
            url: url,
            data: JSON.stringify(data)
        }).then(function () {
            // trigger insert event
            triggerEvent("insert", { entityType: entityType, entityId: entityId });
            // NOTE: the UI is updated by the RTM connection
            //// update comment list
            //$.ajax({
            //    url: weavy.url.mvc(entityType) + entityId + "/comments",
            //    method: "GET",
            //    cache: false,
            //    contentType: "application/json"
            //}).then(function (html) {
            //    triggerEvent("insert", { entityType: entityType, entityId: entityId });
            //});            
        }).fail(function () {
            $(".fake-comment").remove();
        }).always(function () {
            $button.prop("disabled", false);
        });
    };

    // update comment feedback partial view
    var updateCommentFeedback = function (id) {
        
        var $comment = $("[data-comment-id='" + id + "']");
        if (!$comment.length) return;
        
        $.ajax({
            url: weavy.url.mvc("comment") + id + "/feedback",
            method: "GET",
            cache: false,
            contentType: "application/json"
        }).then(function (html) {            
            $comment.find(".comment-feedback").html(html);
        });
    };

    // get comments for an entity, i.e. post or content
    function getComments(id, type, expand) {

        // check if the entity is present on the page
        var selector = "[data-type=" + type + "][data-id=" + id + "]";
        var $entity = $(selector)
        if ($entity.length === 0) {
            return false;
        }
        
        var $div = $(selector + " ." + type + "-comments");
        var $spinner = $(".spinner", $div);

        // init weavy editor (if needed)               
        if (!$(selector + " .comments-form.emojionearea").length) {
            initCommentEditor($(selector  + " .comments-form"));
            if (focus) {
                $(selector + " textarea.comments-form").weavyEditor("focus");
            }

            // check for context
            if (weavy.browser.embedded) {
                weavy.urlContext.check();
            }            
        }

        // start and show spinner
        if (expand) {
            $spinner.addClass("spin");
            $div.removeClass("d-none");
        }

        $.ajax({
            url: weavy.url.mvc(type) + id + "/comments",
            method: "GET",
            cache: false
        }).then(function (html) {
            // remove spinner
            $spinner.remove();

            // replace comments
            $(".comments", $div).html(html);
            triggerEvent("get", { entityType: type, entityId: id });
        });
                
    }

    // attach an event handler
    function on(event, handler) {
        $(document).on(event + ".comments.weavy", null, null, handler);
    }

    function triggerEvent(name, json) {
        name = name + ".comments.weavy";
        var event = $.Event(name);

        $(document).triggerHandler(event, json);
    }


    // get comments on a post (maybe move this post specific function to posts.js?)
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
                getComments(id, "post", true);
            } else {
                $comments.addClass("d-none");
            }
        }
    });

    // like comment
    $(document).on("click", "[data-comment-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-like");

        // REVIEW: show spinner during ajax call?
        weavy.api.like("comment", id).then(function () {
            var $comment = $el.closest(".card-comment");
            updateCommentFeedback(id);
        });
    });

    // unlike comment
    $(document).on("click", "[data-comment-unlike]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-unlike");

        // REVIEW: show spinner during ajax call?
        weavy.api.unlike("comment", id).then(function () {
            var $comment = $el.closest(".card-comment");
            updateCommentFeedback(id);
        });
    });

    // trash comment
    $(document).on("click", "[data-comment-trash]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-trash");
        var $comment = $("[data-comment-id='" + id + "']")
        var parentId = $comment.data("parent-id");
        var parentEntity = $comment.data("parent-entity");

        weavy.api.trash("comment", id).then(function () {
            $comment.slideUp("fast")
            weavy.alert.alert("success", "Comment was trashed. <a class='alert-link' href='#' data-comment-restore='" + id + "' data-parent-id='" + parentId + "' data-parent-entity='" + parentEntity + "'>Undo</a>", 5000, "alert-comment-trash-" + id);
            triggerEvent("trash", { entityType: parentEntity, entityId: parentId });

        });
    });

    // restore comment
    $(document).on("click", "[data-comment-restore]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-restore");
        var $comment = $("[data-comment-id='" + id + "']")
        var parentId = $el.data("parent-id");
        var parentEntity = $el.data("parent-entity");

        weavy.api.restore("comment", id).then(function () {
            $comment.slideDown("fast")
            weavy.alert.alert("success", "Comment was restored.", 5000, "alert-comment-trash-" + id);
            triggerEvent("restore", { entityType: parentEntity, entityId: parentId });

        });
    });

    // rtm comment
    weavy.realtime.on("comment", function (e, comment) {

        // do nothing if already exists
        if ($("div[data-comment-id='" + comment.id + "']").length !== 0) return;

        // TODO: get specific comment and add it instead of reloading all
        getComments(comment.parent.id, comment.parent.type, false);
    });

    // rtm like comment
    weavy.realtime.on("likecomment", function (e, comment, user) {        
        updateCommentFeedback(comment.id)
    });

    // rtm unlike comment
    weavy.realtime.on("unlikecomment", function (e, comment, user) {        
        updateCommentFeedback(comment.id)
    });

    // load edit form
    $(document).on("show.bs.modal", "#edit-comment-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.attr("title");

        // clear show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        var $title = $(".modal-title", $div).text(title);
        var $spinner = $(".spinner", $div).addClass("spin");
        $div.removeClass("d-none");

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET",
            cache: false
        }).then(function (html) {
            
            $form.replaceWith(html);

            var $editor = $("[data-editor-location='comment-edit']").weavyEditor({
                collapsed: true,
                embeds: false,
                polls: false,
                pickerCss: 'collapsed-static',
                placeholder: 'Your comment...',
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

    return {
        on: on,
        initCommentEditor: initCommentEditor
    }

})(jQuery)

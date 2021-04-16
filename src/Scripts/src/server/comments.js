var wvy = wvy || {};
wvy.comments = (function ($) {

    if (wvy.turbolinks.enabled) {
        // edit comment editor
        document.addEventListener("turbolinks:load", init);

        // destroy editors
        document.addEventListener("turbolinks:before-cache", function () {
            $(".weavy-editor").next("textarea.comments-form").weavyEditor("destroy");
        });
    } else {
        $(document).ready(init);
    }

    function init() {
        // initializing editor is very slow so we wrap the call in setTimeout to prevent blocking rendering
        wvy.whenLoaded.then(function () {
            setTimeout(function () {
                console.log("comments.js:init");

                // any visible comment editors
                initCommentEditor($("body.controller-posts textarea.comments-form:visible, body:not(.controller-posts) textarea.comments-form"));
            }, 1);
        })
    }

    // init comment editor
    function initCommentEditor($el) {
        if ($el.length === 0) return;

        $el.siblings(".weavy-editor-placeholder").hide();
        $el.weavyEditor({
            accept: wvy.config.blobWhitelist,
            collapsed: true,
            embeds: false,
            polls: false,
            placeholder: wvy.t('Your comment...'),
            onSubmit: function (e, d) {
                insertComment(e, d, this);
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


        // check meetings authentication            
        if (data.meetings) {
            var auth = $("a[data-meeting-authenticated='0']");

            if (auth.length) {
                wvy.alert.info(wvy.t("Please sign in to the meeting provider before you submit the comment!"), 3000)
                return false;
            }
        }

        if (!wvy.config.htmlComments) {
            data["text"] = d.text !== "" ? d.text: null;
            delete data.html;
        }
        
        var method = "POST";
        var url = wvy.url.resolve($form.attr("action"));

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

        // make sure meetings is an array
        if (data.meetings) {
            if (!$.isArray(data.meetings)) {
                var id = data.meetings;
                data.meetings = [];
                data.meetings[0] = id;
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
            //    url: wvy.url.mvc(entityType) + entityId + "/comments",
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
            url: wvy.url.mvc("comment") + id + "/feedback",
            method: "GET",
            cache: false,
            contentType: "application/json"
        }).then(function (html) {            
            $comment.find(".comment-feedback").html(html);
        });
    };

    // get comments for an entity and update ui with result
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
        }

        // start and show spinner
        if (expand) {
            $spinner.addClass("spin");
            $div.removeClass("d-none");
        }

        $.ajax({
            url: (wvy.context.embedded ? "/e" : "") + wvy.url.mvc(type) + id + "/comments",
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

    // like comment
    $(document).on("click", "[data-comment-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-like");

        // REVIEW: show spinner during ajax call?
        wvy.api.like("comment", id).then(function () {
            //var $comment = $el.closest(".card-comment");
            updateCommentFeedback(id);
        });
    });

    // unlike comment
    $(document).on("click", "[data-comment-unlike]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-unlike");

        // REVIEW: show spinner during ajax call?
        wvy.api.unlike("comment", id).then(function () {
            //var $comment = $el.closest(".card-comment");
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

        wvy.api.trash("comment", id).then(function () {
            $comment.slideUp("fast")
            wvy.alert.alert("success", wvy.t("Comment was trashed.") + " <a class='alert-link' href='#' data-comment-restore='" + id + "' data-parent-id='" + parentId + "' data-parent-entity='" + parentEntity + "'>" + wvy.t("Undo") + "</a>", 5000, "alert-comment-trash-" + id);
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

        wvy.api.restore("comment", id).then(function () {
            $comment.slideDown("fast")
            wvy.alert.alert("success", wvy.t("Comment was restored."), 5000, "alert-comment-trash-" + id);
            triggerEvent("restore", { entityType: parentEntity, entityId: parentId });

        });
    });

    // rtm comment
    wvy.connection.default.on("comment-inserted.weavy", function (e, comment) {

        // do nothing if already exists
        if ($("div[data-comment-id='" + comment.id + "']").length !== 0) return;

        // TODO: get specific comment and add it instead of reloading all
        getComments(comment.parent.id, comment.parent.type, false);
    });

    // rtm like comment
    wvy.connection.default.on("like.weavy", function (e, liked) {       
        if (liked.type === 'comment') {
            updateCommentFeedback(liked.id);
        }
    });

    // rtm unlike comment
    wvy.connection.default.on("unlike.weavy", function (e, unliked) {        
        if (unliked.type === 'comment') {
            updateCommentFeedback(unliked.id);
        }
    });

    // load edit form
    $(document).on("show.bs.modal", "#edit-comment-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");

        // clear show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        var $spinner = $(".spinner", $div).addClass("spin");
        $div.removeClass("d-none");

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET",
            cache: false
        }).then(function (html) {            
            $form.replaceWith(html);

            $("[data-editor=comment]", $modal).weavyEditor({
                accept: wvy.config.blobWhitelist,
                collapsed: true,
                embeds: false,
                polls: false,
                pickerCss: 'collapsed-static',
                placeholder: wvy.t('Your comment...'),
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
    $(document).on("submit", "#edit-comment-modal form.modal-content", function (e) {
        e.preventDefault();
        var $form = $(this);
        var data = $form.serializeObject();

        // fetch modal content from server
        $.ajax({
            contentType: "application/json; charset=utf-8",
            url: $form.attr("action"),
            type: "PUT",
            data: JSON.stringify(data)
        }).then(function (html) {
            if (typeof (html) === "string") {
                // must remove editor before binding the new one
                $("#edit-comment-modal [data-editor=comment]").weavyEditor("destroy");
                $form.replaceWith(html);

                $("#edit-comment-modal [data-editor=comment]").weavyEditor({
                    accept: wvy.config.blobWhitelist,
                    collapsed: true,
                    embeds: false,
                    polls: false,
                    pickerCss: 'collapsed-static',
                    placeholder: wvy.t('Your comment...'),
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

    $(document).on("hide.bs.modal", "#edit-comment-modal", function (e) {
        var $modal = $(this);
        $("[data-editor=comment]", $modal).weavyEditor("destroy");
    });

    return {
        on: on,
        initCommentEditor: initCommentEditor,
        getComments: getComments
    }

})(jQuery)

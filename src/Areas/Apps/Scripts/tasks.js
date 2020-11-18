var wvy = wvy || {};

wvy.tasks = (function ($) {

    // app guid of tasks app
    const tasksGuid = "f1c835b0-e2a7-4cf3-8900-fe95b6504145";

    var _textarea = null;
    var _detailsTextarea = null;
    var _hideCompleted = false;

    //**********************************************
    //* init on page load
    //**********************************************
    document.addEventListener("turbolinks:load", function () {
        if ($(".controller-tasks").length) {
            _hideCompleted = $(this).data("hide-completed");

            $(".controller-tasks .fab").removeClass("d-none");
            sort();

            var $textarea = $(".controller-tasks textarea#taskname")
            initEditor($textarea, _textarea, true);

            if (window.location.hash) {
                var hash = window.location.hash.substring(1);
                var taskId = hash.split("-")[1];
                $(".task-item[data-id='" + taskId + "'] .task").trigger("click");
            }
        }
    });

    //**********************************************
    //* cleanup when navigating away
    //**********************************************
    document.addEventListener("turbolinks:before-cache", function () {
        _textarea = null;
        $(".emojionearea").remove();
    });

    var initEditor = function ($el, ta, handleSubmit) {
        // remove required attribute to avoid 'An invalid form control with name="" is not focusable.'
        $el.removeAttr("required");

        $el.emojioneArea({
            attributes: {
                dir: "ltr",
                spellcheck: true,
                autocomplete: "on",
                autocorrect: "on",
                autocapitalize: "on"
            },

            imageType: "svg",
            searchPlaceholder: wvy.t("Search..."),
            shortcuts: false,
            textcomplete: {
                maxCount: 10
            },
            tones: true,
            tonesStyle: "bullet",
            useInternalCDN: false,
            events: {
                // hide emoji picker on ESC
                keydown: function (editor, evt) {
                    var key = evt.which || evt.keyCode;
                    if (key === 27) {
                        if (ta) {
                            evt.preventDefault();
                            ta.hidePicker();
                        }
                    }
                },
                // submit on enter or ctrl+enter depending on settings
                keypress: function (editor, evt) {
                    var key = evt.which || evt.keyCode;
                    if ((key === 10 || key === 13) && handleSubmit) {
                        evt.preventDefault();
                        editor.blur(); // blur to update underlying textarea

                        var text = $("#taskname").val();
                        submitTask(text);
                        ta.setText("");
                        ta.setFocus();
                    }
                },

                ready: function (editor, evt) {
                    editor.textcomplete([{
                        match: /\B@([a-zA-Z0-9_]+)$/,
                        search: function (term, callback) {
                            $.getJSON(wvy.url.resolve("/a/autocomplete/mentions"), {
                                q: term,
                                top: 5
                            }).done(function (resp) {
                                callback(resp);
                            }).fail(function () {
                                callback([]);
                            });

                        },
                        index: 1,
                        template: function (item) {
                            var html = '<img class="img-24 avatar mr-1" src="' + wvy.url.thumb(item.thumb, "48") + '" alt="" /><span>' + (item.name || item.username);
                            if (item.username) {
                                html += ' <small>@' + item.username + '</small>';
                            }
                            if (item.directory) {
                                html += ' <span class="badge badge-success">' + item.directory + '</small>';
                            }
                            html += "</span>";
                            return html;
                        },
                        replace: function (mention) {
                            return '@' + mention.username + " ";
                        },
                        cache: false
                    }]);
                }
            }
        });

        // get the textarea (which is now an emojionearea)
        ta = $el[0].emojioneArea;
    }

    //**********************************************
    //* make list sortable
    //**********************************************
    var sort = function () {

        var updateSortOrder = function (e, ui) {
            //ui.item contains the current dragged element.                        
            $.ajax({
                url: wvy.url.resolve('/apps/' + wvy.context.app + '/' + tasksGuid + '/tasks/sort'),
                data: $(".task-item").map(function () {
                    return "ids=" + $(this).data("id");
                }).get().join("&"),
                method: 'POST'
            });
        }

        // unbind all existing events and destroy existing sortable
        $('.controller-tasks .task-list').sortable().unbind('sortupdate');
        $('.controller-tasks .task-list').sortable('destroy');

        // set list as sortable
        $('.controller-tasks .task-list').sortable({
            forcePlaceholderSize: true
        }).bind('sortupdate', updateSortOrder);
    }

    //**********************************************
    //* submit a new task from top input field
    //**********************************************
    var submitTask = function (text) {
        if (!text.length) return false;

        var d = {
            name: text
        };

        $.ajax({
            url: wvy.url.resolve("/apps/" + wvy.context.app + "/" + tasksGuid + "/tasks"),
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(d)
        }).then(function (response) {
            $("#taskname").val("");
            $(".list-empty").hide();
            $(".toggle-hide").show();
        });
    }

    //**********************************************
    //* load modal
    //**********************************************
    var loadModalContent = function (path, title, $modal) {
        // clear show and start spinner

        $("form", $modal).parent().remove();
        var $div = $("div.modal-content", $modal);
        var $spinner = $(".spinner", $div).addClass("spin").removeClass("d-none");
        $(".modal-title", $div).text(title);

        var $body = $(".modal-body-content", $modal);

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET"
        }).then(function (html) {
            $body.html(html);

            initComponents($body);

            // stop spinner
            $spinner.removeClass("spin").addClass("d-none");
        });
    }

    //**********************************************
    //* init components in modal
    //**********************************************
    var initComponents = function ($body) {

        // init emojione
        var $textarea = $("#Name", $body);
        initEditor($textarea, _detailsTextarea, false);

        // init comments
        wvy.comments.initCommentEditor($("textarea.comments-form", $body));

        // init user picker
        var picker = wvy.userspicker.init("select[data-role='user-picker']");
        picker.on("change", function () {
            $("#AssignedTo").val(this.value);
        });
    }

    //**********************************************
    //* submit modal form as ajax
    //**********************************************
    var submitModalFormData = function ($form, data, $submit, stayInModal) {

        var $modal = $form.closest(".modal");
        var $body = $(".modal-body-content", $modal);

        var url = $submit && $submit.attr("formaction") || $form.attr("action");
        var method = $submit && $submit.attr("formmethod") || $form.attr("method");

        $.ajax({
            url: wvy.url.resolve(url),
            type: method,
            data: data
        }).then(function (response) {

            var $html = $(response);
            // TODO: find better way of detecting validation errors
            if ($html.find(".is-invalid").length !== 0 || stayInModal) {
                $body.html(response);
                initComponents($body);
            } else {
                Turbolinks.visit(window.location.href);
            }
        }).fail(function (xhr, status, error) {
            var json = JSON.parse(xhr.responseText);
            wvy.alert.danger(json.message);

        }).always(function () {
            $("button[type='submit']").prop("disabled", false);
        });
    }

    //**********************************************
    //* set completed state for a task
    //**********************************************
    var setCompleted = function (taskId, completed) {
        var $el = $(".task-item input[data-task-id='" + taskId + "']");

        if (completed) {
            $el.prop("checked", true);
            $el.closest(".task-item").addClass("list-group-item-success");
            $el.closest(".task-item").find(".due-date").addClass("d-none");
            toggleTaskVisibility($("[data-hide-completed]").data("hide-completed"));
        } else {
            $el.prop("checked", false);
            $el.closest(".task-item").removeClass("list-group-item-success");
            $el.closest(".task-item").find(".due-date").removeClass("d-none");
        }
    }

    //**********************************************
    //* set hide completed status
    //**********************************************
    var toggleHideCompleted = function ($btn) {
        $btn.data("hide-completed", _hideCompleted);
        $btn.html(_hideCompleted ? wvy.t("Show completed") : wvy.t("Hide completed"));

        toggleTaskVisibility();
    }

    var toggleTaskVisibility = function () {
        var $completed = $(".task-item input[data-task-id]:checked");

        if (_hideCompleted) {
            $completed.closest(".task-item").addClass("hidden");
        } else {
            $completed.closest(".task-item").removeClass("hidden");
        }
    }

    //**********************************************
    //* submit task
    //**********************************************
    $(document).on("click", "#createTaskForm button.btn-icon", function (e) {
        var text = $("#taskname").val();
        var _ta = $(".controller-tasks textarea#taskname")[0].emojioneArea;

        submitTask(text);

        _ta.setText("");
        _ta.setFocus();
    });

    //**********************************************
    //* toggle completed
    //**********************************************
    $(document).on("click", ".task-item .btn-checkbox", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.cancelBubble = true;

        var $checkbox = $("[type=checkbox]", $(this));
        if ($checkbox.prop("checked")) {
            $checkbox.prop("checked", false);
        } else {
            $checkbox.prop("checked", true);
        }

        var taskId = $checkbox.data("task-id");
        var completed = $checkbox.is(":checked");
        setCompleted(taskId, completed);

        $.ajax({
            url: wvy.url.resolve("/apps/" + wvy.context.app + "/" + tasksGuid + "/tasks/" + taskId + "/completed?completed=" + completed),
            method: "POST",
            contentType: "application/json"
        })
    })

    //**********************************************
    //* toggle hide completed
    //**********************************************
    $(document).on("click", "[data-hide-completed]", function (e) {
        e.preventDefault();

        _hideCompleted = !$(this).data("hide-completed");

        toggleHideCompleted($(this));

        $.ajax({
            url: wvy.url.resolve("/apps/" + wvy.context.app + "/" + tasksGuid + "/tasks/hide?hide=" + _hideCompleted),
            method: "POST",
            contentType: "application/json"
        })
    })

    //**********************************************
    //* modal close
    //**********************************************
    $(document).on("hide.bs.modal", "#task-details-modal", function (e) {
        $("textarea.comments-form").weavyEditor("destroy");
    });

    //**********************************************
    //* modal show
    //**********************************************
    $(document).on("show.bs.modal", "#task-details-modal", function (e) {
        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.attr("title") || wvy.t("Task details");

        loadModalContent(path, title, $(this));
    });

    //**********************************************
    //* form submit on modal based content
    //**********************************************
    $(document).on("submit", "#task-details-modal form.modal-content", function (e) {
        e.preventDefault();

        var $form = $(this);
        var data = $form.serialize();

        // check if we have exactly one submit button, in that case include the name and value of the button
        var $submits = $form.find("[type=submit][name][value]");
        if ($submits.length === 1) {
            var $submit = $($submits[0]);
            data = data + "&" + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));
            submitModalFormData($form, data, $submit);
        } else {
            submitModalFormData($form, data);
        }

        return false;
    });

    //**********************************************
    //* trash task
    //**********************************************
    $(document).on("click", "[data-trash=task][data-id]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = this.dataset.id;
        wvy.api.trash("content", id).then(function () {
            $("[data-type=content][data-id=" + id + "]").slideUp("fast");
            wvy.alert.alert("success", wvy.t("Task was trashed.") + " <button type='button' class='btn btn-link alert-link' data-restore='task' data-id='" + id + "'>" + wvy.t("Undo") + "</button>.", 5000, "alert-trash-content-" + id);
        });
    });

    //**********************************************
    //* restore task
    //**********************************************
    $(document).on("click", "[data-restore=task][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        wvy.api.restore("content", id).then(function () {
            $("[data-type=content][data-id=" + id + "]").slideDown("fast");
            wvy.alert.alert("success", wvy.t("Task was restored."), 5000, "alert-trash-content-" + id);
        });
    });

    //**********************************************
    //* realtime events
    //**********************************************
    wvy.connection.on("content-inserted.weavy", function (e, task) {
        if (wvy.context.appGuid === tasksGuid && wvy.context.app === task.appId) {
            
            // fetch html for task and prepend to the list
            $.get(wvy.url.resolve("/apps/" + wvy.context.app + "/" + tasksGuid + "/tasks/" + task.id)).then(function (html) {
                if ($(".task-item[data-id='" + task.id + "']").length > 0) return;                
                var $inserted = $(html);
                $(".task-list").prepend($inserted);
                wvy.drop.initSingle($inserted.find("input[type=file]"));
                sort();
            })
        }
    });

    wvy.connection.on("content-updated.weavy", function (e, task) {
        if (wvy.context.appGuid === tasksGuid && wvy.context.app === task.appId) {
            var $existing = $(".task-item[data-id=" + task.id + "]");
            if ($existing.length) {
                // fetch updated html for task
                $.get(wvy.url.resolve("/apps/" + wvy.context.app + "/" + tasksGuid + "/tasks/" + task.id)).then(function (html) {
                    var $updated = $(html);
                    if ($updated.hasClass("list-group-item-success") && _hideCompleted) {
                        $updated.addClass("hidden");
                    }                   
                    $existing.replaceWith($updated);
                    wvy.drop.initSingle($updated.find("input[type=file]"));
                    sort();
                })
            }
        }
    });
})(jQuery);

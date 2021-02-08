/*global Turbolinks */
var wvy = wvy || {};
wvy.content = (function ($) {

    // app guid of files app
    const filesGuid = "523edd88-4bbf-4547-b60f-2859a6d2ddc1";

    // load rename modal
    $(document).on("show.bs.modal", "#rename-modal", function (e) {
        var target = $(e.relatedTarget);
        var $modal = $(this);
        $("form", $modal).attr("action", target.attr("href"));
        $(".modal-title", $modal).text(target.data("title"));
        $("input[name=Name]", $modal).removeClass("is-invalid").val(target.attr("data-name"));
    });

    // submit rename form
    $(document).on("submit", "#rename-modal form", function (e) {
        e.preventDefault();
        var $form = $(this);
        var $modal = $(this).closest(".modal");
        $.ajax({
            url: $form.attr("action"),
            type: $form.attr("method") || "PUT",
            data: $form.serialize()
        }).done(function (data) {
            // close modal (ui is updated via realtime event)
            $modal.modal("hide");
        }).fail(function (xhr, status, error) {
            // display error
            var json = JSON.parse(xhr.responseText);
            $(".invalid-feedback", $form).text(json.message);
            $("input[name=Name]", $form).addClass("is-invalid");
        }).always(function () {
            // re-enable submit button
            $("[type=submit]", $form).prop("disabled", false).attr("data-loading", "");
        });

    });

    // submit navbar form for renaming content in files app
    $(document).on("submit", ".app-" + filesGuid + " #navbar-rename-form", function (e) {
        e.preventDefault();
        var $form = $(this);
        var $input = $("input[name=Name]", $form);
        $.ajax({
            url: $form.attr("action"),
            type: $form.attr("method") || "PUT",
            data: $form.serialize()
        }).done(function (data) {
            // update value
            $input.attr("value", data.name);
        }).fail(function (xhr, status, error) {
            // reset value
            $input.val($input.attr("value"));
            // log error
            var json = JSON.parse(xhr.responseText);
            console.warn(json.message);
        }).always(function () {
            $input.trigger("input").blur();
        });
    });

    // update UI when content in files app is inserted
    wvy.connection.on("content-inserted.weavy", function (e, content) {
        if (wvy.context.appGuid === filesGuid && wvy.context.app === content.appId && wvy.context.content === content.parent) {

            // insert item in card view or table
            var $existing = $("[data-id=" + content.id + "][data-content-guid=" + content.guid + "]");
            if ($existing.length) {
                // content already exists
            } else {
                var $target = $("#infinite-scroll-target");
                if ($target.length) {
                    var layout = $target.hasClass("content-cards") ? "card" : "table";
                    $.get(wvy.url.resolve("/content/" + content.id + "/partial?layout=" + layout), function (html) {
                        // inject new content item with the correct sort order given prev/next
                        var $html = $(html);
                        var prev = $html.data("prev");
                        var next = $html.data("next");

                        if (prev) {
                            var $prev = $("[data-id=" + prev + "][data-content-guid]", $target);
                            $html.insertAfter($prev);
                        } else if (next) {
                            var $next = $("[data-id=" + next + "][data-content-guid]", $target);
                            $html.insertBefore($next);
                        } else {
                            $("p.empty").remove();
                            $html.appendTo($target);
                        }
                        // init drag/drop behavior
                        wvy.drag.initElement($html[0]);
                    });
                }
            }
        }

    });

    // update UI when content in files app is updated
    wvy.connection.on("content-updated.weavy", function (e, content) {
        if (wvy.context.appGuid === filesGuid) {

            // update item in card view or table
            var $existing = $("[data-id=" + content.id + "][data-content-guid=" + content.guid + "]");
            if ($existing.length) {
                var layout = $existing.hasClass("card") ? "card" : "table";
                $.get(wvy.url.resolve("/content/" + content.id + "/partial?layout=" + layout), function (html) {
                    // replace existing markup and hook up event handlers for drag and drop
                    var $html = $(html);
                    $existing.replaceWith($html);
                    wvy.drag.initElement($html[0]);
                });
            }

            // update .navbar-form for renaming content
            $(".navbar-form[action='/content/" + content.id + "/rename'] input[name=Name]").attr("value", content.name).val(content.name).trigger("input");

            // update "Rename" menu item in navbar dropdown menu
            $(".navbar-icons .dropdown-item[href='/content/" + content.id + "/rename']").attr("data-name", content.name);

            // TODO: find other stuff that should also be updated
        }
    });

    // update UI when content in files app is trashed
    wvy.connection.on("content-trashed.weavy", function (e, content) {
        if (wvy.context.appGuid === filesGuid) {
            // remove item in card view or table
            var $existing = $("[data-id=" + content.id + "][data-content-guid=" + content.guid + "]");
            if ($existing.length) {
                $existing.remove();
            }
        }
    });

    // update UI when content in files app is restored
    wvy.connection.on("content-restored.weavy", function (e, content) {
        if (wvy.context.appGuid === filesGuid) {
            // add item in card view or table
            var $existing = $("[data-id=" + content.id + "][data-content-guid=" + content.guid + "]");
            if (!$existing.length) {
                var $target = $("#infinite-scroll-target");
                if ($target.length) {
                    var layout = $target.hasClass("content-cards") ? "card" : "table";

                    $.get(wvy.url.resolve("/content/" + content.id + "/partial?layout=" + layout), function (html) {
                        // inject new content item with the correct sort order given prev/next
                        var $html = $(html);
                        var prev = $html.data("prev");
                        var next = $html.data("prev");
                        if (prev) {
                            var $prev = $("[data-id=" + prev + "][data-content-guid]", $target);
                            $html.insertAfter($prev);
                        } else if (next) {
                            var $next = $("[data-id=" + next + "][data-content-guid]", $target);
                            $html.insertBefore($next);
                        }
                        // init drag/drop behavior
                        wvy.drag.initElement($html[0]);
                    });
                }
            }

        }
    });

    // load move content form
    $(document).on("show.bs.modal", "#move-content-modal", function (e) {

        var $target = $(e.relatedTarget);
        var path = $target.data("path");
        var title = $target.attr("title");

        // clear modal-content, show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        $(".modal-title", $div).text(title);
        var $spinner = $(".spinner", $div).addClass("spin");
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

    // populate content picker when space/app is selected
    $(document).on("change", ".app-picker[data-content-picker]", function (e) {
        var $appPicker = $(this);
        var $contentPicker = $("#" + $appPicker.data("content-picker"));
        var sourceid = $contentPicker.data("source");
        var url = sourceid ? "/ui/content/" + sourceid + "/move?appid=" + $appPicker.val() : "ui/apps/" + $appPicker.val() + "/attach";

        // fetch select options for folder picker from server
        $.ajax({
            url: wvy.url.resolve(url),
            type: "GET"
        }).then(function (html) {
            $contentPicker.html(html);
        });

    });

    // modal shown for modal based content
    $(document).on("show.bs.modal", "#upsert-content-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.data("title");

        // clear modal content and show spinner
        var $modal = $(this);
        $(".modal-title", $modal).text(title);
        var $spinner = $(".spinner", $modal).addClass("spin").show();
        var $body = $(".modal-body", $modal).empty();

        $.ajax({
            url: wvy.url.resolve(path),
            type: "GET"
        }).then(function (html) {
            $body.html(html);
            $body.find("input").filter(':visible:first').focus();
            $body.find("input[data-role=tagsinput], select[multiple][data-role=tagsinput]").tagsinput();
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
    });

    // modal shown for edit tags
    $(document).on("show.bs.modal", "#edit-tags-modal", function (e) {
        var $target = $(e.relatedTarget);
        var $modal = $(this);
        var $tagsInput = $modal.find("[data-role=tagsinput]");
        var $form = $modal.find("form");
        var tags = $target.data("tags").split(",");

        $form.attr("action", wvy.url.resolve("/a/content/" + $target.data("id") + "/tags"));
        $form.data("id", $target.data("id"));

        $tagsInput.tagsinput("removeAll");

        for (var i = 0; i < tags.length; i++) {
            $tagsInput.tagsinput("add", tags[i]);
        }
        $tagsInput.tagsinput("refresh");
    });

    // form submit on modal based content
    $(document).on("submit", "#edit-tags-modal form", function (e) {
        e.preventDefault();
        var $form = $(e.target);
        var tags = $form.find("[data-role=tagsinput]").val();

        $.ajax({
            url: wvy.url.resolve($form.attr("action")),
            type: "put",
            data: JSON.stringify({ Tags: tags }),
            contentType: "application/json"
        }).then(function (response) {
            $("[data-target='#edit-tags-modal'][data-id='" + $form.data("id") + "']").data("tags", typeof (response.tags) === "undefined" ? "" : response.tags.join(","));
            $("#edit-tags-modal").modal("hide");
        });
    });

    // modal shown for view tags
    $(document).on("show.bs.modal", "#view-tags-modal", function (e) {
        var $target = $(e.relatedTarget);
        var $modal = $(this);
        var tags = $target.data("tags").split(",").filter(function (x) { return x != ""; });
        var $modalBody = $modal.find(".modal-body");
        $modalBody.empty();

        for (var i = 0; i < tags.length; i++) {
            $modalBody.append("<span class='badge badge-primary badge-large mr-1 mb-2'>" + tags[i] + "</span>");
        }
    });

    // focus first input on modal shown
    $(document).on("shown.bs.modal", "#upsert-content-modal", function (e) {
        var $modal = $(this);
        var $body = $(".modal-body", $modal);
        $body.find("input").filter(':visible:first').focus();
    });

    $(document).on("click", "#upsert-content-modal form [type=submit][name][value]", function (e) {
        e.preventDefault();

        // serialize form
        var $submit = $(this);
        var $form = $submit.closest("form");
        var data = $form.serialize();

        // add button name and value
        if ($submit.attr("name") && $submit.attr('value')) {
            data = data + (data.length === 0 ? "" : "&") + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));
        }

        // submit form with data
        submitModalFormData($form, data, $submit);
    });

    // form submit on modal based content
    $(document).on("submit", "#upsert-content-modal form", function (e) {
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

    var submitModalFormData = function ($form, data, $submit) {
        var $modal = $form.closest(".modal");
        var $body = $(".modal-body", $modal);

        var url = $submit && $submit.attr("formaction") || $form.attr("action");
        var method = $submit && $submit.attr("formmethod") || $form.attr("method");

        $.ajax({
            url: wvy.url.resolve(url),
            type: method,
            data: data
        }).then(function (response) {
            var $html = $(response);
            // REVIEW: find better way of detecting validation errors?
            if ($html.find(".is-invalid").length !== 0) {
                $body.html(response);
            } else {
                Turbolinks.visit(window.location.href);
            }
        }).fail(function (xhr, status, error) {
            var json = JSON.parse(xhr.responseText);
            wvy.alert.danger(json.message);
        }).always(function () {
            // re-enable submit button
            // REVIEW: is this needed, does not look like the button is ever disabled?
            $("button[type=submit]", $form).prop("disabled", false);
        });
    }

    // image preview zoom
    $(document).on("click", ".content-image", function (e) {
        var $img = $(this);
        if ($img.hasClass("zoom")) {

            $img.removeClass("zoom");
            $img.css("transform", "");
            $img.css("transform-origin", "");
            setTimeout(function () {
                if (!$img.hasClass("zoom")) {
                    $("html").removeClass("block-scroll");
                }
            }, 201);
        } else {
            if (!$img.hasClass("intrinsic-image")) {
                $("html").addClass("block-scroll");

                var scale = $img.css("--height") / $img.outerHeight();
                var clickX = (e.clientX - $img.offset().left) / $img.outerWidth();
                var clickY = (e.clientY - $img.offset().top) / $img.outerHeight();

                $img.addClass("zoom");
                $img.css("transform", "scale(" + scale + ")");
                $img.css("transform-origin", clickX * 100 + "% " + clickY * 100 + "%");
            }
        }
    });

    // overlay handling
    $(document).on("show.bs.tab", ".content-drawer-header .nav-tabs .nav-link", function (e) {
        $(this).addClass("prevent-toggle");
    });

    $(document).on("shown.bs.tab", ".content-drawer-header .nav-tabs .nav-link", function (e) {
        $(this).removeClass("prevent-toggle");
    });

    $(document).on("click", ".content-drawer-header .nav-tabs .nav-link", function (e) {
        if (!$(".content-drawer").hasClass("show-y") || !$(this).hasClass("prevent-toggle")) {
            $(".content-drawer").toggleClass("show-y");
            $(this).blur();
        }

        if (!$(".content-drawer").hasClass("show-x") || !$(this).hasClass("prevent-toggle")) {
            $(".content-drawer").toggleClass("show-x");
            $(this).blur();
        }
    });

    $(document).on("click", ".content-drawer-header .nav-tabs .nav-close", function (e) {
        e.preventDefault();
        if ($(".content-drawer").hasClass("show-y")) {
            $(".content-drawer").removeClass("show-y");
            $(this).blur();
        }

        if ($(".content-drawer").hasClass("show-x")) {
            $(".content-drawer").removeClass("show-x");
            $(this).blur();
        }
    });

    wvy.postal.on("close", function (e, message) {
        $("body.controller-content video, body.controller-content audio, body.controller-attachment video, body.controller-attachment audio").each(function () {
            this.pause();
        });
    });

    $(document).on("turbolinks:before-cache", function () {
        $("body.controller-content video, body.controller-content audio, body.controller-attachment video, body.controller-attachment audio").each(function () {
            this.pause();
            this.removeAttribute("autoplay");
            this.setAttribute("preload", "none");
            //this.classList.remove("loaded");
        });
    });

    function triggerIframeFallback() {
        setTimeout(function () {
            $("object.loading").addClass("fallback");
        }, 2500)
    }

    // Show fallback instead of spinner when loading embedded content iframes
    $(document).on("turbolinks:load", triggerIframeFallback);
    $(triggerIframeFallback);

    // submit form from navbar (new/edit content)
    $(document).on("click", "[data-trigger] [data-name='operation']", function (e) {
        // trigger click
        $("[name='" + $(this).data("name") + "'][value='" + $(this).data("value") + "']").click();
    });

    // discard transient draft and close overlay
    $(document).on("click", "button[data-discard][data-href]", function (e) {
        e.preventDefault();
        var $that = $(this);
        var url = $that.data("href");

        if (url != null && url.length > 0) {
            $.ajax({
                url: url,
                method: "DELETE"
            }).done(function (data) {
                wvy.postal.postToParent({ name: "request:close" });
                // reload with redirect url if we are not in an overlay
                Turbolinks.visit($that.data("redirect"));
            }).fail(function (xhr, status, error) {
                var json = JSON.parse(xhr.responseText);
                wvy.alert.warning(json.message);
            });
        }
    });

    // update invisible span so that form-control is resized
    $(document).on("input", ".form-group.autosize input.form-control", function (e) {
        $(this).siblings("span.form-control").text($(this).val())
    });

    // enable rename form in navbar when input field is focused
    $(document).on("focus", "#navbar-rename-form input.form-control", function (e) {
        $(this.form).find("[type=submit]").prop("disabled", false);
    });

    // reset rename form on esc
    $(document).on("keyup", "#navbar-rename-form input.form-control", function (e) {
        if (e.which === 27) { // esc
            $(this).val($(this).attr("value")).trigger("input").blur();
        }
    });

    // submit rename form when input loses focus
    $(document).on("blur", "#navbar-rename-form input.form-control", function (e) {
        // submit form (if name changed)        
        var $input = $(this);
        if ($input.attr("value") !== $input.val()) {            
            $(this.form).submit();
        }

        // disable submit button
        $(this.form).find("[type=submit]").prop("disabled", true);
    });

    // copy value from input field to field with same name in another form
    $(document).on("input", "[data-form]", function (e) {
        var $input = $(this);
        var $form = $($input.data("form"));
        if ($form.length) {
            $form.find('[name="' + $input[0].name + '"]').val($input.val()).trigger("change");
        }
    });

})(jQuery);


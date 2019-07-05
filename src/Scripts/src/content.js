/*global Turbolinks */
var wvy = wvy || {};
wvy.content = (function ($) {

    // load move content form
    $(document).on("show.bs.modal", "#move-content-modal", function (e) {

        var $target = $(e.relatedTarget);
        var path = $target.data("path");
        var title = $target.attr("title");

        // clear modal-content, show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        var $title = $(".modal-title", $div).text(title);
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
        var action = target.data("action");
        var title = target.data("title");

        // clear modal content and show spinner
        var $modal = $(this);
        var $title = $(".modal-title", $modal).text(title);
        var $spinner = $(".spinner", $modal).addClass("spin").show();
        var $body = $(".modal-body", $modal).empty();

        $.ajax({
            url: wvy.url.resolve(path),
            type: "GET"
        }).then(function (html) {
            $body.html(html);
            $body.find("input").filter(':visible:first').focus();
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
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
            // TODO: find better way of detecting validation errors
            if ($html.find(".is-invalid").length !== 0) {
                $body.html(response);
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
})(jQuery);


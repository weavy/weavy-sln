/*global Turbolinks */

wvy = wvy || {};

wvy.modal = (function ($) {

    document.addEventListener("turbolinks:before-cache", function (e) {
        // hide modals
        $(".modal.show").removeClass("show").hide();
        $(".modal-backdrop").remove();
        $("html").removeClass("modal-open");
    });

    // load modal for ajax content
    $(document).on("show.bs.modal", "#ajax-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
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
            focusFirst($body);
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
    });

    // focus first element on modal shown
    $(document).on("shown.bs.modal", "#ajax-modal", function (e) {
        focusFirst($(this).find(".modal-body"));
    });

    // Submit button click
    $(document).on("click", "#ajax-modal form:not([data-turboform]) [type=submit][name][value]", function (e) {
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
    $(document).on("submit", "#ajax-modal form:not([data-turboform])", function (e) {
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

    function focusFirst(context) {
        var $context = $(context);
        var $focusable = $context.find('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').filter(':visible:first');

        $focusable.focus();

        if ($focusable.is("input")) {
            $focusable.select();
        }
    }


    function submitModalFormData($form, data, $submit) {
        var $modal = $form.closest(".modal");
        var $body = $(".modal-body", $modal);

        var url = wvy.url.resolve($submit && $submit.attr("formaction") || $form.attr("action"));
        var method = $submit && $submit.attr("formmethod") || $form.attr("method");

        var xhr = new XMLHttpRequest();

        $.ajax({
            url: url,
            type: method,
            data: data,
            cache: false,
            xhr: function () {
                // Use custom xhr to be able to read final location (xhr.responseURL)
                return xhr;
            }
        }).done(function (response) {
            var redirectLocation = !wvy.url.equal(xhr.responseURL, url) && xhr.responseURL;

            if (redirectLocation) {
                Turbolinks.visit(redirectLocation);
            } else {
                var invalid = response.match(/.invalid-feedback/gm);

                if (invalid && invalid.length > 0) {
                    $body.html($(response));
                    focusFirst($body);
                } else {
                    Turbolinks.visit(window.location.href, { action: "replace" });
                }
            }

        }).fail(function (jqXhr, status, error) {
            var json = JSON.parse(jqXhr.responseText);
            wvy.alert.danger(json.message);

        }).always(function () {
            $("button[type='submit']").prop("disabled", false);
        });
    }

    return {
        open: open
    };

})(jQuery);

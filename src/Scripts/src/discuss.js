var wvy = wvy || {};
wvy.discuss = (function ($) {

    // init post editor
    document.addEventListener("turbolinks:load", function () {
        $("[data-editor-location='discuss']").weavyEditor({
            minimized: true,
            onSubmit: function (e, data) {
                var $editor = $(this);
                var $form = $editor.closest("form");

                // simpe check to see that post contains any data
                var json = $form.serializeObject(false);
                if (json.text || json.blobs || json.embeds) {

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
    });

    // destroy editors
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor-location='discuss']").weavyEditor("destroy");
    });

})(jQuery);

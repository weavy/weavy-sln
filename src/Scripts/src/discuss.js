var wvy = wvy || {};
wvy.discuss = (function ($) {

    // init post editor
    document.addEventListener("turbolinks:load", function () {
        $("[data-editor-location='discuss']").weavyEditor({
            minimized: true,
            context: wvy.browser.embedded,
            onClick: function (e, wrapper) {
                $(".post-form").addClass("focused");
                wrapper.addClass("active");
            },
            onSubmit: function (e, data) {
                $(".post-form").removeClass("focused");
                data.wrapper.removeClass("active");
                wvy.posts.insert(e, data, this);
                $(this).closest("form").find("#contextUrl").attr("disabled", true);
            },
            onContextChange: function (e, data) {
                $(".post-form").find("input[name=hasContext]").val(data.hasContext);
            }
        });
    });

    // destroy editors
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor-location='discuss']").weavyEditor("destroy");
        $(".post-form").removeClass("focused");
    });

    // backdrop click
    $(document).on("click touchend", ".post-backdrop", function (e) {
        e.preventDefault();
        $(".post-form").removeClass("focused");
    });

})(jQuery);

var wvy = wvy || {};

(function ($) {
    // disable button when clicked
    $(document).on("click", ".btn-load", function () {
        var $btn = $(this);
        setTimeout(function () { $btn.attr("disabled", "").attr("data-loading", ""); }, 1);
    });

    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-loading]").removeAttr("disabled").removeAttr("data-loading");
    });
})(jQuery);

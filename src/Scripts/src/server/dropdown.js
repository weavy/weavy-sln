var wvy = wvy || {};

(function ($) {

    $(document).on("show.bs.dropdown", ".dropdown-backdrop", function (e) {
        $("html").addClass("backdrop");
    });

    $(document).on("hidden.bs.dropdown", ".dropdown-backdrop", function (e) {
        $("html").removeClass("backdrop");
    });

    document.addEventListener("turbolinks:before-cache", function (e) {
        // close all dropdown menus
        $('.dropdown-menu').removeClass("show");
    });
})(jQuery);

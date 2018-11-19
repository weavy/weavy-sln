var weavy = weavy || {};

(function ($) {
    // disable button when clicked
    $(document).on("click", ".btn-load", function () {
        var $btn = $(this);
        setTimeout(function () { $btn.attr("disabled", "").attr("data-loading", ""); }, 1);
    });

    //document.addEventListener("turbolinks:load", function () {
    //    // init ripple effect on .btn-icon and elements with class .waves-effect
    //    Waves.attach(".btn-icon:not(.btn-badge):not(.no-waves)");
    //    Waves.init();
    //});

    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-loading]").removeAttr("disabled").removeAttr("data-loading");
        //Waves.calm(".waves-effect");
        //$(".waves-ripple").remove();
    });

})(jQuery);

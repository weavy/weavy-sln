var wvy = wvy || {};

wvy.theme = (function ($) {

    // triggered when the theme changes
    wvy.connection.default.on("theme-changed.weavy", function (e, data) {
        $("body").removeClass(function (i, cssClass) {
            return (cssClass.match(/(^|\s)weavy-theme-\S+/g) || []).join(' ');
        });

        if (data.theme && data.theme.length > 0) {
            $("body").addClass("weavy-theme-" + data.theme);
        }
    });

})(jQuery);

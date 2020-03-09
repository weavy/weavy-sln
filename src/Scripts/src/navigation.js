/*global Turbolinks */
var wvy = wvy || {};
wvy.navigation = (function ($) {
    // trapping embedded navigation 

    var currentUrl = null;
    document.addEventListener("turbolinks:before-visit", function (e) {
        if (wvy.context.embedded) {
            var url = e.data.url;

            // Prevent navigation loop
            if (currentUrl !== url) {
                // cancel event to prevent navigation
                e.preventDefault();

                $.get(wvy.url.resolve("/a/click?url=" + encodeURIComponent(url))).done(function (route) {
                    var noApp = wvy.context.app && !route.app;
                    var noAppMatch = route.app && wvy.context.app !== route.app.id;
                    //var noSpace = wvy.context.space && !route.space;
                    //var noSpaceMatch = route.space && wvy.context.space !== route.space.id;

                    //if (noApp || noAppMatch || noSpace || noSpaceMatch) {
                    if (noApp || noAppMatch) {
                        currentUrl = null;
                        wvy.postal.postToParent({ name: "navigation-open", route: route });
                    } else {
                        // normal navigation
                        currentUrl = url;
                        Turbolinks.visit(url);
                    }
                });
            } else {
                // Follow through the navigation and reset state
                currentUrl = null;
            }
        }
    });
})(jQuery);

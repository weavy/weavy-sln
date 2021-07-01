/*global Turbolinks */
var wvy = wvy || {};
wvy.navigation = (function ($) {
    // trapping embedded navigation 

    var currentUrl = null;

    wvy.postal.whenLeader().then(function (isLeader) {
        if (!isLeader) {
            document.addEventListener("turbolinks:before-visit", function (e) {
                var url = e.data.url;

                //  prevent navigation loop
                if (!wvy.url.equal(currentUrl, url)) {
                    // cancel event to prevent navigation
                    e.preventDefault();
                    $.get(wvy.url.resolve("/client/click?url=" + encodeURIComponent(url) + "&embedded=" + wvy.overlay.isEmbedded().toString())).done(function (route) {
                        var noApp = wvy.context.app && !route.app;
                        var noAppMatch = route.app && wvy.context.app !== route.app.id;
                        var notOverlay = wvy.overlay.isOverlay() && route.target !== "overlay";
                        var inOverlay = !wvy.overlay.isOverlay() && route.target === "overlay";
                        var inOtherOverlay = wvy.overlay.inOtherOverlay(url) && route.target === "overlay";

                        if (notOverlay || inOverlay || noApp || noAppMatch || inOtherOverlay) {
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
            })
        }
    });

    return {
        bypassUrl: function (url) {
            currentUrl = url;
        }
    };
})(jQuery);

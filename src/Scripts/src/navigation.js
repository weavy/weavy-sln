/*global Turbolinks */
var wvy = wvy || {};
wvy.navigation = (function ($) {
    // trapping embedded navigation 

    var currentUrl = null;

    wvy.postal.whenLeader.then(function () {
        // Listen to events from overlay
        wvy.postal.on("navigation-open", function (e, message) {
            var route = message.route;
            if (route.target === "overlay") {
                console.log("wvy.navigation: overlay open");
                wvy.overlay.open(route.url);
            } else {
                wvy.overlay.closeAll();
                wvy.turbolinks.visit(route.url);
            }
        });

        // Catch overlay links in standalone
        document.addEventListener("turbolinks:before-visit", function (e) {
            var url = e.data.url;

            //  prevent navigation loop
            if (wvy.overlay.maybeOpen(url) && !wvy.url.equal(currentUrl, url)) {
                // cancel event to prevent navigation
                e.preventDefault();
                $.get(wvy.url.resolve("/client/click?url=" + encodeURIComponent(url) + "&embedded=" + wvy.overlay.isEmbedded().toString())).done(function (route) {
                    var inOverlay = !wvy.overlay.isOverlay() && route.target === "overlay";

                    if (inOverlay) {
                        console.log("wvy.navigation: overlay open");
                        currentUrl = null;
                        wvy.overlay.open(route.url);
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
        });
    }).catch(function () {
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
    });

    return {
        bypassUrl: function (url) {
            currentUrl = url;
        }
    };
})(jQuery);

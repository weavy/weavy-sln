var wvy = wvy || {};
wvy.context = {
    path: "/",
    area: null,
    user: -1,
    space: null,
    app: null,
    content: null,
    culture: "en-US",
    uiculture: "en-US",
    time: 0,
    notify: true,
    enter: false
};

(function ($) {
    if (wvy.turbolinks.enabled) {
        document.addEventListener("turbolinks:load", init);
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }

    // populates the context object with data attributes from body element
    function init() {
        wvy.context.path = document.body.getAttribute("data-path") || "/";
        wvy.context.area = document.body.getAttribute("data-area");
        wvy.context.user = Number(document.body.getAttribute("data-user")) || -1;
        wvy.context.space = Number(document.body.getAttribute("data-space")) || null;
        wvy.context.app = Number(document.body.getAttribute("data-app")) || null;
        wvy.context.content = Number(document.body.getAttribute("data-content")) || null;
        wvy.context.culture = document.body.getAttribute("data-culture") || "en-US";
        wvy.context.uiculture = document.body.getAttribute("data-ui-culture") || "en-US";
        wvy.context.time = Number(document.body.getAttribute("data-time"));
        wvy.context.notify = JSON.parse(document.body.getAttribute("data-notify")) === true ? true : false;
        wvy.context.enter = JSON.parse(document.body.getAttribute("data-enter")) === true ? true : false;

        // connect to signalr if stand-alone
        if (wvy.connection && !wvy.browser.embedded) {
            wvy.connection.init();

            var disconnected = false;

            wvy.connection.on("disconnected", function () {
                disconnected = true;
            });

            wvy.connection.on("state-changed", function (e, data) {                
                if (disconnected && data.state.newState === 1) {
                    wvy.badges.update();
                }
            });
        }
        
    }
})(jQuery);

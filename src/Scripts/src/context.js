var weavy = weavy || {};
weavy.context = {
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
    if (weavy.turbolinks.enabled) {
        document.addEventListener("turbolinks:load", init);
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }

    // populates the context object with data attributes from body element
    function init() {
        weavy.context.path = document.body.getAttribute("data-path") || "/";
        weavy.context.area = document.body.getAttribute("data-area");
        weavy.context.user = Number(document.body.getAttribute("data-user")) || -1;
        weavy.context.space = Number(document.body.getAttribute("data-space")) || null;
        weavy.context.app = Number(document.body.getAttribute("data-app")) || null;
        weavy.context.content = Number(document.body.getAttribute("data-content")) || null;
        weavy.context.culture = document.body.getAttribute("data-culture") || "en-US";
        weavy.context.uiculture = document.body.getAttribute("data-ui-culture") || "en-US";
        weavy.context.time = Number(document.body.getAttribute("data-time"));
        weavy.context.notify = JSON.parse(document.body.getAttribute("data-notify")) === true ? true : false;
        weavy.context.enter = JSON.parse(document.body.getAttribute("data-enter")) === true ? true : false;

        // connect to signalr if stand-alone
        if (weavy.connection && !weavy.browser.embedded) {
            weavy.connection.init();

            var disconnected = false;

            weavy.connection.on("disconnected", function () {
                disconnected = true;
            });

            weavy.connection.on("statechanged", function (e, data) {                
                if (disconnected && data.state.newState === 1) {
                    // todo: reload or show a message that the page should be reloaded?
                    location.reload();
                }
            });
        }
        
    }
})(jQuery);

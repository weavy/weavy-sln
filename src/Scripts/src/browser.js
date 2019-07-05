/*global DocumentTouch */
var wvy = wvy || {};
wvy.browser = {
    embedded: false,
    context: false,
    personal: false,
    ie: false,
    ios: false,
    mobile: false,
    tablet: false,
    touch: false
};

(function () {
    if (document.documentElement.classList.contains("embedded")) {
        wvy.browser.embedded = true;
    } else if (window.name !== "weavy-standalone") {
        try {
            wvy.browser.embedded = (window.self !== window.top) ? true : false;
        } catch (e) {
            wvy.browser.embedded = true;
        }
        if (wvy.browser.embedded) {
            document.documentElement.classList.add("embedded");
        }
    }
    
    if ('ontouchstart' in window || window.DocumentTouch && document instanceof DocumentTouch) {
        wvy.browser.touch = true;
        document.documentElement.classList.add("touch");
    }

    if (document.documentElement.classList.contains("ie")) {
        wvy.browser.ie = true;
    }
    if (document.documentElement.classList.contains("ios")) {
        wvy.browser.ios = true;
    }
    if (document.documentElement.classList.contains("mobile")) {
        wvy.browser.mobile = true;
    }
    if (document.documentElement.classList.contains("tablet")) {
        wvy.browser.tablet = true;
    }

    window.addEventListener("message", function (e) {                    
        switch (e.data.name) {
            case "ping":
                e.source.postMessage({ "name": "ready" }, e.origin !== "null" ? e.origin : "*");
                break;
            case "reload":
                window.location.reload();
                break;            
            default:
        }
    }, false);
})();


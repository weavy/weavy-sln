var weavy = weavy || {};
weavy.browser = {
    embedded: false,
    context: false,
    personal: false,
    ie: false,
    ios: false,
    mobile: false,
    tablet: false,
    touch: false
};

(function ($) {
    if (document.documentElement.classList.contains("embedded")) {
        weavy.browser.embedded = true;
    } else if (window.name !== "weavy-standalone") {
        try {
            weavy.browser.embedded = window.self !== window.top;
        } catch (e) {
            weavy.browser.embedded = true;
        }
        if (weavy.browser.embedded) {
            document.documentElement.classList.add("embedded");
        }
    }
    
    if ('ontouchstart' in window || window.DocumentTouch && document instanceof DocumentTouch) {
        weavy.browser.touch = true;
        document.documentElement.classList.add("touch");
    }

    if (document.documentElement.classList.contains("ie")) {
        weavy.browser.ie = true;
    }
    if (document.documentElement.classList.contains("ios")) {
        weavy.browser.ios = true;
    }
    if (document.documentElement.classList.contains("mobile")) {
        weavy.browser.mobile = true;
    }
    if (document.documentElement.classList.contains("tablet")) {
        weavy.browser.tablet = true;
    }

    window.addEventListener("message", function (e) {                    
        switch (e.data.name) {
            case "ping":
                e.source.postMessage({ "name": "pong" }, e.origin);
                break;
            case "reload":
                window.location.reload();
                break;            
            default:
        }
    }, false);
})(jQuery);


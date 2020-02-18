var wvy = wvy || {};
wvy.browser = wvy.browser || {};
(function () {
    wvy.browser.framed = document.documentElement.classList.contains("framed");
    if (!wvy.browser.framed) {
        try {
            wvy.browser.framed = window.self !== window.top;
        } catch (e) {
            // browsers can block access to window.top due to same origin policy, if that happens we know that we are framed
            wvy.browser.framed = true;
        }
        if (wvy.browser.framed) {
            document.documentElement.classList.add("framed");
        }
    }
})();


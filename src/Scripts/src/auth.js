var wvy = wvy || {}

wvy.auth = (function ($) {

    if (wvy.browser.embedded) {

        // catch the submit and open in new window to enable provider based sign in from iframes
        $('form#embedded-providers').on('submit', function (e) {
            var form = $(this);
            form.attr('target', 'auth-window');
            var win = window.open('about:blank', 'auth-window', 'width=400,height=600');

            // listen for user-change event (user signed in) and then close to window
            window.addEventListener('message', function (msg) {
                if (msg.data.name === "cross-frame-event" && msg.data.eventName === "user-change.connection.weavy") {
                    win.close();
                }
            }, false);
        });
    }
})(jQuery)

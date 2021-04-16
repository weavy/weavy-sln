var wvy = wvy || {};
wvy.desktopNotifications = (function ($) {
    // callbacks for realtime events
    wvy.connection.default.on("notification-inserted.weavy", function (event, data) {
        
        // get notification data
        $.ajax({
            url: wvy.url.resolve("/a/notifications/" + data.id),
            method: "GET",
            contentType: "application/json"
        }).then(function (response) {
            // desktop notify
            notify(response)
        });

    });

    // display desktop notification for specified notification
    function notify(notification) {

        if (!wvy.browser.framed) {
            wvy.audio.play("#notification-sound");
        }
        // only in standalone mode for now
        if (window.Notification && !wvy.browser.framed) {
            console.debug("notification permission is " + Notification.permission + " and context.notify is " + wvy.settings.notify);
            if (Notification.permission === "granted" && wvy.settings.notify) {
                var n = new Notification(wvy.t("You have a new notification"), {
                    body: notification.text,
                    tag: notification.url,
                    // get user thumbnail (as .png since svgs are not supported in browser notifications)
                    icon: notification.thumb.replace("{options}", "96").replace(".svg", ".png")
                });

                n.addEventListener("click", function () {
                    location.href = wvy.url.resolve(notification.url);
                    window.focus();
                    this.close();
                });

                //setTimeout(n.close.bind(notification), 10000);
            }
        } else {
            console.debug(wvy.t("Browser does not support notifications"));
        }
    }
})(jQuery)

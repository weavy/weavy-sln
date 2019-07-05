var wvy = wvy || {};
wvy.desktopNotifications = (function ($) {
    // callbacks for realtime events
    wvy.realtime.on("notification-inserted.weavy", function (event, data) {
        
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

        if (!wvy.browser.embedded) {
            wvy.audio.play("#notification-sound");
        }
        // only in standalone mode for now
        if (window.Notification && !wvy.browser.embedded) {
            console.debug("notification permission is " + Notification.permission + " and context.notify is " + wvy.context.notify);
            if (Notification.permission === "granted" && wvy.context.notify) {
                var n = new Notification("You have a new notification", {
                    body: notification.text,
                    tag: notification.url,
                    // get user thumbnail (as .png since svgs are not supported in browser notifications)
                    icon: notification.thumb_url.replace("{options}", "96x96-crop,both").replace(".svg", ".png")
                });

                n.addEventListener("click", function () {
                    location.href = wvy.url.resolve(notification.url);
                    window.focus();
                    this.close();
                });

                //setTimeout(n.close.bind(notification), 10000);
            }
        } else {
            console.debug("Browser does not support notifications");
        }
    }
})(jQuery)

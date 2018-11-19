var weavy = weavy || {};
weavy.desktopNotifications = (function ($) {
    // callbacks for realtime events
    weavy.realtime.on("notification", function (event, data) {
        
        // get notification data
        $.ajax({
            url: weavy.url.resolve("/api/notifications/" + data.id),
            method: "GET",
            contentType: "application/json"
        }).then(function (response) {
            // desktop notify
            notify(response)
        });

    });

    // display desktop notification for specified notification
    function notify(notification) {

        if (!weavy.browser.embedded) {
            weavy.audio.play("#notification-sound");
        }
        // only in standalone mode for now
        if (window.Notification && !weavy.browser.embedded) {
            console.debug("notification permission is " + Notification.permission + " and context.notify is " + weavy.context.notify);
            if (Notification.permission === "granted" && weavy.context.notify) {
                var n = new Notification("You have a new notification", {
                    body: notification.text,
                    tag: notification.url,
                    // get user thumbnail (as .png since svgs are not supported in browser notifications)
                    icon: notification.thumb_url.replace("{options}", "96x96-crop,both").replace(".svg", ".png")
                });

                n.addEventListener("click", function () {
                    location.href = weavy.url.resolve(notification.url);
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

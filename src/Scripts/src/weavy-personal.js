var wvy = wvy || {};

// script for the personal panel in weavy client

(function ($) {

    //new message links
    $(document).on("click", "a[data-role=messenger]", function (e) {
        if (wvy.browser.embedded) {
            e.preventDefault();
            var url = wvy.url.resolve($(this).attr("href"));
            window.parent.postMessage({ "name": "messenger", "url": url }, "*");
        }
    })

    // toggling desktop notifications
    if (window.Notification) {
        if (window.Notification.permission === "denied") {
            $(".alert.notification-denied").show();
        }

        $(document).on("change", "input[name=DesktopNotifications]", function (evt) {
            if ($(this).is(":checked") && window.Notification.permission === "default") {
                $(".alert.notification-required").show();
                $(".notification-required").trigger("click");
            }
        });

        $(document).on("click", ".notification-required", function (evt) {
            evt.preventDefault();
            Notification.requestPermission(function (result) {
                if (result === "granted") {
                    $(".notification-alerts .alert").hide();
                } else if (result === "denied") {
                    $(".alert.notification-required").hide();
                    $(".alert.notification-denied").show();
                } else if (result === "default") {
                    // do nothing
                }
            });
        });

    } else {
        $(".alert.notification-missing").show();
    }

})(jQuery);

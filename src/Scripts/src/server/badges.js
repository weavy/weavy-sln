var wvy = wvy || {};

wvy.badges = (function ($) {

    // call server to get fresh badge data
    function refresh() {
        wvy.api.badges().then(function (data) {
            update(data);
        });
    }

    // update ui with new bade
    function update(badge) {
        if (badge.conversations > 0) {
            $(".badge[data-badge=conversation]").text(badge.conversations).removeClass("d-none");
        } else {
            $(".badge[data-badge=conversation]").text("").addClass("d-none");
        }

        if (badge.notifications > 0) {
            $(".badge[data-badge=notification]").text(badge.notifications).removeClass("d-none");
        } else {
            $(".badge[data-badge=notification]").text("").addClass("d-none");
        }

        if (badge.total > 0) {
            $(".badge[data-badge=total]").text(badge.total).removeClass("d-none");
        } else {
            $(".badge[data-badge=total]").text("").addClass("d-none");
        }
    }

    // update ui when badge is updated
    wvy.connection.default.on("badge.weavy", function (event, data) {
        update(data);
    });

    wvy.connection.default.on("reconnected.connection", refresh);

    return {
        refresh: refresh
    };

})(jQuery);

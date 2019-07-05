var wvy = wvy || {};

wvy.badges = (function ($) {

    var updateBadge = function () {         
        wvy.api.badges().then(function (data) {
            if (data.notifications > 0) {
                $(".badge[data-badge='notification']").text(data.notifications).removeClass("d-none");
            } else {
                $(".badge[data-badge='notification']").text("").addClass("d-none");
            }
        });
    }

    var update = function () {
        updateBadge();
    }

    return {
        update: update
    };

})(jQuery);

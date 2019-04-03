var weavy = weavy || {};
weavy.ui = (function ($) {

    var updateBadge = function () {         
        weavy.api.badges().then(function (data) {
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

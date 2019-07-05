var wvy = wvy || {};

wvy.space = (function ($) {

    // attach click event handler to [data-toggle=join]
    $(document).on("click", "[data-toggle=join]", function (e) {
        e.stopPropagation();
        if ($(this).hasClass("btn-success")) {
            leave(this.dataset.id);
        } else {
            join(this.dataset.id);
        }
    });

    // join specified space
    function join(id) {
        // toggle button class
        $("[data-toggle=join][data-id=" + id + "]").removeClass("btn-outline-success").addClass("btn-success").text("Joined");

        // call api to join space
        wvy.api.join(id);
    }

    // leave specified space
    function leave(id) {
        // toggle button class
        $("[data-toggle=join][data-id=" + id + "]").removeClass("btn-success").addClass("btn-outline-success").text("Join");

        // call api to leave space
        wvy.api.leave(id);
    }

    return {
        join: join,
        leave: leave
    };

})(jQuery);


var wvy = wvy || {};

wvy.subscribe = (function ($) {

    // attach click event handler to [data-toggle=subscribe]
    $(document).on("click", "[data-toggle=subscribe]", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if ($(this).hasClass("on")) {
            unsubscribe(this.dataset.type, this.dataset.id);
        } else {
            subscribe(this.dataset.type, this.dataset.id);
        }
    });

    // subscribe to specified entity
    function subscribe(entity, id) {
        // find all subscription togglers for the entity and add the .on class
        $("[data-toggle=subscribe][data-type=" + entity + "][data-id=" + id + "]").addClass("on");

        // call api to subscribe (follow) to entity
        wvy.api.follow(entity, id).then(function () {
            updateSubscribers(entity, id);
        });
    }

    // unsubscribe specified entity
    function unsubscribe(entity, id) {
        // find all subscription togglers for the entity and remove the .on class
        $("[data-toggle=subscribe][data-type=" + entity + "][data-id=" + id + "]").removeClass("on");

        // call api to unsubscribe (unfollow) to entity
        wvy.api.unfollow(entity, id).then(function () {
            updateSubscribers(entity, id);
        });
    }

    // get subscribers partial from server and update the ui
    function updateSubscribers(entity, id) {
        var $subscribers = $("[data-type="+entity+"][data-id='" + id + "'] .subscribers");
        if (!$subscribers.length) {
            return;
        }

        $.ajax({
            url: wvy.url.mvc(entity) + id + "/subscribers",
            method: "GET",
            contentType: "application/json"
        }).then(function (html) {
            $subscribers.replaceWith(html);
        });
    }

})(jQuery);


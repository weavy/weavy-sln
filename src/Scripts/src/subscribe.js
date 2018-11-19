var weavy = weavy || {};

weavy.subscribe = (function ($) {

    // attach click event handler to [data-toggle=subscribe]
    $(document).on("click", "[data-toggle=subscribe]", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if ($(this).hasClass("on")) {
            unsubscribe(this.dataset.entity, this.dataset.id);
        } else {
            subscribe(this.dataset.entity, this.dataset.id);
        }
    });

    // subscribe to specified entity
    function subscribe(entity, id) {
        // find all subscription togglers for the entity and add the .on class
        $("[data-toggle=subscribe][data-entity=" + entity + "][data-id=" + id + "]").addClass("on");

        // call api to subscribe (follow) to entity
        weavy.api.follow(entity, id).then(function () {
            updateSubscribers(entity, id);
        });
    }

    // unsubscribe specified entity
    function unsubscribe(entity, id) {
        // find all subscription togglers for the entity and remove the .on class
        $("[data-toggle=subscribe][data-entity=" + entity + "][data-id=" + id + "]").removeClass("on");

        // call api to unsubscribe (unfollow) to entity
        weavy.api.unfollow(entity, id).then(function () {
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
            url: weavy.url.mvc(entity) + id + "/subscribers",
            method: "GET",
            contentType: "application/json"
        }).then(function (html) {
            $subscribers.replaceWith(html);
        });
    }

})(jQuery);


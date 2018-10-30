var weavy = weavy || {};
weavy.stars = (function ($) {

    // attach click event handler to [data-toggle=star]
    $(document).on("click", "[data-toggle=star]", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if ($(this).hasClass("on")) {
            unstar(this.dataset.entity, this.dataset.id);
        } else {
            star(this.dataset.entity, this.dataset.id);
        }
    });

    // close dropdown on button click
    $(document).on("click", ".toggle-dropdown", function (e) {
        $(this).parents(".show").children("[data-toggle=dropdown]").dropdown("toggle");
    });

    if (weavy.realtime) {
        // respond to realtime event starentity
        weavy.realtime.on("starentity", function (event, data) {
            $("[data-toggle=star][data-entity=" + data.type + "][data-id=" + data.id + "]").addClass("on").removeClass("d-none").attr("title", "Unstar");
        });

        // respond to realtime event unstarentity
        weavy.realtime.on("unstarentity", function (event, data) {
            $("[data-toggle=star][data-entity=" + data.type + "][data-id=" + data.id + "]").removeClass("on").attr("title", "Star");
        });
    }

    // star specified entity
    function star(entity, id) {
        // find all stars for the entity and add the .on class
        $("[data-toggle=star][data-entity=" + entity + "][data-id=" + id + "]").addClass("on").removeClass("d-none").attr("title", "Unstar");

        // call api to star entity
        weavy.api.star(entity, id);
    }

    // unstar specified entity
    function unstar(entity, id) {
        // find all stars for the entity and remove the .on class
        $("[data-toggle=star][data-entity=" + entity + "][data-id=" + id + "]").removeClass("on").attr("title", "Star");

        // call api to unstar entity
        weavy.api.unstar(entity, id);
    }

    return {
        star: star,
        unstar: unstar
    };

})($);


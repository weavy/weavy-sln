var weavy = weavy || {};

weavy.stars = (function ($) {

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

    function removeUnstarredInTab() {
        $('[data-toggle="star"]:not(.on)', "#tab-stars .table-stars").closest("tr").remove();
    }

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

            // Add to stars tab
            if (!$('#tab-stars tr[data-href="' + data.url + '"]').length) {

                var $starItem = $('<tr data-href="' + data.url + '"></tr>');

                if (data.type === "space" || data.type === "user") {
                    $starItem.append('<td class="table-icon"><img alt="" class="img-32 avatar" src="' + data.thumb_url.replace(/{options}/, "64x64") + '"></td>');
                } else {
                    $starItem.append('<td class="table-icon"><svg class="i' + (data.icon.color ? " text-" + data.icon.color : "") + '"><use xlink: href="#' + data.icon.name + '"></use></svg></td>')
                }
                $starItem.append('<td><a href="' + data.url + '">' + (data.name || data.text && data.text.trunc(32) || "") + '</a></td>');
                $starItem.append('<td class="table-icon"><button type="button" class="btn btn-icon on" data-entity="' + data.type.toString().toLowerCase() + '" data-id="' + data.id + '" data-toggle="star"><svg class="text-yellow i d-block"><use xlink: href="#star-outline"></use></svg><svg class="text-yellow i d-none"><use xlink: href="#star"></use></svg></button></td>');

                $starItem.prependTo("#tab-stars .table-stars > tbody");
            }
        });

        // respond to realtime event unstarentity
        weavy.realtime.on("unstarentity", function (event, data) {
            $("[data-toggle=star][data-entity=" + data.type + "][data-id=" + data.id + "]").removeClass("on").attr("title", "Star");
        });
    }

    return {
        star: star,
        unstar: unstar,
        prune: removeUnstarredInTab
    };

})(jQuery);


var wvy = wvy || {};

wvy.stars = (function ($) {

    // star specified entity
    function star(entity, id) {
        // find all stars for the entity and add the .on class
        $("[data-toggle=star][data-type=" + entity + "][data-id=" + id + "]").addClass("on").removeClass("d-none").attr("title", "Unstar");

        // call api to star entity
        wvy.api.star(entity, id);
    }

    // unstar specified entity
    function unstar(entity, id) {
        // find all stars for the entity and remove the .on class
        $("[data-toggle=star][data-type=" + entity + "][data-id=" + id + "]").removeClass("on").attr("title", "Star");

        // call api to unstar entity
        wvy.api.unstar(entity, id);
    }

    function removeUnstarredInTab() {
        $('[data-toggle="star"]:not(.on)', "#tab-stars .table").closest("tr").remove();
    }

    // attach click event handler to [data-toggle=star]
    $(document).on("click", "[data-toggle=star]", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if ($(this).hasClass("on")) {
            unstar(this.dataset.type, this.dataset.id);
        } else {
            star(this.dataset.type, this.dataset.id);
        }
    });

    // close dropdown on button click
    $(document).on("click", ".toggle-dropdown", function (e) {
        $(this).parents(".show").children("[data-toggle=dropdown]").dropdown("toggle");
    });

    if (wvy.connection) {
        // respond to realtime star event
        wvy.connection.default.on("star.weavy", function (e, data) {

            $("[data-toggle=star][data-entity=" + data.type + "][data-id=" + data.id + "]").addClass("on").removeClass("d-none").attr("title", wvy.t("Unstar"));

            // Add to stars tab
            if (!$('#tab-stars tr[data-href="' + data.url + '"]').length) {

                var $starRow = $('<tr data-href="' + data.url + '"></tr>');

                if (data.type === "space" || data.type === "user") {
                    $starRow.append('<td class="table-icon"><img alt="" class="img-32 avatar" src="' + data.thumb.replace(/{options}/, "64") + '"></td>');
                } else {
                    // TODO: inject actual icon here, but since json only returs name of icon instead of actual svg it's hard... we should maybe change the json response to include the actual icon?
                    $starRow.append('<td class="table-icon"></td>')
                }
                $starRow.append('<td><a href="' + data.url + '">' + (data.name || data.text && data.text.trunc(32) || "") + '</a></td>');
                $starRow.append('<td class="table-icon"><button type="button" class="btn btn-icon on" data-type="' + data.type.toString().toLowerCase() + '" data-id="' + data.id + '" data-toggle="star">' +
                    '<svg height="24" viewBox="0 0 24 24" width="24" class="d-none i i-star text-yellow"><path d="m12 17.27 6.18 3.73-1.64-7.03 5.46-4.73-7.19-.62-2.81-6.62-2.81 6.62-7.19.62 5.45 4.73-1.63 7.03z"></path></svg>'
                    + '</button></td>');

                $starRow.prependTo("#tab-stars .table > tbody");
            }
        });

        // respond to realtime unstar event
        wvy.connection.default.on("unstar.weavy", function (e, data) {
            $("[data-toggle=star][data-entity=" + data.type + "][data-id=" + data.id + "]").removeClass("on").attr("title", wvy.t("Star"));
        });
    }

    return {
        star: star,
        unstar: unstar,
        prune: removeUnstarredInTab
    };

})(jQuery);


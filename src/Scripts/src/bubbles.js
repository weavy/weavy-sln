var weavy = weavy || {};
weavy.bubbles = (function ($) {
    var visitUrl = null;

    //-------------------------------------------------------
    // open a bubble
    // * spaceId - the space to open
    // * type: 0 (global) or 1 (personal)
    // * if type = 0 (global), the origin url to connect the space to
    // * url - optional url to open up in the space
    //-------------------------------------------------------
    function open(spaceId, destination) {
        console.debug("opening space bubble");

        requestOpen(spaceId, destination);

        return $.ajax({
            url: "/api/bubble",
            type: "POST",
            data: JSON.stringify({ space_id: spaceId, url: destination, type: 1 }),
            contentType: "application/json"
        });
    }

    function openBubble(bubbleTarget, destination) {
        console.debug("opening bubble");

        if (weavy.browser.embedded) {
            weavy.postal.post({ name: 'send', bubbleTarget: bubbleTarget, url: destination });
        }
    }

    function requestOpen(spaceId, destination) {
        if (weavy.browser.embedded) {
            weavy.postal.post({ name: 'request-open', spaceId: spaceId, destination: destination });
        }
    }

    function close(bubbleId) {
        console.debug("closing space bubble");

        return $.ajax({
            url: "/api/bubble/" + bubbleId,
            type: "DELETE",
            contentType: "application/json"
        });
    }


    document.addEventListener("turbolinks:visit", function (e) {
        visitUrl = e.data.url;
    });

    document.addEventListener("turbolinks:before-render", function (e) {

        var $body = $(e.data.newBody);
        var $oldBody = $("body");
        var currentSpaceId = $oldBody.get(0).getAttribute("data-space");
        var newSpaceId = $body.data("space");

        if (!weavy.browser.embedded) {
            // Open bubble on page load
            if (newSpaceId && newSpaceId != currentSpaceId) {
                open(newSpaceId);
            }
            return;
        }


        // Intercept global search
        var urlBase = $body.data("path").indexOf("http") === 0 ? $body.data("path") : document.location.origin + $body.data("path");
        var redirSpaceId = visitUrl.indexOf(urlBase + "search") === 0 ? -1 : newSpaceId;

        if (redirSpaceId && newSpaceId != currentSpaceId) {

            if (redirSpaceId === -1) {
                openBubble("add", visitUrl);
            } else {
                // restore page and open bubble 
                open(newSpaceId, visitUrl);
            }

            // update 
            $body.html($oldBody.html());

            // transfer attributes
            $body.removeAttr("data-space"); // remove data-space since it's note present on all views
            $.each($oldBody.get(0).attributes, function (i, attrib) {
                $body.attr(attrib.name, attrib.value);
            });

            e.data.newBody = $body[0];

            visitUrl = null;
        }

    });

    $(document).on("click", "[data-remove-bubble]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var removeBubble = $(this).data("removeBubble");
        if (removeBubble) {
            close(removeBubble.bubbleId).done(function (data) {
                if ($("body").data("path") && removeBubble.spaceId == $("body").data("space")) {
                    weavy.turbolinks.visit($("body").data("path"));
                }
            });
        }
    });

    function addBubble(data) {
        var existingBubble = $(".weavy-bubble-item.weavy-bubble-" + data.space_id);
        if (existingBubble.length) {
            // Update existing bubble
            existingBubble.attr("bubble-id", data.bubble_id);
            existingBubble.find("[data-remove-bubble]").attr("data-remove-bubble", JSON.stringify({ spaceId: data.space_id, bubbleId: data.bubble_id }));
        } else {
            // Add new bubble

            // Space switcher
            if ($(".navbar-menu").length) {

                var $activeSpaces = $(".navbar-menu .active-spaces");

                var $closeButton = $('<button class="btn btn-icon i weavy-bubble-close ml-3" title="Close">')
                    .attr("data-remove-bubble", JSON.stringify({ spaceId: data.space_id, bubbleId: data.bubble_id }))
                    .append('<svg class="i"><use xlink:href="#close"></use></svg>');

                var $dropdownItem = $('<div class="dropdown-item weavy-bubble-item">')
                    .addClass("weavy-bubble-" + data.space_id)
                    .addClass(data.space_id == $("body").data("space") ? "active" : "")
                    .attr("data-bubble-id", data.bubble_id)
                    .attr("data-href", data.url)
                    .append('<img class="avatar img-24" src="' + data.icon + '" />')
                    .append('<span>' + data.name + '</span>')
                    .append($closeButton);

                $dropdownItem.appendTo($activeSpaces);
            }

            // Widget nav
            if ($(".weavy-widget-nav").length) {
                var $avatarButton = $('<div class="weavy-button" data-type="personal">')
                    .addClass("weavy-bubble-" + data.space_id)
                    .css("background-image", "url(" + data.icon + ")")
                    .attr("data-name", data.name);

                var $closeAction = $('<div class="weavy-bubble-action weavy-bubble-close" title="Close">')
                    .attr("data-remove-bubble", JSON.stringify({ spaceId: data.space_id, bubbleId: data.bubble_id }))
                    .append('<svg class="i"><use xlink:href="#close-circle"></use></svg>');

                var $bubbleTooltip = $('<div class="weavy-bubble-tooltip">')
                    .attr('id', "weavy-bubble-tooltip-" + data.space_id)
                    .append('<span class="weavy-bubble-tooltip-text"><span>' + data.name + '</span>' + (data.teamname ? '<small>&nbsp;' + data.teamname + '</small>' : '') + '</span>');

                var $bubble = $('<div class="weavy-bubble-item block-link" data-type="personal">')
                    .addClass("weavy-bubble-" + data.space_id)
                    .addClass(data.space_id == $("body").data("space") ? "active" : "")
                    .attr("data-bubble-id", data.bubble_id)
                    .attr("data-id", data.space_id)
                    .attr("data-href", data.url)
                    .append($avatarButton)
                    .append($closeAction)
                    .append($bubbleTooltip);

                $bubble.appendTo(".weavy-widget-nav .weavy-bubbles-personal");
            }
        }
    }

    function removeBubble(data, forced) {
        var $existingBubbles = $(".weavy-bubble-item.weavy-bubble-" + data.space_id);
        $existingBubbles.each(function () {
            if (forced || $(this).data("type") !== "global") {
                $(this).remove();
            }
        });

        // Clear active spaces in space switcher
        var $activeSpaces = $(".navbar-menu .active-spaces");
        if (!$activeSpaces.find(".dropdown-item.weavy-bubble-item").length) {
            $activeSpaces.html('');
        }
    }

    $(function () {
        // Open current space bubble on page ready
        if (!weavy.browser.embedded) {
            // Open bubble
            var $body = $("body");
            var newSpaceId = $body.data("space");
            if (newSpaceId) {
                open(newSpaceId);
            }

            // Bind Alt+W to navbar-menu
            Mousetrap.bindGlobal('ctrl+space', function () {
                $('.navbar-menu .dropdown-toggle').click();
                if ($('.navbar-menu').hasClass("show")) {
                    $('.navbar-menu .dropdown-item:first').focus();
                }
            });

            return;
        }

    });

    weavy.realtime.on("bubbleopened", function (e, data) {
        addBubble(data);
    });

    weavy.realtime.on("bubbleremoved", function (e, data) {
        removeBubble(data);
    });

    weavy.realtime.on("trashedspace", function (e, data) {
        removeBubble({ space_id: data.id }, true);
        if ($("body").data("path") && data.id == $("body").data("space")) {
            weavy.turbolinks.visit($("body").data("path"));
        }
    })

    return {
        open: open,
        requestOpen: requestOpen
    };

})(jQuery);

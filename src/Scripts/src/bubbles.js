/*global Mousetrap */
var wvy = wvy || {};
wvy.bubbles = (function ($) {
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
            url: "/a/bubble",
            type: "POST",
            data: JSON.stringify({ space_id: spaceId, url: destination, type: 1 }),
            contentType: "application/json"
        });
    }

    function requestOpen(requestId, destination) {
        if (wvy.browser.embedded) {
            console.log("requesting panel open", requestId, destination);

            if (typeof requestId === 'number') {
                wvy.postal.post({ name: 'request:open', spaceId: requestId, destination: destination });
            } else {
                wvy.postal.post({ name: 'request:open', panelId: requestId, destination: destination });
            }
        }
    }

    function close(bubbleId) {
        console.debug("closing space bubble");

        return $.ajax({
            url: "/a/bubble/" + bubbleId,
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
        var currentSpaceId = parseInt($oldBody.get(0).getAttribute("data-space"));
        var newSpaceId = parseInt($body.data("space"));
        var wasSignedOut = parseInt($oldBody.get(0).getAttribute("data-user"), 10) === -1;

        if (!wvy.browser.embedded) {
            // Open bubble on page load
            if (newSpaceId && newSpaceId !== currentSpaceId) {
                open(newSpaceId);
            }
            return;
        }


        // Intercept global search
        var urlBase = $body.data("path").indexOf("http") === 0 ? $body.data("path") : document.location.origin + $body.data("path");
        var redirSpaceId = visitUrl && visitUrl.indexOf(urlBase + "search") === 0 ? -1 : newSpaceId;

        if (!wasSignedOut && redirSpaceId && newSpaceId !== currentSpaceId) {

            if (redirSpaceId === -1) {
                if (currentSpaceId > 0) {
                    requestOpen("start", visitUrl);
                } else {
                    requestOpen("start");
                    return;
                }
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
                if ($("body").data("path") && removeBubble.spaceId === $("body").data("space")) {
                    wvy.turbolinks.visit($("body").data("path"));
                }
            });
        }
    });

    function addBubble(data) {
        var existingBubble = $(".weavy-bubble-item.weavy-bubble-" + data.spaceId);
        if (existingBubble.length) {
            // Update existing bubble
            existingBubble.attr("bubble-id", data.bubbleId);
            existingBubble.find("[data-remove-bubble]").attr("data-remove-bubble", JSON.stringify({ spaceId: data.spaceId, bubbleId: data.bubbleId }));
        } else {
            // Add new bubble

            // Space switcher
            if ($(".navbar-menu").length) {

                var $activeSpaces = $(".navbar-menu .active-spaces");

                var $closeButton = $('<button class="btn btn-icon i weavy-bubble-close ml-3" title="Close">')
                    .attr("data-remove-bubble", JSON.stringify({ spaceId: data.spaceId, bubbleId: data.bubbleId }))
                    .append('<svg class="i i-close" height="24" viewBox="0 0 24 24" width="24"><path d="m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg>');

                var $dropdownItem = $('<div class="dropdown-item weavy-bubble-item">')
                    .addClass("weavy-bubble-" + data.spaceId)
                    .addClass(data.spaceId === $("body").data("space") ? "active" : "")
                    .attr("data-bubble-id", data.bubbleId)
                    .attr("data-href", data.url)
                    .append('<img class="avatar img-24" src="' + data.icon + '" />')
                    .append('<span>' + data.name + '</span>')
                    .append($closeButton);

                $dropdownItem.appendTo($activeSpaces);
            }

            // Widget nav
            if ($(".weavy-widget-nav").length) {
                var $avatarButton = $('<div class="weavy-button" data-type="personal">')
                    .addClass("weavy-bubble-" + data.spaceId)
                    .css("background-image", "url(" + data.icon + ")")
                    .attr("data-name", data.name);

                var $closeAction = $('<div class="weavy-bubble-action weavy-bubble-close" title="Close">')
                    .attr("data-remove-bubble", JSON.stringify({ spaceId: data.spaceId, bubbleId: data.bubbleId }))
                    .append('<svg class="i i-close-circle" height="24" viewBox="0 0 24 24" width="24"><path d="m12 2c5.53 0 10 4.47 10 10s-4.47 10-10 10-10-4.47-10-10 4.47-10 10-10m3.59 5-3.59 3.59-3.59-3.59-1.41 1.41 3.59 3.59-3.59 3.59 1.41 1.41 3.59-3.59 3.59 3.59 1.41-1.41-3.59-3.59 3.59-3.59z"/></svg>');

                var $bubbleTooltip = $('<div class="weavy-bubble-tooltip">')
                    .attr('id', "weavy-bubble-tooltip-" + data.spaceId)
                    .append('<span class="weavy-bubble-tooltip-text"><span>' + data.name + '</span>' + (data.teamname ? '<small>&nbsp;' + data.teamname + '</small>' : '') + '</span>');

                var $bubble = $('<div class="weavy-bubble-item block-link" data-type="personal">')
                    .addClass("weavy-bubble-" + data.spaceId)
                    .addClass(data.spaceId === $("body").data("space") ? "active" : "")
                    .attr("data-bubble-id", data.bubbleId)
                    .attr("data-id", data.spaceId)
                    .attr("data-href", data.url)
                    .append($avatarButton)
                    .append($closeAction)
                    .append($bubbleTooltip);

                $bubble.appendTo(".weavy-widget-nav .weavy-bubbles-personal");
            }
        }
    }

    function removeBubble(data, forced) {
        var $existingBubbles = $(".weavy-bubble-item.weavy-bubble-" + data.spaceId);
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
        if (!wvy.browser.embedded) {
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

    if (wvy.realtime) {
        wvy.realtime.on("bubble-added.weavy", function (e, data) {
            addBubble(data);
        });

        wvy.realtime.on("bubble-removed.weavy", function (e, data) {
            removeBubble(data);
        });

        wvy.realtime.on("space-trashed.weavy", function (e, data) {
            removeBubble({ spaceId: data.id }, true);
            if ($("body").data("path") && data.id === $("body").data("space")) {
                wvy.turbolinks.visit($("body").data("path"));
            }
        })
    }
    return {
        open: open,
        requestOpen: requestOpen
    };

})(jQuery);

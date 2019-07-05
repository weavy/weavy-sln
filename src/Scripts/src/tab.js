var wvy = wvy || {};

wvy.tab = (function ($) {

    // load remote tab content for specified tab-pane
    function load(tabpane, optionalPromise) {
        var $tabpane = $(tabpane);
        var $remote = $(".tab-remote", $tabpane);

        var url = $remote.data("url");
        if (url) {
            var $loading = $(".tab-loading", $tabpane);
            $.when(
                $.ajax({
                    url: url,
                    method: "GET",
                    beforeSend: function (xhr) {
                        // not previously loaded
                        if (!$remote.hasClass("loaded")) {
                            $remote.addClass("d-none");
                            $loading.removeClass("d-none").find(".spinner").addClass("spin");
                        }
                    }
                }),
                optionalPromise
            ).done(function (html) {
                // jquery returns array instead of multiple arguments
                if ($.isArray(html)) {
                    html = html[0];
                }
                $remote.html(html).addClass("loaded");
            }).always(function () {
                $loading.addClass("d-none").find(".spinner").removeClass("spin");
                $remote.removeClass("d-none")
            });
        }

    }

    // Reload tabs on show
    if (wvy.browser.embedded) {
        window.addEventListener("message", function (e) {
            switch (e.data.name) {
                case "show":
                    setTimeout(wvy.tab.load, 200, "#tab-notifications");
                    setTimeout(wvy.tab.load, 200, "#tab-stars");
                    setTimeout(wvy.tab.load, 200, "#tab-drafts");
                    break;
                case "hide":
                    setTimeout(wvy.notifications.sort, 200);
                    setTimeout(wvy.stars.prune, 200);
                    break;
            }
        });

    }

    return {
        load: load,

    }

})(jQuery);


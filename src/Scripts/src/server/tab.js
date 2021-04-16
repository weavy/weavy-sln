var wvy = wvy || {};

wvy.tab = (function ($) {

    // load remote tab content for specified tab-pane
    function load(tabpane, optionalPromise) {
        var $tabpane = $(tabpane);

        
        var $loading = $(".tab-loading", $tabpane);

        // handle iframes with data-src        
        var $iframe = $("> iframe[data-src]", $tabpane);
        if ($iframe.length) {
            var iframe = $iframe[0];
            iframe.onload = function () {
                $loading.addClass("d-none").find(".spinner").removeClass("spin");
            }

            // set src on first load or if location has changes
            if (!iframe.src || iframe.contentWindow.location.href !== iframe.src) {
                $loading.removeClass("d-none").find(".spinner").addClass("spin");
                iframe.src = iframe.dataset.src;
                return;
            }
        }

        var $remote = $(".tab-remote", $tabpane);
        var url = $remote.data("url");
        if (url) {
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
    if (wvy.browser.framed) {
        wvy.postal.on("show", function (e) {
            setTimeout(wvy.tab.load, 200, "#tab-notifications");
            setTimeout(wvy.tab.load, 200, "#tab-stars");
            setTimeout(wvy.tab.load, 200, "#tab-drafts");
        })

        wvy.postal.on("hide", function (e) {
            setTimeout(wvy.notifications.sort, 200);
            setTimeout(wvy.stars.prune, 200);
        });
    }

    function scrollActiveTabsIntoView() {
        $(".nav-tabs.scroll-x .nav-link.active").each(function () {
            this.scrollIntoView();
        });
    }

    $(document).on("DOMContentLoaded turbolinks:render", scrollActiveTabsIntoView);

    return {
        load: load,

    }

})(jQuery);


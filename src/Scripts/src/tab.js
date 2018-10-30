var weavy = weavy || {};
weavy.tab = (function ($) {

    // load remote tab content for specified tab-pane
    function load(tabpane) {
        var $tabpane = $(tabpane);
        var $remote = $(".tab-remote", $tabpane);

        if ($remote.hasClass("loaded")) {
            // already loaded
            return;
        }

        var url = $remote.data("url");
        if (url) {
            var $loading = $(".tab-loading", $tabpane);
            $.ajax({
                url: url,
                method: "GET",
                beforeSend: function (xhr) {
                    $remote.addClass("d-none");
                    $loading.removeClass("d-none").find(".spinner").addClass("spin");
                }
            }).done(function (html) {
                $remote.html(html).addClass("loaded");
            }).always(function () {
                $loading.addClass("d-none").find(".spinner").removeClass("spin");
                $remote.removeClass("d-none")
            });
        }

    }

    return {
        load: load
    }

})($);


var weavy = weavy || {};
weavy.infinitescroll = (function ($) {

    var buffer = window.innerHeight / 2 || 0; // arbitrary value (set to whatever you think is a good distance before triggering automatic click)
    var hasnext = true;
    var loading = false;
    var throttle = null;

    // click on .scroll-more calls a server function that returns HTML that should be appended to the specified target element
    $(document).on("click", ".scroll-more", function (evt) {
        evt.preventDefault();

        if (loading) {
            // already loading...
            return;
        }

        var $more = $(this);
        console.debug($more.attr("data-next"));

        $.ajax({
            type: "GET",
            cache: false,
            url: $more.attr("data-next"),
            beforeSend: function (xhr, settings) {
                loading = true;

                // animate spinner
                $more.find(".spinner").addClass("spin");
            }
        }).done(function (data, status, xhr) {

            // load data into div (why?)
            var $div = $("<div />").html(data);
            var $next = $(".scroll-next", $div).first();

            if ($next.length && $next.attr("data-next")) {
                // set $more[data-next] to url for next page of data
                $more.attr("data-next", $next.attr("data-next"));
                hasnext = true;
            } else {
                // no more items
                hasnext = false;
            }

            // add to target element
            var $target = $($more.attr("data-target"));
            if ($more.attr("data-mode") === "prepend") {
                $target.prepend(data);
            } else {
                $target.append(data);
            }

        }).fail(function (xhr, status, error) {
            // stop loading on error
            $more.remove();
            var json = JSON.parse(xhr.responseText);
            console.error(json);
        }).always(function (xhr, status) {
            if (hasnext) {
                // stop spinner animation
                $more.find(".spinner").removeClass("spin");
            } else {
                // remove if this was the last page
                $more.remove();
            }

            // resume after load
            loading = false;

            // check if we should load more data
            loadMore();
        });
    });

    if (weavy.turbolinks.enabled) {
        // init on load
        document.addEventListener("turbolinks:load", init);

        // check if we should load more data directly after page is loaded
        loadMore();

        // destroy on before cache
        document.addEventListener("turbolinks:before-cache", destroy);
    } else {
        $(document).ready(function () {
            // check if we should load more data directly after page is loaded
            loadMore();
            init();
        });
    }

    function init() {
        throttle = _.throttle(function (e) {
            if (!loading) {
                loadMore(e);
            }
        }, 250);
        $(window).add("main").on("scroll", throttle);
    }

    function destroy() {
        if (throttle != null) {
            throttle.cancel();
        }
        $(window).add("main").off("scroll", throttle);
    }

    // load data if $more is visible
    function loadMore(e) {
        var $more = $('.scroll-more:not([data-mode=prepend])').first();
        var target = e && e.target !== document && e.target || window;
        if ($more.length) {
            // calculate distance until $more scrolls into view
            var distance = 0 + $more.offset().top - $(target).scrollTop() - $(target).height();

            if (distance < buffer) {
                $more.click();
            }
        }
    }

})($);

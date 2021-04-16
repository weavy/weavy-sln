var wvy = wvy || {};

// visible scrollbar detection
wvy.scrollbars = (function ($) {

    var whenScrollbarsChecked = $.Deferred();

    function getScrollbarOptions() {
        return {
            className: $("body").hasClass("body-dark") ? "os-theme-light" : "os-theme-dark",
            nativeScrollbarsOverlaid: { initialize: $("html").hasClass("scrollbars")} // scrollbar detection seems broken in frames, so we force it from our detection
        }
    }

    function initScrollbars(selector) {
        if (selector === "body") {
            whenScrollbarsChecked.then(function () {
                if (!window.CSS || !window.CSS.supports("overflow: overlay")) { // Skip overlayScrollbars for body when nativly supported via styling
                    $(selector).overlayScrollbars(getScrollbarOptions());
                }
            })
        } else {
            $(selector).overlayScrollbars(getScrollbarOptions());
        }
    }

    // Restore scroll positions from turbolinks cache
    document.addEventListener("turbolinks:render", function () {
        $(".os-host").each(function (index, osHost) {
            var os = $(osHost).overlayScrollbars();
            if (os) {
                var osScroll = $(osHost).data("os-scroll");
                if (osScroll) {
                    console.log("restoring overlayscroll", osScroll);
                    os.scroll(osScroll);
                }

                // Resume overlayScrollbars listening
                os.update();
            }
        })
    }, true);

    // Init all scroll-y on load
    $(document).on("turbolinks:render turbolinks:load", function () {
        initScrollbars("body");
        initScrollbars(".scroll-y");
    });


    // Save scroll positions to turbolinks cache
    document.addEventListener("turbolinks:before-cache", function () {
        $(".os-host").each(function (index, osHost) {
            var os = $(osHost).overlayScrollbars();
            $(osHost).attr("data-os-scroll", JSON.stringify(os.scroll().position));

            // Make sure overlayScrollbars isn't listening on page load
            os.sleep();
        });
    });




    // SCROLLBAR DETECTION

    // insert scrollbar detection element
    var scrollCheck = document.createElement("div");
    scrollCheck.className = "scrollbar-detection";
    document.documentElement.insertBefore(scrollCheck, document.body);

    // register scrollbar detection
    try {
        var ro = new ResizeObserver(checkScrollbar);
        ro.observe(scrollCheck);
    } catch (e) {
        // fallback check
        checkScrollbar([{ target: scrollCheck }]);
    }

    // visible scrollbar detection
    function checkScrollbar(entries) {
        var element, overflowWidth;
        for (var entry in entries) {
            element = entries[entry].target;
            try {
                overflowWidth = element === document.documentElement ? window.innerWidth : element.clientWidth;
                if (overflowWidth !== element.offsetWidth) {
                    // we have visible scrollbars, add .scrollbar to html element
                    document.documentElement.classList.add("scrollbars");
                } else {
                    document.documentElement.classList.remove("scrollbars");
                }
                whenScrollbarsChecked.resolve(document.documentElement.classList.contains("scrollbars"));
            } catch (e) {
                console.warn("scrollbar detection failed", e);
            }
        }
    }

    return {
        init: initScrollbars
    }
})(jQuery);


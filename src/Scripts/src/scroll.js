var wvy = wvy || {};

wvy.scroll = (function ($) {
    var currentScroll;

    function preventScrollChaining(ev) {
        //console.log(ev.type);

        // If something else is in progress
        if (ev.returnValue === false) {
            return ev.returnValue;
        }

        // Unfortunately scrollchaining block currently only works when there is scroll on the container
        /*if (typeof CSS !== 'undefined' && CSS.supports("overscroll-behavior-y", "contain") && $("html:not(.embedded)").length) {
            // Skip if real overscrollBehavior is supported and the page is not embedded 
            return;
        }*/

        var prevent = function (value) {
            if (value !== false) {
                console.debug("preventing scroll");
                ev.preventDefault();
            }
            return value;
        };

        var overscrollFilter = function () {
            var current = $(this);
            return /none/.test(current.css("-ms-scroll-chaining")) || /(contain|none)/.test(current.css("overscroll-behavior")) || /(contain|none)/.test(current.css("overscroll-behavior-y")) || /(contain|none)/.test(current.css("--overscroll-behavior")) || /(contain|none)/.test(current.css("--overscroll-behavior-y"));
        };

        var overflowFilter = function () {
            var current = $(this);
            return /(auto|scroll)/.test(current.css("overflow-y"));
        };

        var delta, up;

        // Get scroll data
        if (currentScroll !== null && ev.touches && ev.touches.length) {
            delta = ev.touches[0].clientY - currentScroll;
            up = delta > 0;

            currentScroll = ev.touches[0].clientY;
        } else {
            delta = ev.wheelDeltaY || -ev.deltaY;
            up = delta > 0;
        }

        // Get closest scrollable element
        var $scrollContainer;
        var $parents = $(ev.target).parentsUntil("body").addBack();

        $scrollContainer = $parents.filter(overscrollFilter).last();

        if (!$scrollContainer.length) {
            // Check any descending scoll-element
            $scrollContainer = $parents.filter(overflowFilter).last();
            if ($scrollContainer.length) {
                // Check if $scrollContainer and embedded body is in bottom/top and prevent scroll then
                // Otherwise let it through
                // Todo: Check all scroll parents, not only the body (edge case, otherwise avoid scrolls in scrolls)
                return prevent(shouldPreventScroll($scrollContainer, ev, up, delta) && shouldPreventScroll($("html.embedded:not(.edge) body"), ev, up, delta));
            }
        }

        // Or get closest predefined element
        if (!$scrollContainer.length) {
            // Edge has a bug with scrollTop/scrollHeight when scrolling body element
            $scrollContainer = $("html.embedded:not(.edge) body");
        }

        return prevent(shouldPreventScroll($scrollContainer, ev, up, delta));
    }

    function shouldPreventScroll($scrollContainer, ev, up, delta) {
        if ($scrollContainer.length) {
            if ($scrollContainer[0].nodeName === "HTML" || $scrollContainer[0].nodeName === "BODY") {
                $scrollContainer = $(window);
            }

            var scrollTop = $scrollContainer.scrollTop(),
                scrollHeight = $scrollContainer[0].scrollHeight || $scrollContainer[0].document.documentElement.scrollHeight,
                height = $scrollContainer.innerHeight();

            
            if (!up && -delta > scrollHeight - height - scrollTop) {
                // Scrolling down, but this will take us past the bottom.
                if (ev.type === "wheel") {
                    $scrollContainer.scrollTop(scrollHeight);
                }
                return true;
            } else if (up && delta > scrollTop) {
                // Scrolling up, but this will take us past the top.
                if (ev.type === "wheel") {
                    $scrollContainer.scrollTop(0);
                }
                return true;
            }
        }
        return false;
    }


    if (typeof CSS !== 'undefined' && CSS.supports("overscroll-behavior-y", "contain") /*&& $("html:not(.embedded)").length*/) {
        // Skip if real overscrollBehavior is supported and the page is not embedded 
        return;
    }

    // Register overscroll-behavior polyfill
    try {
        document.addEventListener("touchstart", function (ev) {
            currentScroll = ev.touches[0].clientY;
        }, { passive: false });
    } catch (e){
        document.addEventListener("touchstart", function (ev) {
            currentScroll = ev.touches[0].clientY;
        });
    }

    try {
        document.addEventListener("touchmove", preventScrollChaining, { passive: false });
    } catch (e) {
        document.addEventListener("touchmove", preventScrollChaining)
    }

    document.addEventListener("wheel", preventScrollChaining);

})(jQuery);


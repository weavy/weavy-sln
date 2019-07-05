var wvy = wvy || {};

wvy.scrollbar = (function () {
    
    // Scrollbar detection (mainly for MacOS/Chrome)
    function checkScrollbar(entries) {
        var hasScrollbar, element, overflowWidth;
        for (var entry in entries) {
            element = entries[entry].target;
            try {
                overflowWidth = element === document.documentElement ? window.innerWidth : element.clientWidth;
                hasScrollbar = overflowWidth !== element.offsetWidth

                if (hasScrollbar) {
                    document.documentElement.classList.add("scrollbar");
                    document.documentElement.classList.remove("overlay-scrollbar");
                } else {
                    document.documentElement.classList.remove("scrollbar");
                    document.documentElement.classList.add("overlay-scrollbar");
                }
            } catch (e) {
                console.warn("Unable to check for scrollbars", e);
            }
        }

    }

    // Register scrollbar detection
    var roScrollbar; 
    try {
        roScrollbar = new ResizeObserver(checkScrollbar);
    } catch (e) {}

    var container = document.documentElement.appendChild(document.createElement("section"))
    var scrollCheck = document.createElement("div");
    scrollCheck.className = "scroll-check";
    scrollCheck.id = "scroll-check";
    scrollCheck.setAttribute("data-turbolinks-permanent", "");
    container.appendChild(scrollCheck);

    try {
        roScrollbar.observe(scrollCheck);
    } catch (e) {
        // Fallback check
        checkScrollbar([{ target: scrollCheck }]);
    }

    document.addEventListener("turbolinks:load", function (e) {
        container.appendChild(scrollCheck);
        checkScrollbar([{ target: scrollCheck }]);
    });

})();


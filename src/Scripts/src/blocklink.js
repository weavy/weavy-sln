/*global Turbolinks */
// makes en entire block/row clickable like <a href=""></a>
var wvy = wvy || {};

(function ($) {
    $(function () {
        var linkHref = "data-href";
        var linkTarget = "data-target";

        var linkSelectors = [
            ".block-link",
            ".dropdown-item",
            ".nav-item",
            "tr"
        ];

        var linkExceptions = [
            "[data-photoswipe]",
            "[data-preview]",
            "[data-modal]"
        ];

        var elementExceptions = [
            "a",
            ":button",
            ":submit"
        ];

        var clickExceptions = ":not(" + linkExceptions.join(", ") + ")"; // :not(.exception, [data-exception], ...)
        var clickSelector = linkSelectors.map(function (selector) { return selector + "[" + linkHref + "]" + clickExceptions }).join(", "); // .selector[data-href]:not([data-exception]), ...
        var clickElementExceptions = elementExceptions.join(", "); // a, ...

        $(document).on("click", clickSelector, function (evt) {
            var $target = $(evt.target);
            if ($target.is(clickElementExceptions) || $target.parents(clickElementExceptions).length) {
                return;
            }

            // if href is a cross-origin URL, or falls outside of the specified root, or if the value of Turbolinks.supported is false, 
            // Turbolinks performs a full page load by setting window.location
            var href = $(this).attr(linkHref);
            var target = $(this).attr(linkTarget);

            if (href.length > 0) {
                if (target && target === "_blank") {
                    window.open(href);
                } else {
                    Turbolinks.visit(href);
                }

            }
        });
    });

})(jQuery);

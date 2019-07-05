(function ($) {
    var PLUGIN_NAME = "theme";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Inject additional styles into the sealed weavy shadow dom. You may define styles by either setting weavy plugin options or by injecting them via {@link theme#addStyles}
     * 
     * @example
     * ```html
     * <style id="weavyStyleOverrides" media="not all">
     *     // media="not all" keeps it from beeing applied on the page
     *     ...
     * </style>
     * <script>
     *     var weavy = new Weavy({
     *         plugins: {
     *             theme: {
     *                 styles: ".weavy-dock{ background: red; }"
     *             }
     *         }
     *     });
     *
     *     weavy.addStyles(".weavy-wide { background: none !important; }");
     *     weavy.addStyles(document.getElementById("weavyStyleOverrides").textContent);
     * </script>
     * ```
     * 
     * @mixin theme
     * @returns {Weavy.plugins.theme}
     * @property {function} .createStyleSheet() - {@link theme#createStyleSheet}
     * @property {function} .addStyles() - {@link theme#addStyles}
     * @property {string} styles - The current styles.
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
         /** 
         *  Reference to this instance
         *  @lends theme#
         */
        var weavy = this;

        /**
         * Creates a style sheet for weavy and adds any styles
         * together with styles provided in options or by using {@link theme#addStyles}.
         * This function is automatically called on [before:build]{@link Weavy#event:build}
         * 
         * @param {string} [css] - Optional additional css that will be appended to the previously provided styles.
         */
        weavy.createStyleSheet = function (css) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            // clientCss is set on the server
            css = (css || options.clientCss) + options.styles;

            if (weavy.styles) {
                if (weavy.styles.styleSheet) {
                    weavy.styles.styleSheet.cssText = css;
                } else {
                    weavy.styles.removeChild(weavy.styles.firstChild);
                    weavy.styles.appendChild(document.createTextNode(css));
                }
            } else {
                weavy.styles = document.createElement("style");
                weavy.styles.type = "text/css";
                weavy.styles.id = weavy.getId("weavy-styles");
                weavy.styles.styleSheet ? weavy.styles.styleSheet.cssText = css : weavy.styles.appendChild(document.createTextNode(css));

                if (weavy.supportsShadowDOM) {
                    weavy.nodes.container.appendChild(weavy.styles);
                } else {
                    document.getElementsByTagName("head")[0].appendChild(weavy.styles);
                }
            }

        }

        /**
         * Add styles to the weavy stylesheet.
         * 
         * @param {string} css - The styles to apply. Full css including selectors etc may be used.
         */
        weavy.addStyles = function (css) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            css += "\n";

            if (weavy.styles) {
                if (weavy.styles.styleSheet) {
                    weavy.styles.styleSheet.cssText += css;
                } else {
                    weavy.styles.appendChild(document.createTextNode(css));
                }
            }

            options.styles += css;
        };


        weavy.on("before:build", function (e) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            // add styles
            weavy.createStyleSheet();
        });

        // Exports
        return {
            addStyles: weavy.addStyles,
            createStyleSheet: weavy.createStyleSheet,
            styles: weavy.styles
        };
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.theme.defaults = {
     *     styles: ""
     * };
     * @name defaults
     * @memberof theme
     * @type {Object}
     * @property {string} styles - Styles applied when weavy is created
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        styles: ""
    };

})(jQuery);

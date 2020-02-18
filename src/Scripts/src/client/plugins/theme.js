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
        weavy.createStyleSheet = function (css, root) {
            var options = weavy.options.plugins[PLUGIN_NAME];
            var data = weavy.data.plugins[PLUGIN_NAME];

            // clientCss is set on the server
            //css = css + options.styles;

            if (root.styles) {
                if (root.weavyStyles.styleSheet) {
                    root.weavyStyles.styleSheet.cssText = css;
                } else {
                    root.weavyStyles.removeChild(root.weavyStyles.firstChild);
                    root.weavyStyles.appendChild(document.createTextNode(css));
                }
            } else {
                root.weavyStyles = document.createElement("style");
                root.weavyStyles.type = "text/css";
                //root.styles.id = weavy.getId("weavy-styles");
                root.weavyStyles.styleSheet ? root.weavyStyles.styleSheet.cssText = css : root.weavyStyles.appendChild(document.createTextNode(css));

                if (weavy.supportsShadowDOM) {
                    root.appendChild(root.weavyStyles);
                } else {
                    document.getElementsByTagName("head")[0].appendChild(weavy.weavyStyles);
                }
            }

        }

        /**
         * Add styles to the weavy stylesheet.
         * 
         * @param {string} css - The styles to apply. Full css including selectors etc may be used.
         */
        weavy.addStyles = function (css, root) {
            var data = weavy.data.plugins[PLUGIN_NAME];

            css += "\n";

            if (root.weavyStyles) {
                if (root.weavyStyles.styleSheet) {
                    root.weavyStyles.styleSheet.cssText += css;
                } else {
                    root.weavyStyles.appendChild(document.createTextNode(css));
                }
            }

            data.styles += css;
        };


        weavy.on("create-root", function (e, createRoot) {
            if (weavy.data && weavy.data.plugins[PLUGIN_NAME]) {
                var data = weavy.data.plugins[PLUGIN_NAME];

                weavy.log("theme options", createRoot.root.id);
                // add styles
                weavy.createStyleSheet(data.clientCss, createRoot.root);
            }
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

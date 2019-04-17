(function ($) {
    var PLUGIN_NAME = "theme";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Inject additional styles into the sealed widget shadow dom. You may define styles by either setting widget plugin options or by injecting them via {@link theme#addStyles}
     * 
     * @example
     * ```html
     * <style id="widgetStyleOverrides" media="not all">
     *     // media="not all" keeps it from beeing applied on the page
     *     ...
     * </style>
     * <script>
     *     var widget = new WeavyWidget({
     *         plugins: {
     *             theme: {
     *                 styles: ".weavy-dock{ background: red; }"
     *             }
     *         }
     *     });
     *
     *     widget.addStyles(".weavy-wide { background: none !important; }");
     *     widget.addStyles(document.getElementById("widgetStyleOverrides").textContent);
     * </script>
     * ```
     * 
     * @mixin theme
     * @returns {WeavyWidget.plugins.theme}
     * @property {function} .createStyleSheet() - {@link theme#createStyleSheet}
     * @property {function} .addStyles() - {@link theme#addStyles}
     * @property {string} styles - The current styles.
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
         /** 
         *  Reference to this instance
         *  @lends theme#
         */
        var widget = this;

        /**
         * Creates a style sheet for the widget and adds any styles
         * together with styles provided in options or by using {@link theme#addStyles}.
         * This function is automatically called on [before:build]{@link WeavyWidget#event:build}
         * 
         * @param {string} [css] - Optional additional css that will be appended to the previously provided styles.
         */
        widget.createStyleSheet = function (css) {
            var options = widget.options.plugins[PLUGIN_NAME];

            css = (css || options.widgetCss) + options.styles;

            if (widget.styles) {
                if (widget.styles.styleSheet) {
                    widget.styles.styleSheet.cssText = css;
                } else {
                    widget.styles.removeChild(widget.styles.firstChild);
                    widget.styles.appendChild(document.createTextNode(css));
                }
            } else {
                widget.styles = document.createElement("style");
                widget.styles.type = "text/css";
                widget.styles.id = widget.getId("weavy-styles");
                widget.styles.styleSheet ? widget.styles.styleSheet.cssText = css : widget.styles.appendChild(document.createTextNode(css));

                if (widget.supportsShadowDOM) {
                    widget.nodes.container.appendChild(widget.styles);
                } else {
                    document.getElementsByTagName("head")[0].appendChild(widget.styles);
                }
            }

        }

        /**
         * Add styles to the widget stylesheet.
         * 
         * @param {string} css - The styles to apply. Full css including selectors etc may be used.
         */
        widget.addStyles = function (css) {
            var options = widget.options.plugins[PLUGIN_NAME];

            css += "\n";

            if (widget.styles) {
                if (widget.styles.styleSheet) {
                    widget.styles.styleSheet.cssText += css;
                } else {
                    widget.styles.appendChild(document.createTextNode(css));
                }
            }

            options.styles += css;
        };


        widget.on("before:build", function (e) {
            var options = widget.options.plugins[PLUGIN_NAME];

            // add styles
            widget.createStyleSheet();
        });

        // Exports
        return {
            addStyles: widget.addStyles,
            createStyleSheet: widget.createStyleSheet,
            styles: widget.styles
        };
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.theme.defaults = {
     *     styles: ""
     * };
     * @name defaults
     * @memberof theme
     * @type {Object}
     * @property {string} styles - Styles applied when the widget is created
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        styles: ""
    };

})(jQuery);

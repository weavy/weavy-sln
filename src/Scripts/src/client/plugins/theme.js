/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'weavy'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('weavy')
        );
    } else {
        // Browser globals (root is window)
        if (typeof root.Weavy === 'undefined' || !root.Weavy.plugins) {
            throw new Error("Weavy must be loaded before registering plugin");
        }

        factory(root.Weavy);
    }
}(typeof self !== 'undefined' ? self : this, function (Weavy) {

    /**
     * Inject additional styles into the sealed weavy shadow dom. You may define styles by either setting weavy plugin options or by injecting them via {@link ThemePlugin#addCss}
     * 
     * @example
     * ```html
     * <style id="weavyStyleOverrides" media="not all">
     *     // media="not all" keeps it from beeing applied on the page
     *     ...
     * </style>
     * <script>
     *     if (weavy.plugins.theme) {
     *         weavy.plugins.theme.createStyleSheet(weavy.nodes.container, ".weavy-panel{ background: red; }");
     *         weavy.plugins.theme.addCss(weavy.nodes.container, document.getElementById("weavyStyleOverrides").textContent);
     *     }
     *
     * </script>
     * ```
     * 
     * @mixin ThemePlugin
     * @returns {Weavy.plugins.theme}
     * @typicalname weavy.plugins.theme
     */
    var ThemePlugin = function (options) {
         /** 
         *  Reference to this instance
         *  @lends ThemePlugin#
         */
        var weavy = this;

        var supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

        /**
         * Creates a style sheet for weavy and adds any styles
         * together with styles provided in options or by using {@link ThemePlugin#addCss}.
         * This function is automatically called on [before:build]{@link Weavy#event:build}
         * 
         * @memberof ThemePlugin#
         * @param {HTMLElement} root - The dom node where the stylesheet should be attached.
         * @param {string} css - CSS for the stylesheet.
         */
        function createStyleSheet(root, css) {
            if (root.weavyStyles) {
                if (root.weavyStyles.styleSheet) {
                    root.weavyStyles.styleSheet.cssText = css;
                } else {
                    root.weavyStyles.removeChild(root.weavyStyles.firstChild);
                    root.weavyStyles.appendChild(document.createTextNode(css));
                }
            } else {
                root.weavyStyles = document.createElement("style");
                root.weavyStyles.type = "text/css";
                root.weavyStyles.styleSheet ? root.weavyStyles.styleSheet.cssText = css : root.weavyStyles.appendChild(document.createTextNode(css));

                if (supportsShadowDOM) {
                    root.appendChild(root.weavyStyles);
                } else {
                    var styleId = weavy.getId("weavy-styles");
                    if (!document.getElementById(styleId)) {
                        root.weavyStyles.id = styleId;
                        document.getElementsByTagName("head")[0].appendChild(root.weavyStyles);
                    }
                }
            }

        }

        /**
         * Add styles to an existing weavy stylesheet.
         * 
         * @memberof ThemePlugin#
         * @param {HTMLElement} root - The root containing the stylesheet
         * @param {string} css - The styles to apply. Full css including selectors etc may be used.
         */
        function addCss (root, css) {
            css += "\n";

            if (root.weavyStyles) {
                if (root.weavyStyles.styleSheet) {
                    root.weavyStyles.styleSheet.cssText += css;
                } else {
                    root.weavyStyles.appendChild(document.createTextNode(css));
                }
            }
        }

        weavy.on("create-root", function (e, createRoot) {
            if (weavy.data && weavy.data.plugins.theme) {
                var data = weavy.data.plugins.theme;

                // add styles
                createStyleSheet(createRoot.root, data.clientCss);
            }
        });

        weavy.on("destroy", function (e, destroy) {
            var styleId = weavy.getId("weavy-styles");
            var weavyStyles = document.getElementById(styleId);
            if (weavyStyles) {
                weavyStyles.remove();
            }
        });

        // Exports
        return {
            addCss: addCss,
            createStyleSheet: createStyleSheet
        };
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.theme.defaults = {
     * };
     * @ignore
     * @name defaults
     * @memberof ThemePlugin
     * @type {Object}
     */
    ThemePlugin.defaults = {
    };

    console.debug("Registering Weavy plugin: theme");
    return Weavy.plugins.theme = ThemePlugin;
}));

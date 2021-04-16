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
     * Plugin for enabling maximize button.
     * Enable the button by setting options { controls: { maximize: true }} on an app or a panel or by manually using the {@link MaximizePlugin#maximize} method.
     * @example
     * var weavy = new Weavy();
     * var space = weavy.space({
     *   key: "myspace" 
     * });
     * 
     * // Built-in maximize button
     * var app = weavy.app({
     *   key: "myfiles",
     *   type: "files"
     *   container: "#mycontainer"
     *   controls: {
     *     maximize: true
     *   }
     * });
     * 
     * // Built-in maximize button with custom maximize styling
     * var app = weavy.app({
     *   key: "myfiles",
     *   type: "files"
     *   container: "#mycontainer"
     *   controls: {
     *     maximize: {
     *       top: "3rem"
     *     }
     *   }
     * });
     * 
     * @example
     * var weavy = new Weavy();
     * var space = weavy.space({
     *   key: "myspace"
     * });
     * var app = weavy.app({
     *   key: "myfiles",
     *   type: "files"
     *   container: "#mycontainer"
     * });
     * 
     * // Set maximize using custom buttons
     * 
     * // Maximize
     * $("#myMaxButton").on("click", function() {
     *   app.panel.maximize(true);
     * });
     * 
     * // Restore
     * $("#myRestoreButton").on("click", function() {
     *   app.panel.maximize(false);
     * });
     * 
     * // Toggle and custom style
     * $("#myToggleButton").on("click", function() {
     *   app.panel.maximize(null, { top: "3rem" });
     * });
     * 
     * @mixin MaximizePlugin
     * @returns {Weavy.plugins.maximize}
     */
    var MaximizePlugin = function (options) {
        /**
         *  Reference to this instance
         *  @lends Weavy#
         */
        var weavy = this;

        /**
         * Toggling maximized mode on a panel. This means the panel will try to take up the whole window. 
         * You may add additional styles as properties in a styles object to fine tune the layout/position in your environment.
         * 
         * @param {boolean} [maximize] - Set true to maximize, false to restore, null to toggle (default).
         * @param {Object} [styles] - Object with style properties to override on the panel. The names must be the same as style names used in HTMLElement.styles
         */
        function toggleMaximize(maximize, styles) {
            weavy.log("maximize", maximize !== null ? maximize : "toggle", this.panelId);
            var styleName;

            if (maximize === false || this.maximized && maximize !== true) {
                if (this.initialStyles) {
                    weavy.debug("restoring maximize styles");

                    for (styleName in this.initialStyles) {
                        if (Object.prototype.hasOwnProperty.call(this.initialStyles, styleName)) {
                            this.node.style[styleName] = this.initialStyles[styleName];
                        }
                    }
                    delete this.initialStyles;
                }

                this.node.style.position = this.initialPosition;
                this.node.style.zIndex = this.initialZIndex;
                delete this.initialPosition;
                delete this.initialZIndex;

                this.maximized = false;
            } else {
                if (this.initialPosition === undefined) {
                    this.initialPosition = this.node.style.position;
                }
                if (this.initialZIndex === undefined) {
                    this.initialZIndex = this.node.style.zIndex;
                }
                this.node.style.position = "fixed";
                this.node.style.zIndex = 2147483647;

                // Additional/overriding styles
                if (styles && this.initialStyles === undefined) {
                    weavy.debug("setting maximize styles");

                    var initialStyles = {};
                    for (styleName in styles) {
                        if (Object.prototype.hasOwnProperty.call(styles, styleName)) {
                            initialStyles[styleName] = this.node.style[styleName];
                            this.node.style[styleName] = styles[styleName];
                        }
                    }
                    this.initialStyles = initialStyles;
                }

                this.maximized = true;
            }
        }

        function createButton(controls, panel, styles) {
            var maximize = document.createElement("div");
            maximize.className = "weavy-icon";
            maximize.title = "Maximize";
            maximize.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4,4H20V20H4V4M6,8V18H18V8H6Z" /></svg>';
            weavy.on(maximize, "click", toggleMaximize.bind(panel, null, styles));
            controls.appendChild(maximize);
        }

        weavy.on("panel-added", function (e, panelAdded) {
            // Expose maximize function
            panelAdded.panel.maximize = toggleMaximize.bind(panelAdded.panel)

            if (panelAdded.attributes.controls) {
                if (panelAdded.attributes.controls === true || panelAdded.attributes.controls.maximize) {
                    var maximizeOptions = panelAdded.attributes.controls.maximize;
                    var styles = maximizeOptions && typeof maximizeOptions !== "boolean" && maximizeOptions;
                    /*var parentContainer;
                    try {
                        parentContainer = panelAdded.panel.eventParent.eventParent.root.parent;
                    } catch (e) { }*/

                    weavy.debug("maximize: adding panel control", panelAdded.panelId);
                    var panelControls = panelAdded.panel.node.querySelector(".weavy-controls");
                    if (panelControls) {
                        createButton(panelControls, panelAdded.panel, styles);
                    }
                }
            }
        })

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.maximize.defaults = {
     * };
     * 
     * @ignore
     * @name defaults
     * @memberof MaximizePlugin
     * @type {Object}
     */
    MaximizePlugin.defaults = {
    };

    /**
     * Non-optional dependencies.
     * 
     * @ignore
     * @name dependencies
     * @memberof MaximizePlugin
     * @type {string[]}
     */
    MaximizePlugin.dependencies = [];


    // Register and return plugin
    console.debug("Registering Weavy plugin: maximize");
    return Weavy.plugins.maximize = MaximizePlugin;

}));

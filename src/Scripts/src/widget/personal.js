(function ($) {
    var PLUGIN_NAME = "personal";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Personal panel with user propfile, notifications, stars and drafts.
     * 
     * @example
     * if (widget.plugins.personal) {
     *     widget.open("personal");
     * }
     * 
     * @module personal
     * @returns {WeavyWidget.plugins.personal}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in {@link external:widget.nodes|WeavyWidget}
         * @instance
         * @member nodes
         * @extends external:widget.nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends module:personal#
         */
        var widget = this;

        /**
         * The personal {@link ./panels|panel}
         * 
         * @alias module:personal#nodes#personalPanel
         * @type {?Element}
         * @created Widget event: {@link ./widget#WeavyWidget+event_build|build}
         */
        widget.nodes.personalPanel = null;

        /**
         * The frame for the {@link module:personal#nodes#personalPanel}
         * 
         * @alias module:personal#nodes#personalFrame
         * @type {?Element}
         * @created Widget event: {@link ./widget#WeavyWidget+event_build|build}
         */
        widget.nodes.personalFrame = null;

        /**
         * The personal dock {@link ./dock#module_dock+addButton|button}
         * 
         * @alias module:personal#nodes#personalButtonContainer
         * @type {?Element}
         * @created Widget event: {@link ./widget#WeavyWidget+event_build|build}
         */
        widget.nodes.personalButtonConainer = null;

        /**
         * The actual button in the {@link module:personal#nodes#personalButtonContainer}
         * 
         * @alias module:personal#nodes#personalButton
         * @type {?Element}
         * @created Widget event: {@link ./widget#WeavyWidget+event_build|build}
         */
        widget.nodes.personalButton = null;

        // Message events
        widget.on("message", function (e, message) {
            var options = widget.options.plugins[PLUGIN_NAME];            

            switch (message.name) {
                case "personal":
                    if (widget.isAuthenticated()) {
                        widget.open(options.panelId, widget.options.url + message.url);
                    }
                    break;
            }
        });

        // Widget events
        widget.on("build", function (e, data) {
            var options = widget.options.plugins[PLUGIN_NAME];
            
            if (widget.isAuthenticated()) {
                if (!widget.nodes.personalPanel) {
                    widget.nodes.personalPanel = widget.addPanel(options.panelId, options);
                    widget.nodes.personalFrame = $("iframe", widget.nodes.personalPanel)[0];

                    if (widget.plugins.dock) {
                        widget.nodes.personalButtonContainer = widget.addButton(options.panelId, options);
                        widget.nodes.personalButton = widget.nodes.personalButtonContainer.querySelector(".weavy-button");
                        widget.nodes.personalButton.id = widget.getId("weavy-button-" + options.panelId);

                        widget.one("after:build", function () {
                            if (widget.nodes.weavyButtonContainer) {
                                widget.nodes.dock.insertBefore(widget.nodes.personalButtonContainer, widget.nodes.weavyButtonContainer.nextElementSibling);
                            } else {
                                widget.nodes.dock.insertBefore(widget.nodes.personalButtonContainer, widget.nodes.dock.firstChild);
                            }
                        });
                    }
                }
            }
        });

        widget.on("badge", function (e, data) {
            widget.setBadge(widget.nodes.personalButton, data.notifications);
        });

        widget.on("signing-out", function () {
            var options = widget.options.plugins[PLUGIN_NAME];            
            widget.removePanel(options.panelId);

            if (widget.plugins.dock) {
                widget.removeButton(options.panelId);
            }

            widget.nodes.personalPanel = null;
            widget.nodes.personalFrame = null;
            widget.nodes.personalButtonContainer = null;
            widget.nodes.personalButton = null;
        });

        // Exports (not required)
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.personal.defaults = {
     *     icon: '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg></div>',
     *     iconTransparent: true,
     *     panelId: "personal",
     *     title: "Personal",
     *     type: "system"
     * };
     * 
     * @name defaults
     * @memberof module:personal
     * @type {Object}
     * @property {html} icon - Icon for the {@link module:personal#nodes#personalButton}
     * @property {bool} iconTransparent=true - Transparency setting for the {@link module:personal#nodes#personalButton}
     * @property {string} panelId=personal - Default name of the personal panel
     * @property {sting} title - Title for the button
     * @property {string} type - Type for the panel and button
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        icon: '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg></div>',
        iconTransparent: true,
        panelId: "personal",
        title: "Personal",
        type: "system"
    };

    /**
     * Non-optional dependencies.
     * - {@link ./panels|panels}
     * 
     * @name dependencies
     * @memberof module:personal
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = ["panels"];

})(jQuery);

/**
 * @external "widget.nodes"
 * @see {@link ./widget#WeavyWidget+nodes|WeavyWidget.nodes}
 */

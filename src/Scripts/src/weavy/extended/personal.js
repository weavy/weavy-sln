(function ($) {
    var PLUGIN_NAME = "personal";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Personal panel with user propfile, notifications, stars and drafts.
     * 
     * @example
     * if (weavy.plugins.personal) {
     *     weavy.open("personal");
     * }
     * 
     * @mixin personal
     * @returns {Weavy.plugins.personal}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof personal
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends personal#
         */
        var weavy = this;

        /**
         * The personal [panel]{@link panels}
         * 
         * @alias personal#nodes#personalPanel
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.personalPanel = null;

        /**
         * The frame for the {@link personal#nodes#personalPanel}
         * 
         * @alias personal#nodes#personalFrame
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.personalFrame = null;

        /**
         * The personal dock [button]{@link dock#addButton}
         * 
         * @alias personal#nodes#personalButtonContainer
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.personalButtonConainer = null;

        /**
         * The actual button in the {@link personal#nodes#personalButtonContainer}
         * 
         * @alias personal#nodes#personalButton
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.personalButton = null;

        // Message events
        weavy.on("message", function (e, message) {
            var options = weavy.options.plugins[PLUGIN_NAME];            

            switch (message.name) {
                case "personal":
                    if (weavy.isAuthenticated()) {
                        weavy.open(options.panelId, weavy.options.url + message.url);
                    }
                    break;
            }
        });

        // Widget events
        weavy.on("build", function (e, data) {
            var options = weavy.options.plugins[PLUGIN_NAME];
            var panelOptions = weavy.extendDefaults(options, { url: null });
            
            if (weavy.isAuthenticated()) {
                if (!weavy.nodes.personalPanel) {
                    weavy.nodes.personalPanel = weavy.addPanel(options.panelId, options.url, panelOptions);
                    weavy.nodes.personalFrame = $("iframe", weavy.nodes.personalPanel)[0];

                    if (weavy.plugins.dock) {
                        weavy.nodes.personalButtonContainer = weavy.addButton(options.panelId, panelOptions);
                        weavy.nodes.personalButton = weavy.nodes.personalButtonContainer.querySelector(".weavy-button");
                        weavy.nodes.personalButton.id = weavy.getId("weavy-button-" + options.panelId);

                        weavy.one("after:build", function () {
                            if (weavy.nodes.weavyButtonContainer) {
                                weavy.nodes.dock.insertBefore(weavy.nodes.personalButtonContainer, weavy.nodes.weavyButtonContainer.nextElementSibling);
                            } else {
                                weavy.nodes.dock.insertBefore(weavy.nodes.personalButtonContainer, weavy.nodes.dock.firstChild);
                            }
                        });
                    }
                }
            }
        });

        weavy.on("badge", function (e, data) {
            weavy.setBadge(weavy.nodes.personalButton, data.notifications);
        });

        weavy.on("signing-out", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];            
            weavy.removePanel(options.panelId);

            if (weavy.plugins.dock) {
                weavy.removeButton(options.panelId);
            }

            weavy.nodes.personalPanel = null;
            weavy.nodes.personalFrame = null;
            weavy.nodes.personalButtonContainer = null;
            weavy.nodes.personalButton = null;
        });

        // Exports (not required)
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.personal.defaults = {
     *     icon: '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg></div>',
     *     iconTransparent: true,
     *     panelId: "personal",
     *     title: "Personal",
     *     type: "system"
     * };
     * 
     * @name defaults
     * @memberof personal
     * @type {Object}
     * @property {html} icon - Icon for the {@link personal#nodes#personalButton}
     * @property {bool} iconTransparent=true - Transparency setting for the {@link personal#nodes#personalButton}
     * @property {string} panelId=personal - Default name of the personal panel
     * @property {sting} title - Title for the button
     * @property {string} type - Type for the panel and button
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        icon: '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg></div>',
        iconTransparent: true,
        panelId: "personal",
        title: "Personal",
        type: "system"
    };

    /**
     * Non-optional dependencies.
     * - {@link panels}
     * 
     * @name dependencies
     * @memberof personal
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = ["panels"];

})(jQuery);


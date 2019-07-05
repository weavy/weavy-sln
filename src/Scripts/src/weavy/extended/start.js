(function ($) {
    var PLUGIN_NAME = "start";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }
    
    /**
     * The Weavy start page, which serves as Open/Search/Home/People/Spaces.
     * 
     * @example
     * if (weavy.plugins.start) {
     *     weavy.open("start");
     * }
     * 
     * @mixin start
     * @returns {Weavy.plugins.start}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof start
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends start#
         */
        var weavy = this;

        /**
         * The panel for start.
         * 
         * @alias start#nodes#startPanel
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.startPanel = null;

        /**
         * The dock [button]{@link dock#addButton} for start
         * 
         * @alias start#nodes#startButtonContainer
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.startButtonContainer = null;

        weavy.on("build", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];
            var panelOptions = weavy.extendDefaults(options, { url: null });

            if (weavy.isAuthenticated()) {
                if (!weavy.nodes.startPanel) {
                    weavy.nodes.startPanel = weavy.addPanel(options.panelId, options.url, panelOptions);

                    if (weavy.plugins.dock) {
                        weavy.nodes.startButtonContainer = weavy.addButton(options.panelId, panelOptions);

                        weavy.one("after:build", function () {
                            // Place it last
                            weavy.nodes.dock.appendChild(weavy.nodes.startButtonContainer);
                        });
                    }
                }
            }
        });

        weavy.on("signing-out", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];
            
            weavy.removePanel(options.panelId);

            if (weavy.plugins.dock) {
                weavy.removeButton(options.panelId);
            }

            weavy.nodes.startPanel = null;
            weavy.nodes.startButtonContainer = null;
        });

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.start.defaults = {
     *     icon: '<div class="weavy-icon"><svg style="transform: rotate(45deg);" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></div>',
     *     iconTransparent: true,
     *     panelId: "start",
     *     title: 'Open',
     *     url: "/",
     * };
     * 
     * @name defaults
     * @memberof start
     * @type {Object}
     * @property {html} icon - Icon for the start button
     * @property {boolean} iconTransparent - Transparency setting for the button
     * @property {string} panelId=start - The default name of the start panel
     * @property {string} title - Title for the button
     * @property {url} url - Url for the start panel
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        icon: '<div class="weavy-icon"><svg style="transform: rotate(45deg);" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></div>',
        iconTransparent: true,
        panelId: "start",
        title: 'Open',
        url: "/",
    };

    /**
     * Non-optional dependencies.
     * - {@link panels}
     * 
     * @name dependencies
     * @memberof start
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = ["panels"];

})(jQuery);



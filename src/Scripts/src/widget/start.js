(function ($) {
    var PLUGIN_NAME = "start";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }
    
    /**
     * The Weavy start page, which serves as Open/Search/Home/People/Spaces.
     * 
     * @example
     * if (widget.plugins.start) {
     *     widget.open("start");
     * }
     * 
     * @mixin start
     * @returns {WeavyWidget.plugins.start}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [WeavyWidget]{@link WeavyWidget#nodes}
         * @instance
         * @member nodes
         * @memberof start
         * @extends WeavyWidget#nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends start#
         */
        var widget = this;

        /**
         * The panel for start.
         * 
         * @alias start#nodes#startPanel
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.startPanel = null;

        /**
         * The dock [button]{@link dock#addButton} for start
         * 
         * @alias start#nodes#startButtonContainer
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.startButtonContainer = null;

        widget.on("build", function () {
            var options = widget.options.plugins[PLUGIN_NAME];

            if (widget.isAuthenticated()) {
                if (!widget.nodes.startPanel) {
                    widget.nodes.startPanel = widget.addPanel(options.panelId, options);

                    if (widget.plugins.dock) {
                        widget.nodes.startButtonContainer = widget.addButton(options.panelId, options);

                        widget.one("after:build", function () {
                            // Place it last
                            widget.nodes.dock.appendChild(widget.nodes.startButtonContainer);
                        });
                    }
                }
            }
        });

        widget.on("signing-out", function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            
            widget.removePanel(options.panelId);

            if (widget.plugins.dock) {
                widget.removeButton(options.panelId);
            }

            widget.nodes.startPanel = null;
            widget.nodes.startButtonContainer = null;
        });

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.start.defaults = {
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
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
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
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = ["panels"];

})(jQuery);



(function ($) {
    var PLUGIN_NAME = "preview";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Displaying photoswipe and image in the full browser window.
     * 
     * @module preview
     * @returns {WeavyWidget.plugins.preview}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends module:preview#
         */
        var widget = this;

        var previewingFullscreen = false;

        /**
         * Toggle preview window mode.
         * 
         * @fires external:resize
         */
        widget.togglePreview = function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            $(widget.nodes.container).toggleClass(options.className);
            widget.triggerEvent("resize", null);
        }

        widget.on("message", function (e, message) {
            var options = widget.options.plugins[PLUGIN_NAME];

            switch (message.name) {
                case "preview-close":
                    if (previewingFullscreen && $(widget.nodes.container).hasClass(options.className)) {
                        previewingFullscreen = false;
                        widget.togglePreview();
                    }
                    break;
                case "preview-open":
                    if (!$(widget.nodes.container).hasClass(options.className)) {
                        previewingFullscreen = true;
                        widget.togglePreview();
                    }
                    break;
            }
        });

        // Exports (not required)
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.preview.defaults = {
     *     className: "weavy-preview"
     * };
     * 
     * @name defaults
     * @memberof module:preview
     * @type {Object}
     * @property {string} className=weavy-preview - The class name used on {@link module:preview#togglePreview}
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        className: "weavy-preview"
    };

})(jQuery);

/**
 * @external resize
 * @see ./widget#WeavyWidget+event_resize
 */

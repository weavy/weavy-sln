(function ($) {
    var PLUGIN_NAME = "preview";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Displaying photoswipe and pdfs in the full browser window.
     * 
     * @mixin preview
     * @returns {Weavy.plugins.preview}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends preview#
         */
        var weavy = this;

        var previewingFullscreen = false;

        /**
         * Toggle preview window mode.
         * 
         * @fires Weavy#event:resize
         */
        weavy.togglePreview = function () {
            var options = weavy.options.plugins[PLUGIN_NAME];
            $(weavy.nodes.container).toggleClass(options.className);
            weavy.triggerEvent("resize", null);
        }

        weavy.on("message", function (e, message) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            switch (message.name) {
                case "preview-close":
                    if (previewingFullscreen && $(weavy.nodes.container).hasClass(options.className)) {
                        previewingFullscreen = false;
                        weavy.togglePreview();
                    }
                    break;
                case "preview-open":
                    if (!$(weavy.nodes.container).hasClass(options.className)) {
                        previewingFullscreen = true;
                        weavy.togglePreview();
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
     * Weavy.plugins.preview.defaults = {
     *     className: "weavy-preview"
     * };
     * 
     * @name defaults
     * @memberof preview
     * @type {Object}
     * @property {string} className=weavy-preview - The class name used on {@link preview#togglePreview}
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        className: "weavy-preview"
    };

})(jQuery);

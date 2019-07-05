(function ($) {
    var PLUGIN_NAME = "attach";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Filepicker plugin for attaching from Google, O365, Dropbox etc.
     * It listens to `request:origin` messages from frames and responds to the source with a `origin` message containing the `window.location.origin`.
     * 
     * _This plugin has no exposed properties or options._
     * 
     * @mixin attach
     * @returns {Weavy.plugins.attach}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends attach#
         */
        var weavy = this;

        weavy.on("message", function (e, message) {
            e = e.originalEvent || e;

            switch (message.name) {
                case "request:origin":
                    if (typeof e.source !== "undefined") {
                        e.source.postMessage({ name: 'origin', url: window.location.origin }, "*");
                    }
                    break;
            }
        });

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.attach.defaults = {
     * };
     * 
     * @ignore
     * @name defaults
     * @memberof attach
     * @type {Object}
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
    };

})(jQuery);

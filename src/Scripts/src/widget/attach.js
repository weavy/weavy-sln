(function ($) {
    var PLUGIN_NAME = "attach";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Filepicker plugin for attaching from Google, O365, Dropbox etc.
     * It listens to `request:origin` messages from frames and responds to the source with a `origin` message containing the `window.location.origin`.
     * 
     * _This plugin has no exposed properties or options._
     * 
     * @mixin attach
     * @returns {WeavyWidget.plugins.attach}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends attach#
         */
        var widget = this;

        widget.on("message", function (e, message) {
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
     * WeavyWidget.plugins.attach.defaults = {
     * };
     * 
     * @ignore
     * @name defaults
     * @memberof attach
     * @type {Object}
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
    };

})(jQuery);

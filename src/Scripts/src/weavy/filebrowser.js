(function ($) {
    var PLUGIN_NAME = "filebrowser";

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
     * @mixin filebrowser
     * @returns {Weavy.plugins.filebrowser}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends filebrowser#
         */
        var weavy = this;

        weavy.on(wvy.postal, "request:origin", weavy.getId(), function (e) {
            wvy.postal.postToSource(e, { name: 'origin', url: window.location.origin });
        });

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.filebrowser.defaults = {
     * };
     * 
     * @ignore
     * @name defaults
     * @memberof filebrowser
     * @type {Object}
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
    };

})(jQuery);

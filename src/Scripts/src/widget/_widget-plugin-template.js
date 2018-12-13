(function ($) {
    // Set you plugin name here. This name will be used for registration and options etc.
    var PLUGIN_NAME = "myplugin";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        var widget = this;

        // MY CUSTOM CODE
        // ...
    };

    // Default plugin options
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
    };

})(jQuery);

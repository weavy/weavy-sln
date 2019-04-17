(function ($) {
    /**
     * Your plugin name. This name will be used for registration and options etc.
     * Note that you have to replace the name manually for all JSDoc comments below.
     */
    var PLUGIN_NAME = "myplugin";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Describe your plugin.
     * 
     * @mixin myplugin
     * @returns {WeavyWidget.plugins.myplugin}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [WeavyWidget]{@link WeavyWidget#nodes}
         * @instance
         * @member nodes
         * @memberof myplugin
         * @extends WeavyWidget#nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends myplugin#
         */
        var widget = this;

        // MY CUSTOM CODE
        // ...

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.myplugin.defaults = {
     * };
     * 
     * @name defaults
     * @memberof myplugin
     * @type {Object}
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
    };

    /**
     * Non-optional dependencies.
     * 
     * @name dependencies
     * @memberof myplugin
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = [];

})(jQuery);

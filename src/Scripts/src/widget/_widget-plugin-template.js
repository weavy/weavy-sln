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
     * @module myplugin
     * @returns {WeavyWidget.plugins.myplugin}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in {@link external:widget.nodes|WeavyWidget}
         * @instance
         * @member nodes
         * @extends external:widget.nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends module:myplugin#
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
     * @memberof module:myplugin
     * @type {Object}
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
    };

    /**
     * Non-optional dependencies.
     * 
     * @name dependencies
     * @memberof module:myplugin
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = [];

})(jQuery);

/**
 * @external "widget.nodes"
 * @see {@link ./widget#WeavyWidget+nodes|WeavyWidget.nodes}
 */

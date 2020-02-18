(function ($) {
    /**
     * Your plugin name. This name will be used for registration and options etc.
     * Note that you have to replace the name manually for all JSDoc comments below.
     */
    var PLUGIN_NAME = "myplugin";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Describe your plugin.
     * 
     * @mixin myplugin
     * @returns {Weavy.plugins.myplugin}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof myplugin
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends myplugin#
         */
        var weavy = this;

        // MY CUSTOM CODE
        // ...

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.myplugin.defaults = {
     * };
     * 
     * @name defaults
     * @memberof myplugin
     * @type {Object}
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
    };

    /**
     * Non-optional dependencies.
     * 
     * @name dependencies
     * @memberof myplugin
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = [];

})(jQuery);

/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'weavy'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('weavy')
        );
    } else {
        // Browser globals (root is window)
        if (typeof root.Weavy === 'undefined' || !root.Weavy.plugins) {
            throw new Error("Weavy must be loaded before registering plugin");
        }

        factory(root.Weavy);
    }
}(typeof self !== 'undefined' ? self : this, function (Weavy) {

    /**
     * Plugin for enabling url fragment (hash) deep links. 
     * 
     * Note: This plugin is disabled by default and must be enabled in weavy options.
     * 
     * @example
     * // Url with last opened panel only
     * var weavy = new Weavy({ 
     *   plugins: { 
     *     deeplinks: true 
     *   }
     * })
     * 
     * @example
     * // Url with all opened panels
     * var weavy = new Weavy({ 
     *   plugins: { 
     *     deeplinks: {
     *       multiple: true
     *     }
     *   }
     * })
     * 
     * @mixin DeeplinksPlugin
     * @returns {Weavy.plugins.deeplinks}
     */
    var DeeplinksPlugin = function (options) {
        /**
         *  Reference to this instance
         *  @lends DeeplinksPlugin#
         */
        var weavy = this;

        weavy.on("history", function (e, history) {
            var options = weavy.options.plugins.deeplinks;

            var allOpenPanels = history.globalState.panels.filter(function (panelState) {
                return panelState.changedAt && panelState.isOpen;
            });
            var lastOpenPanel = allOpenPanels.slice(-1);
            var panelUrls = (options.multiple ? allOpenPanels : lastOpenPanel).map(function (panelState) { return panelState.weavyUri; });
            history.url = panelUrls.length ? "#" + panelUrls.join(options.delimiter) : history.url.split("#")[0];

            return history;
        });


        // Initital state
        var state = weavy.history.getBrowserState();

        // Set a state from the URL if no state is present
        if (!state && window.location.hash) {
            var weavyUris = window.location.hash.replace(/^#/, "").split(options.delimiter);
            var urlState = weavy.history.getStateFromUri(weavyUris);

            if (urlState.panels.length) {
                weavy.debug("deeplinks: setting initial state");
                weavy.history.setBrowserState(urlState, "replace");
            }
        }

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.deeplinks.defaults = {
     *   multiple: false,
     *   delimiter: ","
     * };
     * 
     * @name defaults
     * @memberof DeeplinksPlugin
     * @type {Object}
     * @property {Boolean} multiple=false - Should all opened panels be added to the hash?
     * @property {String} delimiter="," - Separator for multiple weavy URIs in the hash.
     */
    DeeplinksPlugin.defaults = {
        multiple: false,
        delimiter: ","
    };

    /**
     * Non-optional dependencies.
     * 
     * @name dependencies
     * @memberof DeeplinksPlugin
     * @type {string[]}
     */
    DeeplinksPlugin.dependencies = [];


    // Register and return plugin
    console.debug("Registering Weavy plugin: deeplinks");
    return Weavy.plugins.deeplinks = DeeplinksPlugin;

}));

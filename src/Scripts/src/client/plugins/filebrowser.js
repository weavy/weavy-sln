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
     * Filepicker plugin for attaching from Google, O365, Dropbox etc.
     * It listens to `request:origin` messages from frames and responds to the source with a `origin` message containing the `window.location.origin`.
     * 
     * _This plugin has no exposed properties or options._
     * 
     * @mixin FileBrowserPlugin
     * @returns {Weavy.plugins.filebrowser}
     * @typicalname weavy.plugins.filebrowser
     */
    var FileBrowserPlugin = function (options) {
        /** 
         *  Reference to this instance
         *  @lends FileBrowserPlugin#
         */
        var weavy = this;


        // TODO: This belongs in wvy.postal or wvy.browser instead 
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
     * @memberof FileBrowserPlugin
     * @type {Object}
     */
    FileBrowserPlugin.defaults = {
    };

    // Register and return plugin
    console.debug("Registering Weavy plugin: filebrowser");
    return Weavy.plugins.filebrowser = FileBrowserPlugin;
}));

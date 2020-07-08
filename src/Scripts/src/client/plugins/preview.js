/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            'weavy'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('weavy')
        );
    } else {
        // Browser globals (root is window)
        if (typeof Weavy === 'undefined' || !Weavy.plugins) {
            throw new Error("Weavy must be loaded before registering plugin");
        }

        factory(jQuery, Weavy);
    }
}(typeof self !== 'undefined' ? self : this, function ($, Weavy) {

    /**
     * Displaying photoswipe and pdfs in the full browser window.
     * 
     * @mixin PreviewPlugin
     * @returns {Weavy.plugins.preview}
     * @typicalname weavy
     */
    var PreviewPlugin = function (options) {
        /** 
         *  Reference to this instance
         *  @lends PreviewPlugin#
         */
        var weavy = this;

        weavy.on(wvy.postal, "preview-close", weavy.getId(), function (e, message) {
            weavy.nodes.previewPanel.close();
        });

        // DOCUMENT PREVIEW
        weavy.on(wvy.postal, "preview-open", weavy.getId(), function (e, message) {
            weavy.log("opening preview", message);
            weavy.nodes.previewPanel.open().then(function () {
                weavy.nodes.previewPanel.postMessage({ name: "preview-options", options: message.options });
            });
            weavy.one(wvy.postal, "request:preview-options", weavy.getId(), function (e) {
                weavy.nodes.previewPanel.postMessage({ name: "preview-options", options: message.options });
            })
        });

        // IMAGE PREVIEW
        weavy.on(wvy.postal, "photoswipe-open", weavy.getId(), function (e, message) {
            weavy.log("opening photoswipe", message);
            weavy.nodes.previewPanel.open().then(function () {
                weavy.nodes.previewPanel.postMessage({ name: "photoswipe-options", options: message.options });
            });
            weavy.one(wvy.postal, "request:photoswipe-options", weavy.getId(), function (e) {
                weavy.nodes.previewPanel.postMessage({ name: "photoswipe-options", options: message.options });
            })
        });

        weavy.on("build", function (e, build) {
            if (!weavy.nodes.previewPanel) {
                weavy.nodes.previewPanel = weavy.nodes.panels.preview.addPanel(options.frameName, "/e/preview", { controls: { close: true }, persistent: true, preload: true });
                weavy.on("panel-close", function (e, closePanel) {
                    if (closePanel.panelId === options.frameName) {
                        weavy.log("preview panel close");
                    }
                });
            }
        })

        // Exports (not required)
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.preview.defaults = {
     *     frameName: "preview"
     * };
     * 
     * @name defaults
     * @memberof PreviewPlugin
     * @type {Object}
     */
    PreviewPlugin.defaults = {
        frameName: "preview"
    };

    console.debug("Registering Weavy plugin: preview");

    return Weavy.plugins.preview = PreviewPlugin
}));

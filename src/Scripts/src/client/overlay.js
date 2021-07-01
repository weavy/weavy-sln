/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            '../promise',
            '../utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('../promise'),
            require('../utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyOverlays = factory(root.wvy.promise, root.wvy.utils);
    }
}(typeof self !== 'undefined' ? self : this, function (WeavyPromise, WeavyUtils) {
    //console.debug("overlay.js");

    /**
     * @class WeavyOverlay
     * @classdesc Class for handling panel overlays.
     */

    /**
     * Class for handling panel overlays.
     * 
     * @constructor
     * @hideconstructor
     * @param {Weavy} weavy - Weavy instance
     */
    var WeavyOverlays = function (weavy, rootParent) {

        /**
         *  Reference to this instance
         *  @lends WeavyOverlay#
         */
        var weavyOverlays = this;

        var _panels = [];
        var _overlays = new Map();

        var root = weavy.createRoot.call(weavy, rootParent);
        weavy.nodes.container = root.root;
        weavy.nodes.overlay = root.container;

        weavy.nodes.overlay.classList.add("weavy-overlay");

        this.overlay = function (overlayOptions) {
            let overlayId = overlayOptions.overlayId;
            let overlay = _overlays.get(overlayId);

            if (!overlay) {
                let overlayUrl = new URL(overlayOptions.url, weavy.url);
                overlay = weavy.nodes.panels.preview.addPanel(overlayId, overlayUrl, overlayOptions);

                // TODO: move to panels
                overlay.node.classList.add("weavy-panel-light");

                overlay.on("before:panel-open", function (e, openPanel) {
                    overlay.loadingStarted(true);
                });

                _overlays.set(overlayId, overlay);
            } 

            return overlay;
        }

        /**
         * Tries to focus an overlay panel
         * 
         * @param {Object} open - Object with panel data
         * @property {string} open.panelId - The id of the panel to focus;
         */
        function focus(open) {
            var panel = panel.get(open.panelId)
            if (panel) {
                try {
                    panel.frame.contentWindow.focus();
                } catch (e) {
                    panel.frame.focus();
                }
            }
        }

        // ATTACHMENT PREVIEW
        weavy.on(wvy.postal, "overlay-open", weavy.getId(), function (e, overlayOptions) {
            weavy.log("opening overlay");
            var overlayUrl = new URL(overlayOptions.url, weavy.url).href;

            this.overlay(overlayOptions).open(overlayUrl).then(focus);
        });
    };

    return WeavyOverlays;
}));

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
     * Displaying content and attachments in the full browser window.
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

        function requestPrev(e) {
            if (weavy.nodes.previewPanel.isOpen) {
                weavy.nodes.previewPanel.postMessage({ name: "request:prev" });
                e.stopImmediatePropagation();
            } else if (weavy.nodes.contentPanel.isOpen) {
                e.stopImmediatePropagation();
                weavy.nodes.contentPanel.postMessage({ name: "request:prev" });
            }
        }

        function requestNext(e) {
            if (weavy.nodes.previewPanel.isOpen) {
                e.stopImmediatePropagation();
                weavy.nodes.previewPanel.postMessage({ name: "request:next" });
            } else if (weavy.nodes.contentPanel.isOpen) {
                e.stopImmediatePropagation();
                weavy.nodes.contentPanel.postMessage({ name: "request:next" });
            }
        }

        $(document).on("keyup", function (e) {
            if (e.which === 27) { // Esc
                if (weavy.nodes.previewPanel.isOpen) {
                    e.stopImmediatePropagation();
                    weavy.nodes.previewPanel.close();
                } else if (weavy.nodes.contentPanel.isOpen) {
                    e.stopImmediatePropagation();
                    weavy.nodes.contentPanel.close();
                }
            }
            if (e.which === 37) { // Left
                requestPrev(e);
            }
            if (e.which === 39) { // Right
                requestNext();
            }
        })

        weavy.on(wvy.postal, "request:prev", weavy.getId(), function (e, message) {
            weavy.log("bouncing request:prev");
            requestPrev(e);
        });

        weavy.on(wvy.postal, "request:next", weavy.getId(), function (e, message) {
            weavy.log("bouncing request:next");
            requestNext(e);
        });

        // ATTACHMENT PREVIEW
        weavy.on(wvy.postal, "preview-open", weavy.getId(), function (e, message) {
            weavy.log("opening preview");
            var previewUrl = weavy.httpsUrl(message.url, weavy.options.url);
            if (message.thumb) {
                previewUrl += "#thumb:" + encodeURIComponent(message.thumb);
            }
            weavy.nodes.previewPanel.isLoaded = false;
            weavy.nodes.previewPanel.open(previewUrl).then(focus);
        });

        function focus(open) {
            var panel = open.panelId === options.contentFrameName ? weavy.nodes.contentPanel : weavy.nodes.previewPanel
            try {
                panel.frame.contentWindow.focus();
            } catch (e) {
                panel.frame.focus();
            }
        }

        // CONTENT PREVIEW
        weavy.on(wvy.postal, "content-open", weavy.getId(), function (e, message) {
            weavy.log("opening content");

            var contentUrl = weavy.httpsUrl(message.url, weavy.options.url);
            if (message.thumb) {
                contentUrl += "#thumb:" + encodeURIComponent(message.thumb);
            }

            weavy.nodes.contentPanel.isLoaded = false;
            weavy.nodes.contentPanel.open(contentUrl).then(focus);
        });

        weavy.on("build", function (e, build) {
            // Content panel
            if (!weavy.nodes.contentPanel) {
                weavy.nodes.contentPanel = weavy.nodes.panels.preview.addPanel(options.contentFrameName, "/content/", { controls: { close: true }, persistent: true, preload: true });
                weavy.nodes.contentPanel.classList.add("weavy-panel-light");

                weavy.nodes.contentPanel.on("after:panel-close", function (e, closePanel) {
                    weavy.debug("content panel close");
                    weavy.nodes.contentPanel.isLoaded = false;
                });
            }

            // Preview panel
            if (!weavy.nodes.previewPanel) {
                weavy.nodes.previewPanel = weavy.nodes.panels.preview.addPanel(options.previewFrameName, "/attachments/", { controls: { close: true }, persistent: true, preload: true });
                weavy.nodes.previewPanel.on("after:panel-close", function (e, closePanel) {
                    weavy.debug("preview panel close");
                    if (weavy.nodes.contentPanel.isOpen) {
                        focus({ panelId: options.contentFrameName });
                    }
                    weavy.nodes.previewPanel.isLoaded = false;
                });
            }
        })

        function open(url) {
            var attachmentUrl = /^(.*)(\/attachments\/[0-9]+\/?)(.+)?$/.exec(url);
            if (attachmentUrl) {
                return weavy.nodes.previewPanel.open(url).then(focus)
            } else {
                weavy.nodes.previewPanel.close();
                return weavy.nodes.contentPanel.open(url).then(focus);
            }
        }

        function closeAll() {
            return $.when(weavy.nodes.previewPanel.close(), weavy.nodes.contentPanel.close());
        }

        // Exports (not required)
        return {
            open: open,
            closeAll: closeAll
        }
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
        previewFrameName: "preview",
        contentFrameName: "content"
    };

    console.debug("Registering Weavy plugin: preview");

    return Weavy.plugins.preview = PreviewPlugin
}));

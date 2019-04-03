(function ($) {
    var PLUGIN_NAME = "fallback";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Displaying panels in a popup window when frames are blocked. 
     * It handles {@link ./widget#WeavyWidget+open|widget.open()} when {@link ./widget#WeavyWidget+isBlocked|widget.isBlocked} is `true`.
     * If a weavy browser extenstion is active it will try to use it for managing the popup window.
     * 
     * @module fallback
     * @returns {WeavyWidget.plugins.fallback}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends module:fallback#
         */
        var widget = this;

        var lastPanel;
        var fallbackWindow;

        // polyfill for ie
        if (!String.prototype.endsWith) {
            String.prototype.endsWith = function (search, this_len) {
                if (this_len === undefined || this_len > this.length) {
                    this_len = this.length;
                }
                return this.substring(this_len - search.length, this_len) === search;
            };
        }

        function removeParameter(url, parameter) {
            if (url && parameter) {
                var urlparts = url.split("?");
                if (urlparts.length >= 2) {

                    var prefix = encodeURIComponent(parameter) + "=";
                    var pars = urlparts[1].split(/[&;]/g);

                    for (var i = pars.length; i-- > 0;) {
                        if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                            pars.splice(i, 1);
                        }
                    }
                    url = urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
                }
            }
            return url;
        }

        // open in a normal window when iframes are not allowed
        function fallback(panel, destination) {
            // fallback to windows via extension
            widget.close();

            var url = destination;

            if (!url) {
                var bubbleFrame = $(widget.nodes.panels).find(widget.getId("#weavy-panel-" + panel)).find("iframe")[0];

                if (bubbleFrame) {
                    // get url for bubble
                    url = bubbleFrame.src ? bubbleFrame.src : bubbleFrame.dataset.src;
                }

                if(!url) {
                    // NOTE: remove panel param to trigger standalone bahaviour
                    url = removeParameter(widget.options[panel + "Url"], "panel");
                }

                // TODO: move to context plugin?
                // fix for referrer not being set
                if (url.endsWith("/widget/connect")) {
                    url += "?referrer=" + encodeURIComponent(window.location.origin);
                }
            }

            if (url) {
                var force = destination || panel !== lastPanel
                openWindow(url, force);
                lastPanel = panel;
            }
        }

        function openWindow(url, force) {
            // use the button container to get measurments
            var measure = $(widget.nodes.dockContainer);

            // NOTE: update if width of panel changes
            var panelWidth = 384;
            var nudge = $(widget.nodes.container).hasClass("weavy-left") ? -65 : (panelWidth);
            var offset = measure.offset();

            message = {
                "name": "fallback",
                "url": url,
                "key": "fallback", //panel,
                "left": Math.round(offset.left + (window.screenLeft || window.screenX) - nudge),
                "height": Math.round(measure.height() - 20),
                "top": Math.round((window.screenTop || window.screenY) + 96 - 8), // NOTE: adding 96 to account for chrome address bar
                "width": Math.round(panelWidth),
                "force": force ? true : false
            };

            var windowFeatures = "menubar=no,location=no,resizable=yes,scrollbars=yes,status=no";
            var windowPosition = "left=" + message.left + ",top=" + (message.top - 96 + 24) + ",height=" + message.height + ",width=" + message.width;


            // Todo: Add some window handling
            try {
                if (chrome !== undefined && chrome.runtime !== undefined) {
                    chrome.runtime.sendMessage(null, message, function (response) { });
                } else {
                    fallbackWindow = window.open(message.url, "weavy-" + message.name + "-" + message.key, windowFeatures + "," + windowPosition);
                    widget.on(fallbackWindow, "load", function () {
                        // start testing for blocked iframe             
                        widget.isBlocked = true;
                        try {
                            widget.log("window.load");
                            this.contentWindow.postMessage({ "name": "ping" }, "*");
                        } catch (e) { widget.warn("Frame postMessage is blocked", e); }

                    });
                }
            } catch (e) {
                fallbackWindow = window.open(message.url, "weavy-" + message.name + "-" + message.key, windowFeatures + "," + windowPosition);
            }
        }

        widget.on("open", function (e, open) {
            if (widget.isBlocked) {
                fallback(open.panelId, open.destination);
            }
        });

        widget.on("toggle", function (e, toggle) {
            if (widget.isBlocked) {
                fallback(toggle.panelId);
            }
        });

        widget.on("destroy", function () {
            if (fallbackWindow) {
                try {
                    if (!fallbackWindow.closed) {
                        fallbackWindow.close();
                        fallbackWindow = null;
                    }
                } catch (e) {
                    widget.warn("Could not close opened window")
                }
            }
        });

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.fallback.defaults = {
     * };
     * 
     * @ignore
     * @name defaults
     * @memberof module:fallback
     * @type {Object}
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
    };

    /**
     * Non-optional dependencies.
     * - {@link ./panels|panels}
     * 
     * @name dependencies
     * @memberof module:fallback
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = ["panels"];

})(jQuery);

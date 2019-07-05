/*eslint-env webextensions */

(function ($) {
    var PLUGIN_NAME = "fallback";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Displaying panels in a popup window when frames are blocked. 
     * It handles [weavy.open()]{@link Weavy#open} when [weavy.isBlocked]{@link Weavy#isBlocked} is `true`.
     * If a weavy browser extenstion is active it will try to use it for managing the popup window.
     * 
     * @mixin fallback
     * @returns {Weavy.plugins.fallback}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends fallback#
         */
        var weavy = this;

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
            weavy.close();

            var url = destination;

            if (!url) {
                var bubbleFrame = $(weavy.nodes.panels).find(weavy.getId("#weavy-panel-" + panel)).find("iframe")[0];

                if (bubbleFrame) {
                    // get url for bubble
                    url = bubbleFrame.src ? bubbleFrame.src : bubbleFrame.dataset.src;
                }

                if(!url) {
                    // NOTE: remove panel param to trigger standalone bahaviour
                    url = removeParameter(weavy.options[panel + "Url"], "panel");
                }

                // TODO: move to context plugin?
                // fix for referrer not being set
                if (url.endsWith("/client/connect")) {
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
            var measure = $(weavy.nodes.dockContainer);

            // NOTE: update if width of panel changes
            var panelWidth = 384;
            var nudge = $(weavy.nodes.container).hasClass("weavy-left") ? -65 : (panelWidth);
            var offset = measure.offset();

            var message = {
                "name": "fallback",
                "url": weavy.httpsUrl(url, weavy.options.url),
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
                    weavy.on(fallbackWindow, "load", function () {
                        // start testing for blocked iframe             
                        weavy.isBlocked = true;
                        try {
                            weavy.log("window.load");
                            this.contentWindow.postMessage({ "name": "ping" }, "*");
                        } catch (e) { weavy.warn("Frame postMessage is blocked", e); }

                    });
                }
            } catch (e) {
                fallbackWindow = window.open(message.url, "weavy-" + message.name + "-" + message.key, windowFeatures + "," + windowPosition);
            }
        }

        weavy.on("open", function (e, open) {
            if (weavy.isBlocked) {
                fallback(open.panelId, open.destination);
            }
        });

        weavy.on("toggle", function (e, toggle) {
            if (weavy.isBlocked) {
                fallback(toggle.panelId);
            }
        });

        weavy.on("destroy", function () {
            if (fallbackWindow) {
                try {
                    if (!fallbackWindow.closed) {
                        fallbackWindow.close();
                        fallbackWindow = null;
                    }
                } catch (e) {
                    weavy.warn("Could not close opened window")
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
     * Weavy.plugins.fallback.defaults = {
     * };
     * 
     * @ignore
     * @name defaults
     * @memberof fallback
     * @type {Object}
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
    };

    /**
     * Non-optional dependencies.
     * - {@link panels}
     * 
     * @name dependencies
     * @memberof fallback
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = ["panels"];

})(jQuery);

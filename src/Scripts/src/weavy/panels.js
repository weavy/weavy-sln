(function ($) {
    var PLUGIN_NAME = "panels";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Creating and handling panels that has frames for app pages. 
     * Panels are mostly automatically managed and preloaded when needed.
     * 
     * @example
     * weavy.on("load", function () {
     *     if (weavy.isAuthenticated()) {
     *         weavy.addPanel("space-1", "/spaces/1/", { type: "space"  });
     *     }
     * });
     * 
     * @mixin panels
     * @returns {Weavy.plugins.panels}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof panels
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends panels#
         */
        var weavy = this;

        var preloading = false;
        var _addPanels = [];

        /**
         * Container for all panels
         * 
         * @alias panels#nodes#panels
         * @type {?Element}
         */
        weavy.nodes.panels = null;

        /**
         * Create a panel that has frame handling. If the panel already exists it will return the existing panel.
         * 
         * @param {string} panelId - The id of the panel.
         * @param {url} [url] - Optional url. The page will not be loaded until {@link panels#preloadFrame} or {@link Weavy#open} is called.
         * @param {Object} [attributes] - All panel attributes are optional
         * @param {string} attributes.type - Type added as data-type attribute.
         * @param {boolean} attributes.persistent - Should the panel remain when {@link panels#removePanel} or {@link panels#clearPanels} are called?
         * @returns {Element}
         * @emits panels#event:panel-added
         */
        weavy.addPanel = function (panelId, url, attributes) {
            if (!panelId) {
                weavy.error("Weavy panels.addPanel() is missing panelId");
                return;
            }


            // Make it possible to omit url
            if (typeof url !== "string" && !attributes) {
                attributes = arguments[1];
                url = null;
            }

            if (attributes && attributes.url) {
                weavy.warn("addPanel: Using attributes.url is deprecated. Use addPanel(panelId, url, attributes) instead.");
                url = attributes.url;
            }

            var panelElementId = weavy.getId("weavy-panel-" + panelId);
            var domPanel = weavy.nodes.panels && weavy.nodes.panels.querySelector("#" + panelElementId);
            var pendingPanel = _addPanels.filter(function (panel) { return panel.id === panelElementId; }).pop();

            if (domPanel || pendingPanel) {
                weavy.warn("Weavy panels.addPanel(" + panelId + ") is already created");
                return domPanel || pendingPanel;
            }

            if (!$.isPlainObject(attributes)) {
                attributes = {};
            }

            // panel
            var panel = document.createElement("div");
            panel.className = "weavy-panel";
            panel.id = panelElementId;
            panel.dataset.id = panelId;

            // frame
            var frame = document.createElement("iframe");
            frame.className = "weavy-panel-frame";
            frame.id = weavy.getId("weavy-panel-frame-" + panelId);
            frame.name = weavy.getId("weavy-panel-frame-" + panelId);
            frame.allowFullscreen = 1;

            if (url) {
                frame.dataset.src = weavy.httpsUrl(url, weavy.options.url);
            }

            if (attributes.type) {
                frame.setAttribute('data-type', attributes.type);
                panel.setAttribute("data-type", attributes.type);
            }

            if (attributes.persistent) {
                panel.setAttribute("data-persistent", true);
            }

            panel.appendChild(weavy.renderControls.call(weavy, "weavy-panel-" + panelId));
            panel.appendChild(frame);

            if (weavy.nodes.panels) {
                weavy.nodes.panels.appendChild(panel);
            } else {
                _addPanels.push(panel);
            }

            /**
             * Triggered when a panel is added
             * 
             * @event panels#panel-added
             * @category events
             * @returns {Object}
             * @property {Element} panel - The created panel
             * @property {string} panelId - The id of the panel
             * @property {url} url - The url for the frame.
             * @property {Object} attributes - Panel attributes
             * @property {string} attributes.type - Type of the panel.
             * @property {boolean} attributes.persistent - Will the panel remain when {@link panels#removePanel} or {@link panels#clearPanels} are called?
             */
            weavy.triggerEvent("panel-added", { panel: panel, panelId: panelId, url: url, attributes: attributes });

            return panel;
        };

        /**
         * Removes a panel. If the panel is open it will be closed before it's removed.
         * 
         * @param {string} panelId - The id of the panel to remove
         * @param {boolean} [force] - True will remove the panel even if it's persistent
         * @emits panels#panel-removed
         */
        weavy.removePanel = function (panelId, force) {
            var $panel = $(weavy.nodes.panels).children(weavy.getId("#weavy-panel-removed-" + panelId) + ", " + weavy.getId("#weavy-panel-" + panelId)).first();
            if ($panel.length && (!$panel.data("persistent") || force)) {
                var frame = $panel.find("iframe")[0];

                if ($panel.hasClass("weavy-open")) {
                    $panel[0].id = weavy.getId("weavy-panel-removed-" + panelId);
                    weavy.timeout(0).then(function () {
                        weavy.close().then(function () {
                            weavy.removePanel(panelId);
                        });
                    });
                } else {
                    wvy.connection.removeWindow(frame.contentWindow);
                    $panel.remove();

                    /**
                     * Triggered when a panel has been removed.
                     * 
                     * @event panels#panel-removed
                     * @category events
                     * @returns {Object}
                     * @property {string} panelId - Id of the removed panel
                     */
                    weavy.triggerEvent("panel-removed", { panelId: panelId });
                }
            }
        };

        /**
         * Removes all panels except persistent panels.
         */
        weavy.clearPanels = function () {
            $(weavy.nodes.panels).children().each(function () {
                weavy.removePanel(this.dataset.id);
            });
        };

        /**
         * Create panel controls for expand/collapse and close. Set control settings in {@link panels.defaults|options}
         * 
         * @returns {Element} 
         */
        weavy.renderControls = function () {
            var options = weavy.options.plugins[PLUGIN_NAME];

            var controls = document.createElement("div");
            controls.className = "weavy-controls";

            if (options.controls) {
                if (options.controls === true || options.controls.expand) {
                    var expand = document.createElement("div");
                    expand.className = "weavy-icon weavy-expand";
                    expand.title = "Expand";
                    expand.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12.199 4.8008v2h3.5898l-4.4883 4.4883-0.01172 0.01172-4.4883 4.4883v-3.5898h-2v7h7v-2h-3.5898l4.4883-4.4883 0.01172-0.01172 4.4883-4.4883v3.5898h2v-7h-7z"/></svg>';
                    weavy.on(expand, "click", weavy.resize.bind(weavy));
                    controls.appendChild(expand);

                    var collapse = document.createElement("div");
                    collapse.className = "weavy-icon weavy-collapse";
                    collapse.title = "Collapse";
                    collapse.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m18.5 4.0898l-4.5 4.5v-3.5898h-2v7h7v-2h-3.59l4.5-4.5-1.41-1.4102zm-6.5 7.9102h-7v2h3.5898l-4.5 4.5 1.4102 1.41 4.5-4.5v3.59h2v-7z"/></svg>';
                    weavy.on(collapse, "click", weavy.resize.bind(weavy));
                    controls.appendChild(collapse);
                }

                if (options.controls === true || options.controls.close) {
                    var close = document.createElement("div");
                    close.className = "weavy-icon";
                    close.title = "Close";
                    close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
                    weavy.on(close, "click", weavy.close.bind(weavy, null));
                    controls.appendChild(close);
                }
            }

            return controls;
        };

        /**
         * Preload a frame. The frame needs to have data-src attribute set instead of src attribute. 
         * Panels created using {@link panels#addPanel} have the appropriate settings for preload.
         * If the frame belongs to a panel it will triggger loading animations.
         * 
         * @param {FrameElement} frameElement - The frame that should be preloaded.
         * @param {Function} [callback] - Function called when the frame has loaded
         */
        weavy.preloadFrame = function (frameElement, callback) {
            var panel = $(frameElement).closest(".weavy-panel").get(0);
            var panelTarget = panel && panel.dataset.id;
            var delayedFrameLoad = function () {
                if (!frameElement.src && frameElement.dataset.src) {
                    if (panelTarget) {
                        weavy.setPanelLoading(panelTarget, true);
                    }
                    if (typeof callback === "function") {
                        $(frameElement).one("load", callback);
                    }
                    frameElement.src = frameElement.dataset.src;
                }
            };

            // Wait for idle
            if (window.requestIdleCallback) {
                window.requestIdleCallback(delayedFrameLoad);
            } else {
                if (document.readyState === "complete") {
                    delayedFrameLoad();
                } else {
                    $(document).one("load", delayedFrameLoad);
                }
            }
        }

        /**
         * Preload all frames. Frames will be loaded sequentially starting with system frames. 
         * Preloading is ignored on mobile devices.
         * @param {boolean} [force] - Force preloading for all frames, otherwise only system frames will be preloaded.
         */
        weavy.preloadFrames = function (force) {
            if (weavy.options.isMobile) {
                return;
            }

            if (!preloading) {
                weavy.debug("starting frames preloading");
                var $currentlyLoadingFrames = $(weavy.nodes.panels).find("iframe[src][data-src]");
                if ($currentlyLoadingFrames.length) {
                    // Wait until user loaded frames has loaded
                    $currentlyLoadingFrames.first().one("load", function () { weavy.preloadFrames(force); });
                    return;
                }
            }
            if (!preloading || force) {
                preloading = true;

                var $systemFrames = $(weavy.nodes.panels).find("iframe[data-src]:not([data-type]):not([src])");
                if ($systemFrames.length) {
                    $systemFrames.each(function () { weavy.preloadFrame(this, function () { weavy.preloadFrames(force) }) });
                } else if (force && !$(weavy.nodes.panels).find("iframe[src][data-src]:not([data-type])").length) {
                    // After preloading system frames is done
                    var $panels = $(weavy.nodes.panels).find("iframe[data-type]:not([src])");
                    if ($panels.length) {
                        weavy.preloadFrame($panels[0]);
                        weavy.timeout(1500).then(weavy.preloadFrames.bind(this, "all"));
                    }
                }
            }
        }

        weavy.on("panel-loading", function (e, panelLoading) {
            var $panel = $(weavy.getId("#weavy-panel-" + panelLoading.panelId), weavy.nodes.container);

            if (panelLoading.isLoading) {
                $panel.addClass(panelLoading.fillBackground ? "weavy-loading weavy-loading-fill" : "weavy-loading");
            } else {
                $panel.removeClass("weavy-loading weavy-loading-fill");
            }
        });

        // close all bubbles
        weavy.on("close", function (e) {
            var $openFrame = $(".weavy-panel.weavy-open iframe", weavy.nodes.panels);

            $(".weavy-panel", weavy.nodes.panels).removeClass("weavy-open");

            if ($openFrame.length && $openFrame[0].loaded) {
                try {
                    $openFrame[0].contentWindow.postMessage({ name: 'hide' }, "*");
                } catch (e) {
                    weavy.debug("Could not postMessage:hide to frame");
                }
            }
        });

        // open specified bubble (personal, messenger or bubble)
        weavy.on("open", function (e, open) {
            $.when(weavy.whenBlockChecked, weavy.whenLoaded).then(function () {
                var $panel = $(weavy.getId("#weavy-panel-" + open.panelId), weavy.nodes.panels);
                if ($panel.length) {
                    if (!$panel.hasClass("weavy-open")) {
                        $(".weavy-panel", weavy.nodes.panels).removeClass("weavy-open");
                        $(weavy.getId("#weavy-panel-" + open.panelId), weavy.nodes.panels).addClass("weavy-open");

                        var $frame = $("iframe", $panel);

                        if (open.destination) {
                            weavy.log(".open() -> load in destination");
                            // load destination
                            weavy.load(open.panelId, open.destination, null, null, true);
                        } else if (!$frame.attr("src") && $frame.data("src")) {
                            // start predefined loading
                            $frame.attr("src", $frame[0].dataset.src);
                            weavy.setPanelLoading.call(weavy, open.panelId, true);
                        } else {
                            // already loaded
                            try {
                                $frame[0].contentWindow.postMessage({ name: 'show' }, "*");
                            } catch (e) {
                                weavy.debug("Could not postMessage:show to frame");
                            }
                        }
                    }
                } else {
                    $(".weavy-panel", weavy.nodes.panels).removeClass("weavy-open");
                }
            });
        });

        weavy.on("build", function () {
            if (!weavy.nodes.panels) {
                weavy.nodes.panels = document.createElement("div");
                weavy.nodes.panels.className = "weavy-panels";
                weavy.nodes.container.appendChild(weavy.nodes.panels);
            }

            for (var panel in _addPanels) {
                weavy.nodes.panels.appendChild(_addPanels[panel]);
            }
            _addPanels = [];
        });

        weavy.one("restore", function () {
            weavy.timeout(2000).then(weavy.preloadFrames.bind(this, "all"));
        });

        weavy.on("signing-out", weavy.clearPanels);

        // Exports (not required)
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.panels.defaults = {
     *     controls: {
     *         expand: true,
     *         close: true
     *     }
     * };
     *
     * @name defaults
     * @memberof panels
     * @type {Object}
     * @property {Object} controls - Set to `false` to disable control buttons
     * @property {boolean} controls.expand - Render a expand/collapse panel control button
     * @property {boolean} controls.close - Render a close panel control button.
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        controls: {
            expand: true,
            close: true
        }
    };

})(jQuery);


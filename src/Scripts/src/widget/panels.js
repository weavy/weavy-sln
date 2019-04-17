(function ($) {
    var PLUGIN_NAME = "panels";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Creating and handling panels that has frames for app pages. 
     * Panels are mostly automatically managed and preloaded when needed.
     * 
     * @example
     * widget.on("load", function () {
     *     if (widget.isAuthenticated()) {
     *         widget.addPanel("space-1", { url: "/spaces/1/" });
     *     }
     * });
     * 
     * @mixin panels
     * @returns {WeavyWidget.plugins.panels}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [WeavyWidget]{@link WeavyWidget#nodes}
         * @instance
         * @member nodes
         * @memberof panels
         * @extends WeavyWidget#nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends panels#
         */
        var widget = this;

        var preloading = false;
        var _addPanels = [];

        /**
         * Container for all panels
         * 
         * @alias panels#nodes#panels
         * @type {?Element}
         */
        widget.nodes.panels = null;

        /**
         * Create a panel that has frame handling. If the panel already exists it will return the existing panel.
         * 
         * @param {string} panelId - The id of the panel.
         * @param {Object} [attributes] - All panel attributes are optional
         * @param {url} attributes.url - The url for the frame.
         * @param {string} attributes.type - Type added as data-type attribute.
         * @param {boolean} attributes.persistent - Should the panel remain when {@link panels#removePanel} or {@link panels#clearPanels} are called?
         * @returns {Element}
         * @emits panels#event:panel-added
         */
        widget.addPanel = function (panelId, attributes) {
            if (!panelId) {
                widget.error("WeavyWidget panels.addPanel() is missing panelId");
                return;
            }
            var panelElementId = widget.getId("weavy-panel-" + panelId);
            var domPanel = widget.nodes.panels && widget.nodes.panels.querySelector("#" + panelElementId);
            var pendingPanel = _addPanels.filter(function (panel) { return panel.id === panelElementId; }).pop();

            if (domPanel || pendingPanel) {
                widget.warn("WeavyWidget panels.addPanel(" + panelId + ") is already created");
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
            frame.id = widget.getId("weavy-panel-frame-" + panelId);
            frame.name = widget.getId("weavy-panel-frame-" + panelId);
            frame.allowFullscreen = 1;

            if (attributes.url) {
                frame.dataset.src = attributes.url;
            }

            if (attributes.type) {
                frame.setAttribute('data-type', attributes.type);
                panel.setAttribute("data-type", attributes.type);
            }

            if (attributes.persistent) {
                panel.setAttribute("data-persistent", true);
            }

            panel.appendChild(widget.renderControls.call(widget, "weavy-panel-" + panelId));
            panel.appendChild(frame);

            if (widget.nodes.panels) {
                widget.nodes.panels.appendChild(panel);
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
             * @property {Object} attributes - Panel attributes
             * @property {url} attributes.url - The url for the frame.
             * @property {string} attributes.type - Type of the panel.
             * @property {boolean} attributes.persistent - Will the panel remain when {@link panels#removePanel} or {@link panels#clearPanels} are called?
             */
            widget.triggerEvent("panel-added", { panel: panel, panelId: panelId, attributes: attributes });

            return panel;
        };

        /**
         * Removes a panel. If the panel is open it will be closed before it's removed.
         * 
         * @param {string} panelId - The id of the panel to remove
         * @param {boolean} [force] - True will remove the panel even if it's persistent
         * @emits panels#panel-removed
         */
        widget.removePanel = function (panelId, force) {
            var $panel = $(widget.nodes.panels).children(widget.getId("#weavy-panel-removed-" + panelId) + ", " + widget.getId("#weavy-panel-" + panelId)).first();
            if ($panel.length && (!$panel.data("persistent") || force)) {
                var frame = $panel.find("iframe")[0];

                if ($panel.hasClass("weavy-open")) {
                    $panel[0].id = widget.getId("weavy-panel-removed-" + panelId);
                    widget.timeout(0).then(function () {
                        widget.close().then(function () {
                            widget.removePanel(panelId);
                        });
                    });
                } else {
                    weavy.connection.removeWindow(frame.contentWindow);
                    $panel.remove();

                    /**
                     * Triggered when a panel has been removed.
                     * 
                     * @event panels#panel-removed
                     * @category events
                     * @returns {Object}
                     * @property {string} panelId - Id of the removed panel
                     */
                    widget.triggerEvent("panel-removed", { panelId: panelId });
                }
            }
        };

        /**
         * Removes all panels except persistent panels.
         */
        widget.clearPanels = function () {
            $(widget.nodes.panels).children().each(function () {
                widget.removePanel(this.dataset.id);
            });
        };

        /**
         * Create panel controls for expand/collapse and close. Set control settings in {@link panels.defaults|options}
         * 
         * @returns {Element} 
         */
        widget.renderControls = function () {
            var options = widget.options.plugins[PLUGIN_NAME];

            var controls = document.createElement("div");
            controls.className = "weavy-controls";

            if (options.controls) {
                if (options.controls === true || options.controls.expand) {
                    var expand = document.createElement("div");
                    expand.className = "weavy-icon weavy-expand";
                    expand.title = "Expand";
                    expand.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12.199 4.8008v2h3.5898l-4.4883 4.4883-0.01172 0.01172-4.4883 4.4883v-3.5898h-2v7h7v-2h-3.5898l4.4883-4.4883 0.01172-0.01172 4.4883-4.4883v3.5898h2v-7h-7z"/></svg>';
                    widget.on(expand, "click", widget.resize.bind(widget));
                    controls.appendChild(expand);

                    var collapse = document.createElement("div");
                    collapse.className = "weavy-icon weavy-collapse";
                    collapse.title = "Collapse";
                    collapse.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m18.5 4.0898l-4.5 4.5v-3.5898h-2v7h7v-2h-3.59l4.5-4.5-1.41-1.4102zm-6.5 7.9102h-7v2h3.5898l-4.5 4.5 1.4102 1.41 4.5-4.5v3.59h2v-7z"/></svg>';
                    widget.on(collapse, "click", widget.resize.bind(widget));
                    controls.appendChild(collapse);
                }

                if (options.controls === true || options.controls.close) {
                    var close = document.createElement("div");
                    close.className = "weavy-icon";
                    close.title = "Close";
                    close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
                    widget.on(close, "click", widget.close.bind(widget));
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
        widget.preloadFrame = function (frameElement, callback) {
            var panel = $(frameElement).closest(".weavy-panel").get(0);
            var panelTarget = panel && panel.dataset.id;
            var delayedFrameLoad = function () {
                if (!frameElement.src && frameElement.dataset.src) {
                    if (panelTarget) {
                        widget.panelLoading(panelTarget, true);
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
        widget.preloadFrames = function (force) {
            if (widget.options.isMobile) {
                return;
            }

            if (!preloading) {
                widget.debug("starting frames preloading");
                var $currentlyLoadingFrames = $(widget.nodes.panels).find("iframe[src][data-src]");
                if ($currentlyLoadingFrames.length) {
                    // Wait until user loaded frames has loaded
                    $currentlyLoadingFrames.first().one("load", function () { widget.preloadFrames(force); });
                    return;
                }
            }
            if (!preloading || force) {
                preloading = true;

                var $systemFrames = $(widget.nodes.panels).find("iframe[data-src]:not([data-type]):not([src])");
                if ($systemFrames.length) {
                    $systemFrames.each(function () { widget.preloadFrame(this, function () { widget.preloadFrames(force) }) });
                } else if (force && !$(widget.nodes.panels).find("iframe[src][data-src]:not([data-type])").length) {
                    // After preloading system frames is done
                    var $panels = $(widget.nodes.panels).find("iframe[data-type]:not([src])");
                    if ($panels.length) {
                        widget.preloadFrame($panels[0]);
                        widget.timeout(1500).then(widget.preloadFrames.bind(this, "all"));
                    }
                }
            }
        }

        widget.on("panel-loading", function (e, panelLoading) {
            var $panel = $(widget.getId("#weavy-panel-" + panelLoading.panelId), widget.nodes.container);

            if (panelLoading.isLoading) {
                $panel.addClass(panelLoading.fill ? "weavy-loading weavy-loading-fill" : "weavy-loading");
            } else {
                $panel.removeClass("weavy-loading weavy-loading-fill");
            }
        });

        // close all bubbles
        widget.on("close", function (e) {
            var $openFrame = $(".weavy-panel.weavy-open iframe", widget.nodes.panels);

            $(".weavy-panel", widget.nodes.panels).removeClass("weavy-open");

            if ($openFrame.length && $openFrame[0].loaded) {
                try {
                    $openFrame[0].contentWindow.postMessage({ name: 'hide' }, "*");
                } catch (e) {
                    widget.debug("Could not postMessage:hide to frame");
                }
            }
        });

        // open specified bubble (personal, messenger or bubble)
        widget.on("open", function (e, open) {
            $.when(widget.awaitBlocked, widget.awaitLoaded).then(function () {
                var $panel = $(widget.getId("#weavy-panel-" + open.panelId), widget.nodes.panels);
                if ($panel.length) {
                    if (!$panel.hasClass("weavy-open")) {
                        $(".weavy-panel", widget.nodes.panels).removeClass("weavy-open");
                        $(widget.getId("#weavy-panel-" + open.panelId), widget.nodes.panels).addClass("weavy-open");

                        var $frame = $("iframe", $panel);

                        if (open.destination) {
                            widget.log("load in destination", open.destination);
                            // load destination
                            widget.loadInTarget(open.panelId, open.destination);
                            widget.panelLoading.call(widget, open.panelId, true, true);
                        } else if (!$frame.attr("src") && $frame.data("src")) {
                            // start predefined loading
                            $frame.attr("src", $frame[0].dataset.src);
                            widget.panelLoading.call(widget, open.panelId, true);
                        } else {
                            // already loaded
                            try {
                                $frame[0].contentWindow.postMessage({ name: 'show' }, "*");
                            } catch (e) {
                                widget.debug("Could not postMessage:show to frame");
                            }
                        }
                    }
                } else {
                    $(".weavy-panel", widget.nodes.panels).removeClass("weavy-open");
                }
            });
        });

        widget.on("build", function () {
            if (!widget.nodes.panels) {
                widget.nodes.panels = document.createElement("div");
                widget.nodes.panels.className = "weavy-panels";
                widget.nodes.container.appendChild(widget.nodes.panels);
            }

            for (panel in _addPanels) {
                widget.nodes.panels.appendChild(_addPanels[panel]);
            }
            _addPanels = [];
        });

        widget.one("restore", function () {
            widget.timeout(2000).then(widget.preloadFrames.bind(this, "all"));
        });

        widget.on("signing-out", widget.clearPanels);

        // Exports (not required)
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.panels.defaults = {
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
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        controls: {
            expand: true,
            close: true
        }
    };

})(jQuery);


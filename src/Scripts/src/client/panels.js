/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.WeavyPanels = factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("panels.js");

    var WeavyPanels = function (weavy) {
        var preloading = false;
        var _panelsContainers = new Map();
        var _panels = new Map();
        var loadingTimeout = [];

        function registerLoading(panelId) {
            var frame = $(_panels.get(panelId)).find("iframe").get(0);
            if (frame && !frame.registered) {
                weavy.registerWindowId(frame.contentWindow, frame.name, panelId);
                var onready = function (e) {
                    weavy.debug("panel ready", panelId);
                    setPanelLoading.call(weavy, panelId, false);
                    delete frame.dataset.src;
                    frame.loaded = true;
                };
                weavy.on(wvy.postal, "ready", { weavyId: weavy.getId(), windowName: frame.name }, onready);
                frame.registered = true;
            }
        }

        /**
         * Check if a panel is currently loading.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to check.
         * @returns {boolean} True if the panel curerently is loading
         */
        function panelIsLoading(panelId) {
            var frame = $(_panels.get(panelId)).find("iframe").get(0);
            return frame.getAttribute("src") && !frame.loaded ? true : false;
        }

        /**
         * Check if a panel has finished loading.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to check.
         * @returns {boolean} True if the panel has finished loading.
         */
        function panelIsLoaded(panelId) {
            var frame = $(_panels.get(panelId)).find("iframe").get(0);
            return frame.loaded ? true : false;
        }

        /**
         * Set the loading indicator on the specified panel. The loading indicatior is automatically removed on loading. It also makes sure the panel is registered and [sends frame id]{@link Weavy#registerWindowId} when loaded.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel that is loading.
         * @param {boolean} isLoading - Sets whether the panel is loading or not.
         * @param {boolean} [fillBackground] - Sets an opaque background that hides any panel content during loading.
         * @emits Weavy#panel-loading
         */
        function setPanelLoading(panelId, isLoading, fillBackground) {
            if (isLoading) {
                registerLoading(panelId);
                loadingTimeout[panelId] = weavy.timeout(15000);
                loadingTimeout[panelId].then(setPanelLoading.bind(weavy, panelId, false));
            } else {
                if (loadingTimeout[panelId]) {
                    loadingTimeout[panelId].reject();
                    delete loadingTimeout[panelId];
                }
            }

            var panel = _panels.get(panelId);

            /**
             * Event triggered when panel is starting to load or stops loading.
             * 
             * @category events
             * @event Weavy#panel-loading
             * @returns {Object}
             * @property {string} panelId - The id of the panel loading.
             * @property {boolean} isLoading - Indicating wheter the panel is loading or not.
             * @property {boolean} fillBackground - True if the panel has an opaque background during loading.
             */
            panel.triggerEvent("panel-loading", { panelId: panelId, isLoading: isLoading, fillBackground: fillBackground });
        }

        /**
         * Tells a panel that it need to reload it's content.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to refresh.
         * @emits Weavy#refresh
         */
        function reloadPanel (panelId) {

            setPanelLoading.call(weavy, panelId, true);

            var panel = _panels.get(panelId);
            var frame = $(panel).find("iframe");

            wvy.postal.postToFrame(frame[0].name, weavy.getId(), { "name": "reload" });

            /**
             * Event triggered when a panel is resfreshed and needs to reload it's content.
             * 
             * @category events
             * @event Weavy#refresh
             * @returns {Object}
             * @property {string} panelId - The id of the panel being refreshed.
             */
            panel.triggerEvent("panel-reload", { panelId: panelId });
        }

        /**
         * Open a specific panel. The open waits for the [block check]{@link Weavy#whenBlockChecked} to complete, then opens the panel.
         * Adds the `weavy-open` class to the {@link Weavy#nodes#container}.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to open.
         * @param {string} [destination] - Tells the panel to navigate to a specified url.
         * @emits Weavy#open
         * @returns {external:Promise}
         */
        function openPanel(panelId, destination) {
            weavy.info("openPanel", panelId + (destination ? " " + destination : ""));

            var panelsRoot = this instanceof HTMLElement ? this : weavy.nodes.panels;
            var panel = _panels.get(panelId);

            if (!panel.dataset.persistent && !weavy.authentication.isAuthorized()) {
                weavy.warn("Unathorized, can't open panel " + panelId);
                return Promise.reject();
            }

            return weavy.whenBlockChecked.then(function () {

                $(panel).addClass("weavy-open");

                /**
                 * Event triggered when a panel is opened.
                 * 
                 * @category events
                 * @event Weavy#open
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel being openened.
                 * @property {string} [destination] - Any url being requested to open in the panel.
                 */
                var openResult = panel.triggerEvent("panel-open", { panelId: panelId, destination: destination, panels: panelsRoot });

                if (openResult !== false && openResult.panelId === panelId) {
                    return Promise.resolve(openResult);
                } else {
                    return Promise.reject({ panelId: panelId, destination: destination, panels: panelsRoot });
                }
            });
        }

        /**
         * Closes all panels and removes the `weavy-open` class from the {@link Weavy#nodes#container}. Sets the {@link Weavy#whenClosed} Promise if not already closing.
         * 
         * @category panels
         * @param {string} [panelId] - The id of any specific panel to close. If that panel is open, the panel will be closed, otherwise no panel will be closed.
         * @returns {external:Promise} {@link Weavy#whenClosed}
         * @emits Weavy#close
         */
        function closePanel (panelId) {
            weavy.info("closePanel", panelId);

            var panelsRoot = this instanceof HTMLElement ? this : weavy.nodes.panels;

            if (panelId && $(_panels.get(panelId)).hasClass("weavy-open")) {
                var panel = _panels.get(panelId);
                $(panel).removeClass("weavy-open");

                /**
                 * Event triggered when weavy closes all panels. Wait for the {@link Weavy#whenClosed} Promise to do additional things when weavy has finished closing.
                 * 
                 * @category events
                 * @event Weavy#close
                 */
                panel.triggerEvent("panel-close", { panelId: panelId, panels: panelsRoot });

                // Return timeout promise
                return weavy.whenClosed = weavy.timeout(250);
            } else {
                return weavy.whenClosed || Promise.resolve();
            }
        }

        /**
         * [Open]{@link Weavy#open} or [close]{@link Weavy#close} a specific panel.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel toggled.
         * @param {string} [destination] - Tells the panel to navigate to a specified url when opened.
         * @emits Weavy#toggle
         */
        function togglePanel(panelId, destination) {
            weavy.info("togglePanel", panelId);

            var root = this instanceof HTMLElement ? this : weavy.nodes.panels;
            var panel = _panels.get(panelId);

            return weavy.whenBlockChecked.then(function () {
                 var shouldClose = $(panel).hasClass("weavy-open");
                /**
                 * Event triggered when a panel is toggled open or closed.
                 * 
                 * @category events
                 * @event Weavy#toggle
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel toggled.
                 * @property {boolean} closed - True if the panel is closed.
                 */
                panel.triggerEvent("panel-toggle", { panelId: panelId, closed: shouldClose });

                if (shouldClose) {
                    return root.close(panelId);
                } else {
                    if (root.children && root.children.length) {
                        Array.from(root.children).forEach(function (panel) {
                            if (panel.panelId !== panelId && panel.close) {
                                panel.close();
                            }
                        })
                    }
                    return root.open(panelId, typeof (destination) === "string" ? destination : null);
                }
            });
        }

        /**
         * Load an url with data directly in a specific panel. Uses turbolinks forms if the panel is loaded and a form post to the frame if the panel isn't loaded.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to load in.
         * @param {string} url - The url to load in the panel.
         * @param {any} [data] -  URL/form-encoded data to send
         * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         * @param {bool} [replace] - Replace the content in the panel and load it fresh.
         * @returns {external:Promise}
         */
        function loadPanel (panelId, url, data, method, replace) {
            url = weavy.httpsUrl(url, weavy.options.url);
            return weavy.whenBlockChecked.then(function () {
                var frameTarget = $(_panels.get(panelId)).find("iframe").get(0);
                if (frameTarget) {
                    if (replace || frameTarget.dataset && frameTarget.dataset.src || !frameTarget.getAttribute("src")) {
                        // Not yet fully loaded
                        setPanelLoading(panelId, true, replace);
                        weavy.sendToFrame(frameTarget, url, data, method);
                    } else {
                        // Fully loaded, send using turbolinks
                        wvy.postal.postToFrame(frameTarget.name, weavy.getId(), { name: 'send', url: url, data: data, method: method })
                    }
                }
            });
        }

        /**
         * Sends a postMessage to a panel iframe
         * 
         * @category panels
         * @param {string} panelId - If the frame is a panel, the panelId may also be provided.
         * @param {object} message - The Message to send
         * @param {Transferable[]} [transfer] - A sequence of Transferable objects that are transferred with the message.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
         */
        function postMessage (panelId, message, transfer) {
            return weavy.whenBlockChecked.then(function () {
                var frameTarget = $(_panels.get(panelId)).find("iframe").get(0);
                if (frameTarget) {
                    try {
                        wvy.postal.postToFrame(frameTarget.name, weavy.getId(), message, transfer);
                    } catch (e) {
                        weavy.error("Could not post panel message", e);
                    }
                }
            });
        }

        function createPanelsContainer (containerId) {
            containerId = containerId || "global";
            var containerElementId = weavy.getId("panels-" + containerId);
            var panels = document.createElement("div");
            panels.id = containerElementId;
            panels.className = "weavy-panels";
            panels.addPanel = addPanel.bind(panels);
            panels.open = openPanel.bind(panels);
            panels.load = loadPanel.bind(panels);
            panels.close = closePanel.bind(panels);
            panels.toggle = togglePanel.bind(panels);

            // Events
            panels.on = weavy.events.on.bind(panels);
            panels.one = weavy.events.one.bind(panels);
            panels.off = weavy.events.off.bind(panels);
            panels.triggerEvent = weavy.events.triggerEvent.bind(panels);

            _panelsContainers.set(containerId, panels);
            return panels;
        }

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
        function addPanel (panelId, url, attributes) {
            if (!panelId) {
                weavy.error("WeavyPanels.addPanel() is missing panelId");
                return;
            }

            weavy.debug("creating panel", panelId);

            // Custom or global root
            var panelRoot = (this instanceof HTMLElement) ? this : weavy.nodes.panels;

            var panelElementId = weavy.getId("panel-" + panelId);
            var domPanel = panelRoot && panelRoot.querySelector("#" + panelElementId);
            var pendingPanel = Array.isArray(this._addPanels) && this._addPanels.filter(function (panel) { return panel.id === panelElementId; }).pop();

            if (domPanel || pendingPanel) {
                weavy.warn("WeavyPanels.addPanel(" + panelId + ") is already created");
                return domPanel || pendingPanel;
            }

            if (!$.isPlainObject(attributes)) {
                attributes = {};
            }

            // panel
            var panel = document.createElement("div");
            panel.className = "weavy-panel";
            panel.id = panelElementId;
            panel.panelId = panelId;
            panel.dataset.id = panelId;

            // frame
            var frame = document.createElement("iframe");
            frame.className = "weavy-panel-frame";
            frame.id = weavy.getId("panel-frame-" + panelId);
            frame.name = weavy.getId("panel-frame-" + panelId);
            frame.allowFullscreen = 1;

            frame.dataset.weavyId = weavy.getId();

            // Events
            panel.eventParent = panelRoot;
            panel.on = weavy.events.on.bind(panel);
            panel.one = weavy.events.one.bind(panel);
            panel.off = weavy.events.off.bind(panel);
            panel.triggerEvent = weavy.events.triggerEvent.bind(panel);

            if (url) {
                frame.dataset.src = weavy.httpsUrl(url, weavy.options.url);
            }

            if (attributes.type) {
                frame.setAttribute("data-type", attributes.type);
                panel.setAttribute("data-type", attributes.type);
            }

            if (attributes.persistent) {
                panel.setAttribute("data-persistent", true);
            }

            panel.appendChild(frame);

            if (panelRoot) {
                weavy.debug("Appending panel", panelId)
                panelRoot.appendChild(panel);
                _panels.set(panelId, panel);
            } else {
                weavy.error("Could not append panel", panelId)
            }

            panel.open = openPanel.bind(panelRoot, panelId);
            panel.toggle = togglePanel.bind(panelRoot, panelId);
            panel.close = closePanel.bind(panelRoot, panelId);
            panel.load = loadPanel.bind(panelRoot, panelId);
            panel.reload = reloadPanel.bind(panelRoot, panelId);
            panel.reset = resetPanel.bind(panelRoot, panelId);

            Object.defineProperty(panel, "isOpen", {
                get: function () { return panel.classList.contains("weavy-open"); }
            });

            Object.defineProperty(panel, "isLoading", {
                get: panelIsLoading.bind(weavy, panelId),
                set: function (isLoading) {
                    /// start or stop navigation loading indication
                    setPanelLoading(panelId, isLoading);
                }
            });

            Object.defineProperty(panel, "isLoaded", {
                get: panelIsLoaded.bind(weavy, panelId),
                set: function (isLoaded) {
                    if (isLoaded) {
                        // stop loading indication
                        setPanelLoading(panelId, false);
                    } else {
                        // start full loading indication
                        setPanelLoading(panelId, true, true);
                    }
                }
            });

            panel.appendChild(renderControls.call(weavy, panel, attributes));

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
            panelRoot.triggerEvent("panel-added", { panel: panel, panelId: panelId, url: url, attributes: attributes });

            return panel;
        }

        /** 
         * Resets a panel to its original url. This can be used if the panel has ended up in an incorrect state.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to reset.
         */
        function resetPanel(panelId) {
            var panel = _panels.get(panelId);
            if (panel) {
                var frame = panel.querySelector("iframe");
                var isOpen = panel.isOpen;

                var frameSrc = frame.src || frame.dataset.src;
                var frameType = frame.getAttribute('data-type');

                // frame
                var newFrame = document.createElement("iframe");
                newFrame.className = "weavy-panel-frame";
                newFrame.id = weavy.getId("weavy-panel-frame-" + panelId);
                newFrame.name = weavy.getId("weavy-panel-frame-" + panelId);
                newFrame.allowFullscreen = 1;
                newFrame.dataset.src = frameSrc;
                newFrame.setAttribute("data-type", frameType);

                panel.removeChild(frame);
                panel.appendChild(newFrame);

                if (isOpen) {
                    loadPanel(panelId, frameSrc, null, null, true)
                }
            }
        }

        /**
         * Removes a panel. If the panel is open it will be closed before it's removed.
         * 
         * @param {string} panelId - The id of the panel to remove
         * @param {boolean} [force] - True will remove the panel even if it's persistent
         * @emits panels#panel-removed
         */
        function removePanel(panelId, force) {
            var panel = _panels.get(panelId);
            var panelRoot = (this instanceof HTMLElement) ? this : weavy.nodes.panels;

            if (panel) {
                var $panel = $(panel);
                if (!$panel.data("persistent") || force) {
                    if ($panel.hasClass("weavy-open")) {
                        $panel[0].id = weavy.getId("weavy-panel-removed-" + panelId);
                        weavy.timeout(0).then(function () {
                            panel.close().then(function () {
                                removePanel(panelId);
                            });
                        });
                    } else {
                        $panel.remove();
                        _panels.delete(panelId);

                        /**
                         * Triggered when a panel has been removed.
                         * 
                         * @event panels#panel-removed
                         * @category events
                         * @returns {Object}
                         * @property {string} panelId - Id of the removed panel
                         */
                        panelRoot.triggerEvent("panel-removed", { panelId: panelId });
                    }
                }
            }
        }

        /**
         * Closes all panels except persistent panels.
         */
        function closePanels () {
            _panels.forEach(function (panel) {
                panel.close();
            });
        }

        /**
         * Removes all panels except persistent panels.
         */
        function clearPanels () {
            _panels.forEach(function (panel) {
                removePanel(panel.dataset.id);
            });
        }

        /**
         * Resets all panels to initial state.
         */
        function resetPanels () {
            _panels.forEach(function (panel) {
                resetPanel(panel.dataset.id);
            });
        }

        /**
         * Create panel controls for expand/collapse and close. Set control settings in {@link panels.defaults|options}
         * 
         * @returns {Element} 
         */
        function renderControls(panel, options) {

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
                    weavy.on(close, "click", panel.close.bind(panel));
                    controls.appendChild(close);
                }
            }

            return controls;
        }

        /**
         * Preload a frame. The frame needs to have data-src attribute set instead of src attribute. 
         * Panels created using {@link panels#addPanel} have the appropriate settings for preload.
         * If the frame belongs to a panel it will triggger loading animations.
         * 
         * @param {FrameElement} frameElement - The frame that should be preloaded.
         * @param {Function} [callback] - Function called when the frame has loaded
         */
        function preloadFrame (frameElement, callback) {
            var panel = $(frameElement).closest(".weavy-panel").get(0);
            var panelTarget = panel && panel.dataset.id;
            var delayedFrameLoad = function () {
                if (!frameElement.src && frameElement.dataset.src) {
                    if (panelTarget) {
                        setPanelLoading(panelTarget, true);
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
        function preloadFrames (force) {
            if (weavy.options.isMobile) {
                return;
            }

            var panels = Array.from(_panels.values());
            if (!preloading) {
                weavy.debug("starting frames preloading");
                var $currentlyLoadingFrames = $(panels).find("iframe[src][data-src]");
                if ($currentlyLoadingFrames.length) {
                    // Wait until user loaded frames has loaded
                    $currentlyLoadingFrames.first().one("load", function () { preloadFrames(force); });
                    return;
                }
            }
            if (!preloading || force) {
                preloading = true;

                var $systemFrames = $(panels).find("iframe[data-src]:not([data-type]):not([src])");
                if ($systemFrames.length) {
                    $systemFrames.each(function () { preloadFrame(this, function () { preloadFrames(force) }) });
                } else if (force && !$(panels).find("iframe[src][data-src]:not([data-type])").length) {
                    // After preloading system frames is done
                    var $panels = $(panels).find("iframe[data-type]:not([src])");
                    if ($panels.length) {
                        preloadFrame($panels[0]);
                        weavy.timeout(1500).then(preloadFrames.bind(this, "all"));
                    }
                }
            }
        }

        weavy.on("panel-loading", function (e, panelLoading) {
            var $panel = $(_panels.get(panelLoading.panelId));

            if (panelLoading.isLoading) {
                $panel.addClass(panelLoading.fillBackground ? "weavy-loading weavy-loading-fill" : "weavy-loading");
            } else {
                $panel.removeClass("weavy-loading weavy-loading-fill");
            }
        });

        // close all panels
        weavy.on("panel-close", function (e) {
            var panels = Array.from(_panels.values());
            var $panels = $(panels);
            var $openFrame = $(".weavy-panel.weavy-open iframe", $panels);

            $(".weavy-panel", $panels).removeClass("weavy-open");

            if ($openFrame.length && $openFrame[0].loaded) {
                try {
                    wvy.postal.postToFrame($openFrame[0].name, weavy.getId(), { name: 'hide' });
                } catch (e) {
                    weavy.debug("Could not postMessage:hide to frame");
                }
            }
        });

        // open specified panel

        // TODO: Rewrite all this
        weavy.on("panel-open", function (e, open) {
            $.when(weavy.whenBlockChecked, weavy.whenLoaded).then(function () {
                var $panel = $(_panels.get(open.panelId));
                if ($panel.length) {
                    var $frame = $("iframe", $panel);

                    if (open.destination) {
                        weavy.log(".open() -> load in destination");
                        // load destination
                        loadPanel(open.panelId, open.destination, null, null, true);
                    } else if (!$frame.attr("src") && $frame.data("src")) {
                        // start predefined loading
                        $frame.attr("src", $frame[0].dataset.src);
                        setPanelLoading.call(this, open.panelId, true);
                    } else {
                        // already loaded
                        try {
                            wvy.postal.postToFrame($frame[0].name, weavy.getId(), { name: 'show' })
                        } catch (e) {
                            weavy.debug("Could not postMessage:show to frame");
                        }
                    }
                } else {
                    //$(".weavy-panel", weavy.nodes.panels).removeClass("weavy-open");
                }
            });
        });

        weavy.one("restore", function () {
            weavy.timeout(2000).then(weavy.preloadFrames.bind(this, "all"));
        });

        weavy.on("signing-out signed-out", closePanels);
        weavy.on("after:signed-out", resetPanels);

        // Exports
        return {
            addPanel: addPanel,
            clearPanels: clearPanels,
            closePanels: closePanels,
            createContainer: createPanelsContainer,
            getContainer: function (containerId) {
                return _panelsContainers.get(containerId || "global");
            },
            getPanel: function (panelId) {
                return _panels.get(panelId);
            },
            postMessage: postMessage,
            preloadFrame: preloadFrame,
            preloadFrames: preloadFrames,
            removePanel: removePanel,
            resetPanels: resetPanels
        }
    };

    /**
     * Default panels options
     * 
     * @example
     * WeavyPanels.defaults = {
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
    WeavyPanels.defaults = {
        controls: {
            expand: false,
            close: false
        }
    };

    return WeavyPanels;

}));


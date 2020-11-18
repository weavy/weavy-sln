/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './promise'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./promise')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyPanels = factory(jQuery, root.WeavyPromise);
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyPromise) {
    console.debug("panels.js");

    var WeavyPanels = function (weavy) {

        var _panelsContainers = new Map();
        var _panels = new Map();
        var loadingTimeout = [];

        var _whenClosed = WeavyPromise.resolve();

        function createPanelsContainer(containerId) {
            containerId = containerId || "global";
            var containerElementId = weavy.getId("panels-" + containerId);
            var panels = document.createElement("div");
            panels.id = containerElementId;
            panels.className = "weavy-panels";
            panels.addPanel = addPanel.bind(panels);
            //panels.preload = preloadPanels.bind(panels);

            panels.dataset.containerId = containerId;

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
        function addPanel(panelId, url, attributes) {
            if (!panelId) {
                weavy.error("WeavyPanels.addPanel() is missing panelId");
                return;
            }

            weavy.debug("creating panel", panelId);

            if (!(this instanceof HTMLElement)) {
                weavy.warn("addPanel: No valid panel root defined for " + panelId);
                return Promise.reject();
            }

            var panelsRoot = this;

            var panelElementId = weavy.getId("panel-" + panelId);
            var domPanel = panelsRoot && panelsRoot.querySelector("#" + panelElementId);
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
            panel.eventParent = panelsRoot;
            panel.on = weavy.events.on.bind(panel);
            panel.one = weavy.events.one.bind(panel);
            panel.off = weavy.events.off.bind(panel);
            panel.triggerEvent = weavy.events.triggerEvent.bind(panel);

            if (url) {
                frame.dataset.src = weavy.httpsUrl(url, weavy.options.url);
            }

            if (attributes.type) {
                frame.dataset.type = attributes.type;
                panel.dataset.type = attributes.type;
            }

            if (attributes.persistent !== undefined) {
                panel.dataset.persistent = String(attributes.persistent);
            }

            if (attributes.preload !== undefined) {
                panel.dataset.preload = String(attributes.preload);
            }

            panel.appendChild(frame);
            panel.frame = frame;

            if (panelsRoot) {
                weavy.debug("Appending panel", panelId)
                panelsRoot.appendChild(panel);
                _panels.set(panelId, panel);
            } else {
                weavy.error("Could not append panel", panelId)
            }

            panel.open = openPanel.bind(panelsRoot, panelId);
            panel.toggle = togglePanel.bind(panelsRoot, panelId);
            panel.close = closePanel.bind(panelsRoot, panelId);
            panel.load = loadPanel.bind(panelsRoot, panelId);
            panel.preload = preloadPanel.bind(panelsRoot, panelId);
            panel.reload = reloadPanel.bind(panelsRoot, panelId);
            panel.reset = resetPanel.bind(panelsRoot, panelId);
            panel.postMessage = postMessage.bind(panelsRoot, panelId);
            panel.remove = removePanel.bind(panelsRoot, panelId);

            // Promises

            panel.whenReady = new WeavyPromise();
            weavy.on(wvy.postal, "ready", { weavyId: weavy.getId(), windowName: frame.name }, function () {
                panel.whenReady.resolve({ panelId: panelId, windowName: frame.name });
            });

            panel.whenLoaded = new WeavyPromise();
            weavy.on(wvy.postal, "load", { weavyId: weavy.getId(), windowName: frame.name }, function () {
                panel.whenLoaded.resolve({ panelId: panelId, windowName: frame.name });
            });

            // States

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

            // Frame handling

            // Close the panel from the inside
            weavy.on(wvy.postal, "request:close", { weavyId: weavy.getId(), windowName: frame.name }, function () {
                panel.close();
            });

            // External controls

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
            panelsRoot.triggerEvent("panel-added", { panel: panel, panelId: panelId, url: url, attributes: attributes });

            return panel;
        }

        function registerLoading(panelId) {
            var frame = $(_panels.get(panelId)).find("iframe").get(0);
            if (frame && !frame.registered) {

                try {
                    wvy.postal.registerContentWindow(frame.contentWindow, frame.name, weavy.getId());
                } catch (e) {
                    weavy.error("Could not register window id", frame.name, e);
                }

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
         * Set the loading indicator on the specified panel. The loading indicatior is automatically removed on loading. It also makes sure the panel is registered and sets up frame communication when loaded.
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
        function reloadPanel(panelId) {
            return weavy.whenReady().then(function () {
                setPanelLoading.call(weavy, panelId, true);

                var panel = _panels.get(panelId);

                panel.postMessage({ "name": "reload" })

                /**
                 * Event triggered when a panel is resfreshed and needs to reload it's content.
                 * 
                 * @category events
                 * @event Weavy#refresh
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel being refreshed.
                 */
                panel.triggerEvent("panel-reload", { panelId: panelId });
            });
        }

        /**
         * Loads an url in a frame or sends data into a specific frame. Will replace anything in the frame.
         * 
         * @ignore
         * @category panels
         * @param {HTMLIFrameElement} frame - The frame element
         * @param {any} url - URL to load.
         * @param {any} [data] - URL/form encoded data.
         * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         * @returns {external:Promise}
         */
        function sendToFrame (frame, url, data, method) {
            // Todo: return complete promise instead
            return weavy.whenReady().then(function () {
                method = String(method || "get").toLowerCase();

                // Ensure target exists
                //var frame = $("iframe[name='" + frameName + "']", weavy.nodes.container).get(0);

                weavy.log("sendToFrame", frame, url);
                if (frame) {
                    var frameUrl = url;
                    if (method === "get") {
                        if (data) {
                            // Append data to URL
                            if (frameUrl.indexOf('?') === -1) {
                                frameUrl = frameUrl + "?" + data;
                            } else {
                                frameUrl = frameUrl + "&" + data;
                            }
                        }
                    }


                    if (frame.src !== frameUrl) {
                        // If no url is set yet, set an url
                        frame.src = frameUrl;
                        if (method === "get") {
                            weavy.info("sendToFrame using src");
                            // No need to send a form since data is appended to the url
                            return;
                        }
                    } else if (frame.src && method === "get") {
                        weavy.info("sendToFrame using window.open");
                        window.open(frameUrl, frame.name);
                        return;
                    }

                    weavy.info("sendToFrame using form");

                    // Create a form to send to the frame
                    var $form = $("<form>", {
                        action: url,
                        method: method,
                        target: frame.name
                    });

                    if (data) {
                        data = data.replace(/\+/g, '%20');
                    }
                    var dataArray = data && data.split("&") || [];

                    // Add all data as hidden fields
                    $form.append(dataArray.map(function (pair) {
                        var nameValue = pair.split("=");
                        var name = decodeURIComponent(nameValue[0]);
                        var value = decodeURIComponent(nameValue[1]);
                        // Find one or more fields
                        return $('<input>', {
                            type: 'hidden',
                            name: name,
                            value: value
                        });
                    }));

                    // Send the form and forget it
                    $form.appendTo(weavy.nodes.container).submit().remove();
                }
            });
        }


        /**
         * Load an url with data directly in a specific panel. Uses turbolinks forms if the panel is loaded and a form post to the frame if the panel isn't loaded.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to load in.
         * @param {string} [url] - The url to load in the panel.
         * @param {any} [data] -  URL/form-encoded data to send
         * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         * @param {bool} [replace] - Replace the content in the panel and load it fresh.
         * @returns {external:Promise}
         */
        function loadPanel(panelId, url, data, method, replace) {
            return weavy.whenReady().then(function () {
                var panel = _panels.get(panelId);

                if (panel) {
                    var frameTarget = $(panel).find("iframe").get(0);

                    if (url) {
                        url = weavy.httpsUrl(url, weavy.options.url);

                        if (replace || !panel.isLoaded) {
                            // Not yet fully loaded
                            setPanelLoading(panelId, true, replace);
                            sendToFrame(frameTarget, url, data, method);
                        } else {
                            // Fully loaded, send using turbolinks
                            panel.postMessage({ name: 'turbolinks-visit', url: url, data: data, method: method });
                        }

                    } else if (!panel.isLoaded && !panel.isLoading) {
                        // start predefined loading
                        $(frameTarget).attr("src", frameTarget.dataset.src);
                        setPanelLoading.call(this, panelId, true);
                    } else if (panel.isLoaded || panel.isLoading) {
                        // already loaded
                        panel.postMessage({ name: 'show' });
                    } else {
                        // No src defined
                        return Promise.resolve();
                    }

                    return panel.whenLoaded();
                } else {
                    weavy.warn("loadPanel: Panel not found " + panelId);
                    return Promise.reject({ panelId: panelId, url: url, data: data, method: method, replace: replace });
                }
            });
        }

        /**
         * Open a specific panel. The open waits for the [weavy.whenReady]{@link Weavy#whenReady} to complete, then opens the panel.
         * Adds the `weavy-open` class to the {@link Weavy#nodes#container}.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to open.
         * @param {string} [destination] - Tells the panel to navigate to a specified url.
         * @emits Weavy#open
         * @returns {external:Promise}
         */
        function openPanel(panelId, destination) {

            if (!(this instanceof HTMLElement)) {
                weavy.warn("openPanel: No valid panel root defined for " + panelId);
                return Promise.reject({ panelId: panelId, destination: destination });
            }

            var panelsRoot = this;

            return weavy.whenReady().then(function () {
                weavy.info("openPanel", panelId + (destination ? " " + destination : ""));

                var panel = _panels.get(panelId);

                if (!panel) {
                    weavy.warn("openPanel: Panel not found " + panelId);
                    return Promise.reject({ panelId: panelId, destination: destination });
                }

                if (!panel.dataset.persistent && !weavy.authentication.isAuthorized()) {
                    weavy.warn("Unauthorized, can't open panel " + panelId);
                    return Promise.reject({ panelId: panelId, destination: destination });
                }

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
                    return loadPanel(panelId, destination);
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
        function closePanel(panelId, silent) {

            if (!(this instanceof HTMLElement)) {
                weavy.warn("closePanel: No valid panel root defined for " + panelId);
                return Promise.reject({ panelId: panelId });
            }

            var panelsRoot = this;

            return weavy.whenReady().then(function () {
                var panel = _panels.get(panelId);

                if (!panel) {
                    weavy.warn("closePanel: Panel not found " + panelId);
                    return Promise.reject({ panelId: panelId });
                }

                if (panel.isOpen) {
                    weavy.info("closePanel", panelId, silent === true ? "(silent)" : "");

                    $(panel).removeClass("weavy-open");

                    if (silent !== true) {
                        /**
                         * Event triggered when weavy closes all panels. Wait for the {@link Weavy#whenClosed} Promise to do additional things when weavy has finished closing.
                         * 
                         * @category events
                         * @event Weavy#close
                         */
                        panel.triggerEvent("panel-close", { panelId: panelId, panels: panelsRoot });
                    }

                    panel.postMessage({ name: 'close' });

                    // Return timeout promise
                    _whenClosed = weavy.timeout(250);

                    _whenClosed.then(function () {
                        panel.postMessage({ name: 'closed' });
                    });
                } 

                return _whenClosed();
            });
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

            if (!(this instanceof HTMLElement)) {
                weavy.warn("togglePanel: No valid panel root defined for " + panelId);
                return Promise.reject({ panelId: panelId, destination: destination });
            }

            return weavy.whenReady().then(function () {
                weavy.info("toggling panel", panelId);

                var panel = _panels.get(panelId);

                if (!panel) {
                    weavy.warn("togglePanel: Panel not found " + panelId);
                    return Promise.reject({ panelId: panelId, destination: destination });
                }

                var shouldClose = panel.isOpen;

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
                    return panel.close();
                } else {
                    return panel.open(typeof (destination) === "string" ? destination : null);
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
        function postMessage(panelId, message, transfer) {
            return weavy.whenReady().then(function () {
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

        /** 
         * Resets a panel to its original url. This can be used if the panel has ended up in an incorrect state.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to reset.
         */
        function resetPanel(panelId) {
            return weavy.whenReady().then(function () {
                var panel = _panels.get(panelId);
                if (panel) {
                    weavy.log("resetting panel", panelId)

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
            });
        }

        /**
         * Removes a panel. If the panel is open it will be closed before it's removed.
         * 
         * @param {string} panelId - The id of the panel to remove
         * @param {boolean} [force] - True will remove the panel even if it's persistent
         * @emits panels#panel-removed
         */
        function removePanel(panelId, force) {
            if (!(this instanceof HTMLElement)) {
                weavy.warn("removePanel: No valid panel root defined for " + panelId);
                return Promise.reject();
            }

            var panelsRoot = this;

            var _removePanel = function () {
                var panel = _panels.get(panelId);

                if (panel) {
                    var $panel = $(panel);
                    if (!$panel.data("persistent") || force) {
                        if (panel.isOpen) {
                            $panel[0].id = weavy.getId("weavy-panel-removed-" + panelId);
                            return weavy.timeout(0).then(function () {
                                return panel.close().then(function () {
                                    return removePanel.call(panelsRoot, panelId, force);
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
                            panelsRoot.triggerEvent("panel-removed", { panelId: panelId });

                            return Promise.resolve();
                        }
                    }
                }

                return Promise.reject(new Error("removePanel(): Panel " + panelId + " not found"));
            };

            return force ? _removePanel() : weavy.whenReady().then(_removePanel);
        }

        /**
         * Closes all panels except persistent panels.
         */
        function closePanels() {
            weavy.debug("closing panels")
            _panels.forEach(function (panel) {
                panel.close();
            });
        }

        /**
         * Removes all panels except persistent panels.
         * @param {boolean} force - Forces all panels to be removed including persistent panels
         */
        function clearPanels(force) {
            weavy.debug("clearing" + (force ? " all" : "") + " panels")
            _panels.forEach(function (panel) {
                panel.remove(force);
            });
        }

        /**
         * Resets all panels to initial state.
         */
        function resetPanels() {
            weavy.debug("resetting panels")

            _panels.forEach(function (panel) {
                panel.reset();
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
                if (options.controls === true || options.controls.close) {
                    var close = document.createElement("div");
                    close.className = "weavy-icon" + (typeof options.controls.close === "string" ? " " + options.controls.close : "");
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
         * @param {string} panelId - The frame that should be preloaded.
         * @returns {external:Promise} [callback] - Function called when the frame has loaded
         */
        function preloadPanel(panelId) {
            weavy.debug("preloading panel:", panelId);
            var panel = _panels.get(panelId);

            var delayedFrameLoad = function () {
                if (!panel.isLoading && !panel.isLoaded) {
                    panel.load();
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

            return panel.whenLoaded();
        }

        /**
         * Preload all frames. Frames will be loaded sequentially starting with system frames. 
         * Preloading is ignored on mobile devices.
         * @param {boolean} [force] - Force preloading for all frames, otherwise only system frames will be preloaded.
         */
        function preloadPanels(force) {
            if (weavy.options.isMobile) {
                return Promise.reject();
            }

            var preloadRoot = this;

            return weavy.whenLoaded().then(function () {
                var panels;

                if (preloadRoot instanceof HTMLElement && preloadRoot.dataset.containerId) {
                    panels = _panelsContainers.get(preloadRoot.dataset.containerId).panels;
                } else {
                    panels = Array.from(_panels.values());
                }

                var currentlyLoadingFrames = panels.filter(function (panel) { return panel.isLoading; });
                if (currentlyLoadingFrames.length) {
                    // Wait until user loaded frames has loaded
                    weavy.debug("preload waiting for " + currentlyLoadingFrames.length + " panels");
                    return Promise.all(currentlyLoadingFrames.map(function (panel) { return panel.whenLoaded() })).then(function () { return preloadPanels.call(preloadRoot, force); });
                }

                var unloadedPanels = panels.filter(function (panel) { return panel.dataset.preload === "true" && !panel.isLoading && !panel.isLoaded });
                if (unloadedPanels.length) {
                    // Preload all panels with 'preload: true'
                    return Promise.all(unloadedPanels.map(function (panel) { return panel.preload() })).then(function () { return preloadPanels.call(preloadRoot, force) });
                } else if (force) {
                    // Preload any other panels except 'preload: false'
                    var remainingPanels = panels.filter(function (panel) { return panel.dataset.preload !== "false" && !panel.isLoading && !panel.isLoaded });
                    if (remainingPanels.length) {
                        return remainingPanels[0].preload().then(function () {
                            return weavy.timeout(1500).then(function () {
                                //preload next after delay
                                return preloadPanels.call(preloadRoot, true);
                            });
                        });
                    }
                }

                weavy.debug("preload done");
                return Promise.resolve();
            });
        }

        weavy.on("panel-loading", function (e, panelLoading) {
            var $panel = $(_panels.get(panelLoading.panelId));

            if (panelLoading.isLoading) {
                $panel.addClass(panelLoading.fillBackground ? "weavy-loading weavy-loading-fill" : "weavy-loading");
            } else {
                $panel.removeClass("weavy-loading weavy-loading-fill");
            }
        });

        weavy.on("clear-user signed-out", closePanels);
        weavy.on("after:clear-user after:signed-out", resetPanels);
        weavy.on("user-error", function () {
            clearPanels()
        });
        weavy.on("destroy", clearPanels.bind(this, true));
        weavy.on("load", function () {
            if (weavy.options.preload !== false) {
                weavy.timeout(5000).then(preloadPanels)
            }
        });

        // Exports
        this.clearPanels = clearPanels;
        this.closePanels = closePanels;
        this.createContainer = createPanelsContainer;
        this.getContainer = function (containerId) {
            return _panelsContainers.get(containerId || "global");
        };
        this.getPanel = function (panelId) {
            return _panels.get(panelId);
        };
        this.preload = preloadPanels;
        this.resetPanels = resetPanels;
        
    };

    /**
     * Default panels options
     * 
     * @example
     * WeavyPanels.defaults = {
     *     controls: {
     *         close: true
     *     }
     * };
     *
     * @name defaults
     * @memberof panels
     * @type {Object}
     * @property {Object} controls - Set to `false` to disable control buttons
     * @property {boolean} controls.close - Render a close panel control button.
     */
    WeavyPanels.defaults = {
        controls: {
            close: false
        }
    };

    return WeavyPanels;

}));


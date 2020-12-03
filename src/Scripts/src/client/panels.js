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

    /**
     * @class WeavyPanels
     * @classdesc 
     * Panel manager for handling for iframes and their communication.
     * 
     * The panel management is split up into a panels container which can contain multiple panels. 
     * Each panel is essentialy a wrapped iframe. 
     * The panels container provides the possibility to have multiple panels in the same client container
     * and adds the possibility to shift between which panel that is visible in the container as a tab behavior.
     **/

    /**
     * Creates an instance of the panel manager.
     * 
     * @constructor
     * @hidecontructor
     * @param {Weavy} weavy - The weavy instance the panel manager belongs to.
     */
    var WeavyPanels = function (weavy) {

        var _panelsContainers = new Map();
        var _panels = new Map();
        var loadingTimeout = [];

        var _whenClosed = WeavyPromise.resolve();

        var _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        /**
         * Creates a new [panel container]{@link WeavyPanels~container}. The container must be attached to the DOM after being created.
         * 
         * @function
         * @name WeavyPanels#createContainer
         * @param {string} containerId=global - The id of the container.
         * @returns {WeavyPanels~container}
         */
        function createPanelsContainer(containerId) {
            containerId = containerId || "global";
            var containerElementId = weavy.getId("panels-" + containerId);

            /**
             * Container for multiple panels with common functionality for the panels.
             * 
             * Use {@link WeavyPanels~container#addPanel} to create a panel in the container.
             * 
             * Each child panel will propagate it's events to the panel container and all the panel container events will propagate to the weavy instance.
             * 
             * @typedef WeavyPanels~container
             * @typicalname ~container
             * @type {HTMLElement}
             * @property {string} id - Unique id for the container. Using containerId processed with {@link Weavy#getId}
             * @property {string} containerId - The provided id unprocessed.
             * @property {string} className - DOM class: "weavy-panels"
             * @property {function} addPanel - {@link WeavyPanels~container#addPanel} creates a {@link WeavyPanels~panel} in the panel container and returns it.
             * @property {Object} eventParent - Unset. Set the eventParent as a reference to a parent to provide event propagation to that object.
             * @property {function} on - Binding to the [.on()]{@link WeavyEvents#on} eventhandler of the weavy instance.
             * @property {function} one - Binding to the [.one()]{@link WeavyEvents#one} eventhandler of the weavy instance.
             * @property {function} off - Binding to the [.off()]{@link WeavyEvents#off} eventhandler of the weavy instance.
             * @property {function} triggerEvent - Using {@link WeavyEvents#triggerEvent} of the weavy instance to trigger events on the panel container that propagates to the weavy instance.
             **/
            var panels = document.createElement("div");
            panels.id = containerElementId;
            panels.className = "weavy-panels";
            panels.addPanel = addPanel.bind(panels);

            panels.containerId = containerId;
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
         * Create a {@link WeavyPanels~panel} that has frame handling. If the panel already exists it will return the existing panel.
         * 
         * @function
         * @name WeavyPanels~container#addPanel
         * @param {string} panelId - The id of the panel.
         * @param {url} [url] - Optional url. The page will not be loaded until {@link WeavyPanels~panel#preload} or {@link WeavyPanels~panel#open} is called.
         * @param {Object} [attributes] - All panel attributes are optional
         * @param {string} [attributes.type] - Type added as data-type attribute.
         * @param {boolean} [attributes.persistent] - Should the panel remain when {@link WeavyPanels~panel#remove} or {@link WeavyPanels#clearPanels} are called?
         * @param {boolean} [attributes.preload] - Should the panel be preloaded when idle?
         * @returns {WeavyPanels~panel}
         * @emits WeavyPanels#panel-added
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

            /**
             * Wrapped iframe with event handling, states, preloading and postMessage communication.
             * 
             * @typedef WeavyPanels~panel
             * @type {HTMLElement}
             * @typicalname ~panel
             * @property {string} id - Unique id for the container. Using panelId processed with {@link Weavy#getId}.
             * @property {string} panelId - Unprocessed id for the panel.
             * @property {string} className - DOM class: "weavy-panel".
             * @property {string} [dataset.type] - Any provided type.
             * @property {boolean} [dataset.persistent] - Will the panel remain when {@link WeavyPanels~panel#remove} or {@link WeavyPanels#clearPanels} are called?
             * @property {boolean} [dataset.preload] - Should the panel be preloaded when idle
             * @property {IFrame} frame - Reference to the child iframe
             * @property {string} frame.id - Id of the iframe
             * @property {string} frame.className - DOM class: "weavy-panel-frame"
             * @property {string} frame.name - Window name for the frame
             * @property {string} frame.dataset.src - The original url for the panel.
             * @property {string} frame.dataset.weavyId - The id of the weavy instance the frame belongs to. Provided for convenience.
             * @property {string} [frame.dataset.type] - Any provided type.
             * @property {Object} eventParent - Reference to the parent panels container.
             * @property {function} on() - Binding to the [.on()]{@link WeavyEvents#on} eventhandler of the weavy instance.
             * @property {function} one() - Binding to the [.one()]{@link WeavyEvents#one} eventhandler of the weavy instance.
             * @property {function} off() - Binding to the [.off()]{@link WeavyEvents#off}  eventhandler of the weavy instance.
             * @property {function} triggerEvent() - Using {@link WeavyEvents#triggerEvent} of the weavy instance to trigger events on the panel container that propagates to the weavy instance.
             * @property {boolean} isOpen - Get if the panel is open.
             * @property {boolean} isLoading - Get if the panel is loading. Set to true to visually indicate that the panel is loading. Set to false to turn off the visual indication.
             * @property {boolean} isLoaded - Get if the panel is loaded. Set to true to visually indicate that the panel is loading. Set to false to turn off the visual indication.
             **/
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
                // Stores the provided url as data src for load when requested later.
                // If the frame src is unset it means that the frame is unloaded
                // If both data src and src are set it means it's loading
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

            /**
             * Open a the panel. The open waits for the [weavy.whenReady]{@link Weavy#whenReady} to complete, then opens the panel.
             *
             * Returns a promise that is resolved when the panel is opened and fully loaded.
             * 
             * @function
             * @name WeavyPanels~panel#open
             * @param {string} [destination] - Tells the panel to navigate to a specified url.
             * @emits WeavyPanels#panel-open
             * @returns {external:Promise}
             */
            panel.open = openPanel.bind(panelsRoot, panelId);

            /**
             * [Open]{@link WeavyPanels~panel#open} or [close]{@link WeavyPanels~panel#close} the panel.
             * 
             * Returns promise that is resolved when the panel is opened and loaded or closed.
             * 
             * @function
             * @name WeavyPanels~panel#toggle
             * @param {string} [destination] - Tells the panel to navigate to a specified url when opened.
             * @emits WeavyPanels#panel-toggle
             * @returns {external:Promise}
             */
            panel.toggle = togglePanel.bind(panelsRoot, panelId);

            /**
             * Closes the panel.
             * 
             * Returns a promise that is resolved when the panel is closed.
             * 
             * @function
             * @name WeavyPanels~panel#close
             * @returns {external:Promise}
             * @emits WeavyPanels#panel-close
             */
            panel.close = closePanel.bind(panelsRoot, panelId);

            /**
             * Load an url with data directly in the panel. Uses turbolinks forms if the panel is loaded and a form post to the frame if the panel isn't loaded.
             *          
             * Loads the predefined panel url if url parameter is omitted.
             * 
             * Returns a promise that is resolved when the panel is loaded.
             *
             * @function
             * @name WeavyPanels~panel#load
             * @param {string} [url] - The url to load in the panel.
             * @param {any} [data] -  URL/form-encoded data to send
             * @param {string} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
             * @param {bool} [replace] - Replace the content in the panel and load it fresh.
             * @returns {external:Promise}
             */
            panel.load = loadPanel.bind(panelsRoot, panelId);

            /**
             * Preload the panel. The frame needs to have data-src attribute set.
             * 
             * Returns a promise that is resolved when the panel is loaded.
             *
             * @function
             * @name WeavyPanels~panel#preload
             * @returns {external:Promise}
             **/
            panel.preload = preloadPanel.bind(panelsRoot, panelId);

            /**
             * Tells the panel that it needs to reload it's content.
             * 
             * Returns a promise that is resolved when the panel is loaded.
             *
             * @function
             * @name WeavyPanels~panel#reload
             * @emits Weavy#panel-reload
             * @returns {external:Promise}
             **/
            panel.reload = reloadPanel.bind(panelsRoot, panelId);

            /** 
             * Creates a new panel iframe and resets the panel to its original url. This can be used if the panel has ended up in an incorrect state.
             * 
             * @function
             * @name WeavyPanels~panel#reset
             * @returns {external:Promise}
             **/
            panel.reset = resetPanel.bind(panelsRoot, panelId);

            /**
             * Sends a postMessage to the panel iframe.
             * 
             * @function
             * @name WeavyPanels~panel#postMessage
             * @param {object} message - The Message to send
             * @param {Transferable[]} [transfer] - A sequence of Transferable objects that are transferred with the message.
             * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
             * @returns {external:Promise}
             */
            panel.postMessage = postMessage.bind(panelsRoot, panelId);

            /**
             * Removes a panel. If the panel is open it will be closed before it's removed.
             * 
             * @function
             * @name WeavyPanels~panel#remove
             * @param {boolean} [force] - True will remove the panel even if it's persistent
             * @emits WeavyPanels#panel-removed
             */
            panel.remove = removePanel.bind(panelsRoot, panelId);

            // Promises

            /**
             * Promise that resolves when the panel iframe has connected via postMessage.
             * 
             * @type {WeavyPromise}
             * @name WeavyPanels~panel#whenReady
             * @property {string} panelId - The id of the panel
             * @property {string} windowName -  the name of the frame
             **/
            panel.whenReady = new WeavyPromise();
            weavy.on(wvy.postal, "ready", { weavyId: weavy.getId(), windowName: frame.name }, function () {
                panel.whenReady.resolve({ panelId: panelId, windowName: frame.name });
            });

            /**
             * Promise that resolves when the panel iframe has fully loaded.
             * 
             * @type {WeavyPromise}
             * @name WeavyPanels~panel#whenLoaded
             * @property {string} panelId - The id of the panel
             * @property {string} windowName -  the name of the frame
             **/
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
             * @event WeavyPanels#panel-added
             * @category events
             * @returns {Object}
             * @property {Element} panel - The created panel
             * @property {string} panelId - The id of the panel
             * @property {url} url - The url for the frame.
             * @property {Object} attributes - Panel attributes
             * @property {string} attributes.type - Type of the panel.
             * @property {boolean} attributes.persistent - Will the panel remain when {@link WeavyPanels~panel#remove} or {@link WeavyPanels#clearPanels} are called?
             */
            panelsRoot.triggerEvent("panel-added", { panel: panel, panelId: panelId, url: url, attributes: attributes });

            return panel;
        }

        /**
         * Registers the panel frame window in wvy.postal and adds a ready listener for the panel and inits the loading indication.
         * 
         * @param {string} panelId - The id of the panel
         */
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
         * @param {string} panelId - The id of the panel that is loading.
         * @param {boolean} isLoading - Sets whether the panel is loading or not.
         * @param {boolean} [fillBackground] - Sets an opaque background that hides any panel content during loading.
         * @emits WeavyPanels#panel-loading
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
             * @event WeavyPanels#panel-loading
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
         * @param {string} panelId - The id of the panel to reload.
         * @emits WeavyPanel#panel-reload
         */
        function reloadPanel(panelId) {
            return weavy.whenReady().then(function () {
                setPanelLoading.call(weavy, panelId, true);

                var panel = _panels.get(panelId);

                panel.postMessage({ "name": "reload" })

                /**
                 * Event triggered when a panel is reloading it's content.
                 * 
                 * @category events
                 * @event WeavyPanels#panel-reload
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel being reloaded.
                 */
                panel.triggerEvent("panel-reload", { panelId: panelId });
            });
        }

        /**
         * Loads an url in a frame or sends data into a specific frame. Will replace anything in the frame.
         * 
         * @ignore
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
         * Loads the predefined panel url if url parameter is omitted.
         * 
         * @param {string} panelId - The id of the panel to load in.
         * @param {string} [url] - The url to load in the panel.
         * @param {any} [data] -  URL/form-encoded data to send
         * @param {string} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
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
         * Returns a promise that is resolved when the panel is opened and fully loaded.
         * 
         * @param {string} panelId - The id of the panel to open.
         * @param {string} [destination] - Tells the panel to navigate to a specified url.
         * @emits WeavyPanels#panel-open
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
                 * @event WeavyPanels#panel-open
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel being openened.
                 * @property {string} [destination] - Any url being requested to open in the panel.
                 * @property {WeavyPanels~container} panels - The panels container for the panel
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
         * Closes a panel.
         * 
         * @category panels
         * @param {string} [panelId] - The id of any specific panel to close. If that panel is open, the panel will be closed, otherwise no panel will be closed.
         * @returns {external:Promise}
         * @emits WeavyPanels#panel-close
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
                         * Event triggered when weavy closes all panels.
                         * 
                         * @category events
                         * @event WeavyPanels#panel-close
                         * @returns {Object}
                         * @property {string} panelId - The id of the panel
                         * @property {WeavyPanels~container} panels - The panels container for the panel
                         */
                        panel.triggerEvent("panel-close", { panelId: panelId, panels: panelsRoot });
                    }

                    panel.postMessage({ name: 'close' });

                    // Return timeout promise
                    // TODO: Each panel should keep track of their own closing promise
                    _whenClosed = weavy.timeout(250);

                    _whenClosed.then(function () {
                        panel.postMessage({ name: 'closed' });
                    });
                } 

                return _whenClosed();
            });
        }

        /**
         * [Open]{@link WeavyPanels#open} or [close]{@link WeavyPanels#close} a specific panel.
         * 
         * @param {string} panelId - The id of the panel toggled.
         * @param {string} [destination] - Tells the panel to navigate to a specified url when opened.
         * @returns {external:Promise}
         * @emits WeavyPanels#panel-toggle
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
                    * @event WeavyPanels#panel-toggle
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
         * @returns {external:Promise}
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
         * Creates a new panel iframe and resets the panel to its original url. This can be used if the panel has ended up in an incorrect state.
         * 
         * @param {string} panelId - The id of the panel to reset.
         * @returns {external:Promise}
         */
        function resetPanel(panelId) {
            if (!(this instanceof HTMLElement)) {
                weavy.warn("removePanel: No valid panel root defined for " + panelId);
                return Promise.reject();
            }

            var panelsRoot = this;

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

                    /**
                     * Triggered when a panel has been reset.
                     * 
                     * @event WeavyPanels#panel-reset
                     * @category events
                     * @returns {Object}
                     * @property {string} panelId - Id of the reset panel
                     */
                    panelsRoot.triggerEvent("panel-reset", { panelId: panelId });

                    if (isOpen) {
                        return loadPanel(panelId, frameSrc, null, null, true)
                    }

                    return Promise.resolve();
                }

                return Promise.reject(new Error("removePanel(): Panel " + panelId + " not found"));
            });
        }

        /**
         * Removes a panel. If the panel is open it will be closed before it's removed.
         * 
         * @param {string} panelId - The id of the panel to remove
         * @param {boolean} [force] - True will remove the panel even if it's persistent
         * @returns {external:Promise}
         * @emits WeavyPanels#panel-removed
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
                             * @event WeavyPanels#panel-removed
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
         * @memberof WeavyPanels#
         * @function
         */
        function closePanels() {
            weavy.debug("closing panels")
            _panels.forEach(function (panel) {
                panel.close();
            });
        }

        /**
         * Removes all panels except persistent panels.
         * @memberof WeavyPanels#
         * @function
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
         * @memberof WeavyPanels#
         * @function
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
         * Panels created using {@link WeavyPanels#addPanel} have the appropriate settings for preload.
         * If the frame belongs to a panel it will triggger loading animations.
         * 
         * @param {string} panelId - The frame that should be preloaded.
         * @returns {external:Promise}
         */
        function preloadPanel(panelId) {
            var panel = _panels.get(panelId);

            var delayedFrameLoad = function () {
                if (!panel.isLoading && !panel.isLoaded) {
                    weavy.debug("preloading panel:", panelId);
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
         * 
         * @name WeavyPanels#preload
         * @function
         * @param {boolean} [force] - Force preloading for all frames, otherwise only system frames will be preloaded.
         */
        function preloadPanels(force) {
            if (_isMobile) {
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

        /**
         * Get a panels container.
         * 
         * @memberof WeavyPanels#
         * @function
         * @param {string} containerId=global - The id of the panels container
         * @returns {WeavyPanels~container}
         */
        this.getContainer = function (containerId) {
            return _panelsContainers.get(containerId || "global");
        };

        /**
         * Get a panel.
         * 
         * @memberof WeavyPanels#
         * @function
         * @param {string} panelId - The id of the panel
         * @returns {WeavyPanels~panel}
         */
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
     * @memberof WeavyPanels
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


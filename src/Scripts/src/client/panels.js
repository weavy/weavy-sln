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
        root.WeavyPanels = factory(root.WeavyPromise, root.WeavyUtils);
    }
}(typeof self !== 'undefined' ? self : this, function (WeavyPromise, utils) {

    console.debug("panels.js");

    var _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

    var WeavyPanel = function (weavy, _panels, panelsContainer, panelId, url, attributes) {
        if (!panelId) {
            weavy.error("new WeavyPanel() is missing panelId");
            return;
        }

        var loadingTimeout = [];

        var _whenClosed = WeavyPromise.resolve();
        weavy.debug("creating panel", panelId);

        var panelElementId = weavy.getId("panel-" + panelId);

        if (!utils.isPlainObject(attributes)) {
            attributes = {};
        }

        var createFrame = function(url) {
            // frame
            var frame = document.createElement("iframe");
            frame.className = "weavy-panel-frame";
            frame.id = weavy.getId("panel-frame-" + panelId);
            frame.name = weavy.getId("panel-frame-" + panelId);
            frame.allowFullscreen = 1;
            frame.dataset.weavyId = weavy.getId();

            if (url) {
                // Stores the provided url as data src for load when requested later.
                // If the frame src is unset it means that the frame is unloaded
                // If both data src and src are set it means it's loading
                frame.dataset.src = weavy.httpsUrl(url, weavy.options.url);
            }

            return frame;
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
        var panel = this;
        panel.panelId = panelId;

        //var panelNode = Reflect.construct(HTMLElement, [], this.constructor);
        panel.node = document.createElement("div");

        panel.node.className = "weavy-panel";
        panel.node.id = panelElementId;
        panel.node.dataset.id = panelId;

        // Create iframe
        panel.frame = createFrame(url);
        panel.node.appendChild(panel.frame);
        panel.node.frame = panel.frame;

        // Events
        panel.eventParent = panelsContainer;
        panel.on = weavy.events.on.bind(panel);
        panel.one = weavy.events.one.bind(panel);
        panel.off = weavy.events.off.bind(panel);
        panel.triggerEvent = weavy.events.triggerEvent.bind(panel);

        if (panel.frame.dataset.src) {
            panel.location = weavy.httpsUrl(panel.frame.dataset.src, weavy.options.url);
        }

        if (attributes.type) {
            panel.node.dataset.type = attributes.type;
        }

        if (attributes.persistent !== undefined) {
            panel.node.dataset.persistent = String(attributes.persistent);
        }

        if (attributes.preload !== undefined) {
            panel.node.dataset.preload = String(attributes.preload);
        }

        try {
            weavy.debug("Appending panel", panelId);
            panelsContainer.node.appendChild(panel.node);
            _panels.set(panelId, panel);
        } catch (e) {
            weavy.error("Could not append panel", panelId)
        }

        // States


        // FUNCTIONS

        var _isRegistered = false;
        var _isReady = false;
        var _isLoaded = false;
        var _isLoading = false;

        /**
         * Registers the panel frame window in wvy.postal and adds a ready listener for the panel and inits the loading indication.
         */
        var registerLoading = function (panel) {
            if (!panel.isRegistered) {
                try {
                    wvy.postal.registerContentWindow(panel.frame.contentWindow, panel.frame.name, weavy.getId());
                } catch (e) {
                    weavy.error("Could not register window id", panel.frame.name, e);
                }

                _isRegistered = true;
            }
        }

        /**
         * Set the loading indicator on the specified panel. The loading indicatior is automatically removed on loading. It also makes sure the panel is registered and sets up frame communication when loaded.
         * 
         * @function
         * @param {WeavyPanels~panel} panel - The panel that should update.
         * @emits WeavyPanels#panel-loading
         */
        function updatePanelLoading(panel) {
            if (panel.isLoading) {
                registerLoading(panel);
                loadingTimeout[panelId] = weavy.whenTimeout(30000);
                loadingTimeout[panelId].then(function () { _isLoading = false; updatePanelLoading(panel); });
            } else {
                if (loadingTimeout[panelId]) {
                    loadingTimeout[panelId].reject();
                    delete loadingTimeout[panelId];
                }
            }

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
            panel.triggerEvent("panel-loading", { panelId: panelId, isLoading: panel.isLoading, isLoaded: panel.isLoaded });
        }

        panel.loadingStarted = function (replaced) {
            if (replaced) {
                _isLoaded = false;
            }
            _isLoading = true;
            updatePanelLoading(panel);
        }

        panel.loadingFinished = function () {
            _isLoaded = true;
            _isLoading = false;
            updatePanelLoading(panel);
        }

        panel.on("panel-loading", function (e, panelLoading) {
            if (panelLoading.isLoading) {
                panel.node.classList.add("weavy-loading");
            } else {
                panel.node.classList.remove("weavy-loading");
            }

            if (panelLoading.isLoaded) {
                panel.node.classList.add("weavy-loaded");
            } else {
                panel.node.classList.remove("weavy-loaded");
            }
        });

        /**
         * Check if a panel is currently open
         * 
         * @property {boolean} isOpem - True if the panel is open
         */
        Object.defineProperty(panel, "isOpen", {
            get: function () { return panel.node.classList.contains("weavy-open"); }
        });

        /**
         * Check if a panel is currently loading.
         * 
         * @property {boolean} isLoading - True if the panel currently is loading
         */
        Object.defineProperty(panel, "isLoading", {
            get: function () {
                return _isLoading;
            }
        });

        /**
         * Check if the panel frame is registered.
         * 
         * @property {boolean} isRegistered - True if the panel is registered
         */
        Object.defineProperty(panel, "isRegistered", {
            get: function () {
                return _isRegistered;
            }
        });

        /**
         * Check if the panel frame has received ready.
         * 
         * @property {boolean} isReady - True if the panel has received ready
         */
        Object.defineProperty(panel, "isReady", {
            get: function () {
                return _isReady;
            }
        });

        /**
         * Check if a panel has finished loading.
         * 
         * @property {boolean} isLoaded - True if the panel has finished loading.
         */
        Object.defineProperty(panel, "isLoaded", {
            get: function () {
                return _isLoaded;
            }
        });


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

        var _onReady = function (e, ready) {
            _isReady = true;
            var previousLocation = panel.location;
            panel.location = weavy.httpsUrl(ready.location, weavy.options.url);

            panel.loadingFinished();

            if (panel.isOpen && previousLocation && previousLocation !== panel.location) {
                panel.node.dataset.stateChangedAt = Date.now();
                weavy.history.addState("replace");
            }

            panel.whenReady.resolve({ panelId: panelId, windowName: panel.frame.name });
        };

        weavy.on(wvy.postal, "ready", { weavyId: weavy.getId(), windowName: panel.frame.name }, _onReady);

        var unregisterReady = function () {
            weavy.off(wvy.postal, "ready", { weavyId: weavy.getId(), windowName: panel.frame.name }, _onReady);
        };

        /**
         * Promise that resolves when the panel iframe has fully loaded.
         * 
         * @type {WeavyPromise}
         * @name WeavyPanels~panel#whenLoaded
         * @property {string} panelId - The id of the panel
         * @property {string} windowName -  the name of the frame
         **/
        panel.whenLoaded = new WeavyPromise();
        weavy.on(wvy.postal, "load", { weavyId: weavy.getId(), windowName: panel.frame.name }, function () {
            panel.whenLoaded.resolve({ panelId: panelId, windowName: panel.frame.name, location: panel.location });
        });

        // OTHER FUNCTIONS

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
        function sendToFrame(frame, url, data, method) {
            // Todo: return complete promise instead
            return weavy.whenReady().then(function () {
                method = String(method || "get").toLowerCase();

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
                    var requestForm = document.createElement("form");
                    requestForm.action = url;
                    requestForm.method = method;
                    requestForm.target = frame.name;

                    if (data) {
                        data = data.replace(/\+/g, '%20');
                    }
                    var dataArray = data && data.split("&") || [];

                    // Add all data as hidden fields
                    dataArray.forEach(function (pair) {
                        var nameValue = pair.split("=");
                        var name = decodeURIComponent(nameValue[0]);
                        var value = decodeURIComponent(nameValue[1]);
                        
                        var formInput = document.createElement("input");
                        formInput.type = 'hidden';
                        formInput.name = name;
                        formInput.value = value;

                        requestForm.appendChild(formInput);
                    });


                    // Send the form and forget it
                    weavy.nodes.container.appendChild(requestForm);
                    requestForm.submit();
                    requestForm.remove();
                }
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

        // METHODS

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
        panel.open = function (destination, noHistory) {

            return weavy.whenReady().then(function () {
                weavy.info("openPanel", panel.panelId + (destination ? " " + destination : ""), noHistory ? "no history" : "with history");

                if (!panel.node.dataset.persistent && !weavy.authentication.isAuthorized()) {
                    weavy.warn("Unauthorized, can't open panel " + panel.panelId);
                    return Promise.reject({ panelId: panelId, destination: destination });
                }

                panel.node.classList.add("weavy-open");

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
                var openResult = panel.triggerEvent("panel-open", { panelId: panel.panelId, destination: destination, panels: panelsContainer });

                if (openResult !== false && openResult.panelId === panel.panelId) {
                    return panel.load(openResult.destination, null, null, null, noHistory);
                } else {
                    return Promise.reject({ panelId: panel.panelId, destination: destination, panels: panelsContainer });
                }
            });
        };



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
        panel.toggle = function (destination) {
            return weavy.whenReady().then(function () {
                weavy.info("toggling panel", panel.panelId);

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
                panel.triggerEvent("panel-toggle", { panelId: panel.panelId, closed: shouldClose });

                if (shouldClose) {
                    return panel.close();
                } else {
                    return panel.open(typeof (destination) === "string" ? destination : null);
                }
            });
        }

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
        panel.close = function (noHistory, noEvent) {

            return weavy.whenReady().then(function () {

                if (panel.isOpen) {
                    weavy.info("closePanel", panel.panelId, noEvent === true ? "no event" : "", noHistory === true ? "no history" : "");

                    panel.node.classList.remove("weavy-open");

                    if (noEvent !== true) {
                        /**
                         * Event triggered when weavy closes a panel.
                         * 
                         * @category events
                         * @event WeavyPanels#panel-close
                         * @returns {Object}
                         * @property {string} panelId - The id of the panel
                         * @property {WeavyPanels~container} panels - The panels container for the panel
                         */
                        panel.triggerEvent("panel-close", { panelId: panel.panelId, panels: panelsContainer });

                        if (noHistory !== true) {
                            panel.node.dataset.stateChangedAt = Date.now();
                            weavy.history.addState();
                        }
                    }

                    panel.postMessage({ name: 'close' });


                    // Return timeout promise
                    _whenClosed = weavy.whenTimeout(250);

                    _whenClosed.then(function () {
                        panel.postMessage({ name: 'closed' });
                    });
                }

                return _whenClosed();
            });
        };

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
        panel.load = function (url, data, method, replace, noHistory) {
            return weavy.whenReady().then(function () {
                var frameTarget = panel.frame;

                if (url) {
                    url = weavy.httpsUrl(url, weavy.options.url);

                    panel.location = url;

                    // Not yet fully loaded
                    if (!panel.isReady) {
                        panel.loadingStarted(replace);
                        sendToFrame(frameTarget, url, data, method);
                    } else {
                        if (replace) {
                            panel.loadingStarted(true);
                        }
                        // Fully loaded, send using turbolinks
                        panel.postMessage({ name: 'turbolinks-visit', url: url, data: data, method: method, action: "replace" });
                    }

                } else if (!panel.isLoaded && !panel.isLoading) {
                    // start predefined loading
                    weavy.debug("panels:", panelId, "predefined loading");
                    panel.loadingStarted(true);
                    frameTarget.setAttribute("src", frameTarget.dataset.src);
                } else if (panel.isLoaded || panel.isLoading) {
                    // already loaded
                    panel.postMessage({ name: 'show' });
                } else {
                    // No src defined
                    return Promise.resolve();
                }

                // ADD HISTORY
                if (noHistory !== true) {
                    panel.node.dataset.stateChangedAt = Date.now();
                    weavy.debug("panels: adding history state", panelId, panel.location);
                    weavy.history.addState();
                }

                return panel.whenLoaded();
            });
        };

        /**
         * Preload the panel. The frame needs to have data-src attribute set.
         * 
         * Returns a promise that is resolved when the panel is loaded.
         *
         * @function
         * @name WeavyPanels~panel#preload
         * @returns {external:Promise}
         **/
        panel.preload = function () {
            var delayedFrameLoad = function () {
                if (!panel.isLoading && !panel.isLoaded) {
                    weavy.debug("preloading panel:", panelId);
                    panel.load(null, null, null, null, true);
                }
            };

            // Wait for idle
            if (window.requestIdleCallback) {
                window.requestIdleCallback(delayedFrameLoad);
            } else {
                if (document.readyState === "complete") {
                    delayedFrameLoad();
                } else {
                    weavy.one(document, "load", delayedFrameLoad);
                }
            }

            return panel.whenLoaded();
        }

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
        panel.reload = function () {
            return weavy.whenReady().then(function () {
                panel.isLoading = true;

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
         * Creates a new panel iframe and resets the panel to its original url. This can be used if the panel has ended up in an incorrect state.
         * 
         * @function
         * @name WeavyPanels~panel#reset
         * @returns {external:Promise}
         **/
        panel.reset = function (noHistory) {
            return weavy.whenReady().then(function () {
 
                var oldFrame = panel.frame;

                if (oldFrame) {
                    weavy.log("resetting panel", panelId);

                    var newFrame = createFrame(oldFrame.dataset.src || oldFrame.src);

                    _isRegistered = false;
                    _isReady = false;
                    _isLoaded = false;
                    _isLoading = false;

                    /*
                    if (panel.frame.dataset.src) {
                        panel.location = weavy.httpsUrl(newFrame.dataset.src, weavy.options.url);
                    }
                    */

                    var isOpen = panel.isOpen;

                    try {
                        wvy.postal.unregisterContentWindow(oldFrame.name, weavy.getId());
                    } catch (e) {
                        weavy.error("Could not unregister window id", oldFrame.name, e);
                    }

                    panel.node.removeChild(oldFrame);
                    panel.node.appendChild(newFrame);

                    panel.frame = newFrame;

                    /**
                        * Triggered when a panel has been reset.
                        * 
                        * @event WeavyPanels#panel-reset
                        * @category events
                        * @returns {Object}
                        * @property {string} panelId - Id of the reset panel
                        */
                    panel.triggerEvent("panel-reset", { panelId: panelId });


                    if (isOpen) {
                        return panel.load(null, null, null, null, true)
                    }

                    return Promise.resolve();
                } 

                return Promise.reject();
            });
        }

        /** 
         * Gets the current history state of the panel
         * 
         * @function
         * @name WeavyPanels~panel#getState
         * @returns {WeavyHistory~panelState}
         **/
        panel.getState = function () {
            weavy.debug("getPanelState", panelId);
            return weavy.history.getStateFromPanel(panelId);
        };

        /**
         * Sets the state of the panel.
         * 
         * @function
         * @name WeavyPanels~panel#setState
         * @param {WeavyHistory~panelState} state - The history panel state to apply
         * @returns {external:Promise}
         **/
        panel.setState = function (state) {
            if (!state || state.panelId !== panelId) {
                weavy.warn("setState: State not valid " + panelId);
                return;
            }

            if (state.isOpen) {
                var panelLocation = state.location !== panel.location ? state.location : null;
                if (panel.isOpen) {
                    return panel.open(panelLocation, true);
                } else {
                    return panel.open(state.location, true);
                }
            } else {
                return panel.close(true);
            }
        }

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
        panel.postMessage = function (message, transfer) {
            return weavy.whenReady().then(function () {
                var frameTarget = panel.frame;
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
         * Removes a panel. If the panel is open it will be closed before it's removed.
         * 
         * @function
         * @name WeavyPanels~panel#remove
         * @param {boolean} [force] - True will remove the panel even if it's persistent
         * @emits WeavyPanels#panel-removed
         * @returns {external:Promise}
         */

        panel.remove = function (force, noHistory) {

            var _removePanel = function (noHistory) {
                if (!panel.node.dataset.persistent || force) {
                    if (panel.isOpen) {
                        panel.id = weavy.getId("weavy-panel-removed-" + panelId);
                        return weavy.whenTimeout(0).then(function () {
                            return panel.close(noHistory).then(function () {
                                return panel.remove(force, noHistory);
                            });
                        });
                    } else {
                        unregisterReady();

                        try {
                            wvy.postal.unregisterContentWindow(panel.frame.name, weavy.getId());
                        } catch (e) {
                            weavy.error("Could not unregister window id", panel.frame.name, e);
                        }

                        panel.node.remove();
                        _panels.delete(panelId);

                        /**
                         * Triggered when a panel has been removed.
                         * 
                         * @event WeavyPanels#panel-removed
                         * @category events
                         * @returns {Object}
                         * @property {string} panelId - Id of the removed panel
                         */
                        panelsContainer.triggerEvent("panel-removed", { panelId: panelId });

                        return Promise.resolve();
                    }
                }
            };

            return force ? _removePanel(noHistory) : weavy.whenReady().then(function () { return _removePanel(noHistory); });
        };





        // Frame handling

        // Close the panel from the inside
        weavy.on(wvy.postal, "request:close", { weavyId: weavy.getId(), windowName: panel.frame.name }, function () {
            panel.close();
        });

        // External controls

        panel.node.appendChild(renderControls.call(weavy, panel, attributes));

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
        panelsContainer.triggerEvent("panel-added", { panel: panel, panelId: panelId, url: url, attributes: attributes });

        return panel;

    };

    //WeavyPanel.prototype = Object.create(HTMLDivElement.prototype);
    //WeavyPanel.prototype.constructor = WeavyPanel;
    //Object.setPrototypeOf(WeavyPanel, HTMLDivElement);

    //WeavyPanel.prototype.connectedCallback = function () {
        // PANEL MOUNTED
    //};
    //customElements.define('weavy-panel', WeavyPanel);

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

        /**
         * Creates a new [panel container]{@link WeavyPanels~container}. The container must be attached to the DOM after being created.
         * 
         * @function
         * @name WeavyPanels#createContainer
         * @param {string} containerId=global - The id of the container.
         * @returns {WeavyPanels~container}
         */
        function createContainer(containerId) {
            containerId = containerId || "global";
            var containerElementId = weavy.getId("panels-" + containerId);

            var panelsContainer = { containerId: containerId };

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
            var panelsRoot = document.createElement("div");
            panelsRoot.id = containerElementId;
            panelsRoot.className = "weavy-panels";
            //panelsRoot.containerId = containerId;
            panelsRoot.dataset.containerId = containerId;

            panelsContainer.node = panelsRoot;
            panelsContainer.addPanel = function (panelId, url, attributes) {
                return new WeavyPanel(weavy, _panels, panelsContainer, panelId, url, attributes);
            };

            // Events
            panelsContainer.on = weavy.events.on.bind(panelsContainer);
            panelsContainer.one = weavy.events.one.bind(panelsContainer);
            panelsContainer.off = weavy.events.off.bind(panelsContainer);
            panelsContainer.triggerEvent = weavy.events.triggerEvent.bind(panelsContainer);

            _panelsContainers.set(containerId, panelsContainer);
            return panelsContainer;
        }

        function removeContainer(containerId, force) {
            containerId = containerId || "global";
            var container = _panelsContainers.get(containerId);

            if (force) {

                try {
                    container.node.remove();
                } catch (e) {
                    weavy.warn("Could not remove panels container");
                }

                _panelsContainers.delete(containerId);
                delete container.node;

                weavy.log("Panels container removed", containerId);
            }
        }

        /**
         * Closes all panels except persistent panels.
         * @memberof WeavyPanels#
         * @function
         * @returns {external:Promise}
         */
        function closePanels(noHistory) {
            weavy.debug("closing panels")

            var whenAllPanelsClosed = [];

            _panels.forEach(function (panel) {
                whenAllPanelsClosed.push(panel.close(noHistory));
            });

            return Promise.all(whenAllPanelsClosed)
        }

        /**
         * Removes all panels except persistent panels.
         * @memberof WeavyPanels#
         * @function
         * @param {boolean} force - Forces all panels to be removed including persistent panels
         * @returns {external:Promise}
         */
        function clearPanels(force) {
            weavy.debug("clearing" + (force ? " all" : "") + " panels", _panels.size)

            var whenAllPanelsCleared = [];

            _panels.forEach(function (panel) {
                whenAllPanelsCleared.push(panel.remove(force, true));
            });

            var whenContainersRemoved = Promise.all(whenAllPanelsCleared).then(function () {
                _panelsContainers.forEach(function (container, containerId) {
                    removeContainer(containerId, force);
                })
            })

            return whenContainersRemoved;
        }

        /**
         * Resets all panels to initial state.
         * @memberof WeavyPanels#
         * @function
         * @returns {external:Promise}
         */
        function resetPanels() {
            weavy.debug("resetting panels");

            var whenAllPanelsReset = [];

            _panels.forEach(function (panel) {
                whenAllPanelsReset.push(panel.reset(true));
            });

            return Promise.all(whenAllPanelsReset);
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

            if ('whenReady' in weavy) {
                return weavy.whenReady().then(function () {
                    var panels;

                    if (preloadRoot instanceof HTMLElement && preloadRoot.dataset.containerId) {
                        panels = _panelsContainers.get(preloadRoot.dataset.containerId).panels;
                    } else {
                        panels = Array.from(_panels.values());
                    }

                    var currentlyLoadingFrames = panels.filter(function (panel) { return panel.isLoading; });
                    if (currentlyLoadingFrames.length) {
                        // Wait until user loaded frames has loaded
                        //weavy.debug("preload waiting for " + currentlyLoadingFrames.length + " panels");
                        return Promise.all(currentlyLoadingFrames.map(function (panel) { return panel.whenLoaded() })).then(function () { return preloadPanels.call(preloadRoot, force); });
                    }

                    var unloadedPanels = panels.filter(function (panel) { return (panel.node.dataset.preload === "true" || panel.node.dataset.preload === "placeholder") && !panel.isLoading && !panel.isLoaded });
                    if (unloadedPanels.length) {
                        // Preload all panels with 'preload: true'
                        return Promise.all(unloadedPanels.map(function (panel) { return panel.preload() })).then(function () { return preloadPanels.call(preloadRoot, force) });
                    } else if (force) {
                        // Preload any other panels except 'preload: false'
                        var remainingPanels = panels.filter(function (panel) { return panel.node.dataset.preload !== "false" && !panel.isLoading && !panel.isLoaded });
                        if (remainingPanels.length) {
                            return remainingPanels[0].preload().then(function () {
                                return weavy.whenTimeout(1500).then(function () {
                                    //preload next after delay
                                    return preloadPanels.call(preloadRoot, true);
                                });
                            });
                        }
                    }

                    weavy.debug("preload done");
                    return Promise.resolve();
                });
            } else {
                return Promise.reject();
            }

        }


        var startPreload = function () {
            if (weavy.options.preload !== false) {
                weavy.whenTimeout(5000).then(function () { preloadPanels(); })
            }
        };

        weavy.on("load", startPreload);
        weavy.on("clear-user signed-out", function () { closePanels(true) });
        weavy.on("after:clear-user after:signed-out", function () { resetPanels(); });
        weavy.on("user-error", function () { clearPanels(); });
        weavy.on("destroy", function (e, destroy) {
            weavy.off("load", startPreload);
            destroy.whenAllDestroyed.push(clearPanels(true));
        });


        // Exports
        this.clearPanels = clearPanels;
        this.closePanels = closePanels;
        this.createContainer = createContainer;

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

        /**
         * Returns an array of all current panels
         * 
         * @memberof WeavyPanels#
         * @function
         * @returns {Array.<WeavyPanels~panel>}
         */
        this.getCurrentPanels = function () {
            return Array.from(_panels.values());
        }

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


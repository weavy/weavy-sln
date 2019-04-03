(function ($) {
    console.debug("widget.js");

    var _widgetIds = [];

    /**
     * Most options are optional except url. You may use multiple WeavyWidget.presets together with options when constructing the widget. Multiple option sets are merged together.
     * 
     * These option presets are available for easy configuration
     * * WeavyWidget.presets.core - All plugins disabled and minimal styles applied
     * * WeavyWidget.presets.panel - A minimal recommended configuration for making only a panel.
     * 
     * @example
     * var widget = new WeavyWidget({ url: "http://myweavysite.test" });
     * var coreWidget = new WeavyWidget(WeavyWidget.presets.core, { url: "http://myweavysite.test" });
     * 
     * @classdesc The core class for a Weavy Widget.
     * @constructor WeavyWidget
     * @param {...WeavyWidget#options} options - One or multiple option sets. Options will be merged together in order.
     * @typicalname widget
     */

    this.WeavyWidget = function () {
        /** 
         *  Reference to this instance
         *  @lends WeavyWidget#
         */
        var widget = this;

        var disconnected = false;
        var loadingTimeout = [];

        /**
         * Main options for the WeavyWidget. 
         * When the widget initializes, it connects to the server and processes the options and sends them back to the widget again. The options may then contain additional data. 
         * The widget triggers a {@link WeavyWidget#event:options} event when options are recieved from the server.
         * 
         * @category options
         * @typedef 
         * @type {Object}
         * @member
         * @property {Element} [container] - Container where the widget should be placed. If no Element is provided, a &lt;section&gt; is created next to the &lt;body&gt;-element.
         * @property {string} [className] - Additional classNames added to the widget.
         * @property {string} [https=adaptive] - How to enforce https-links. <br> • **force** -  makes all urls https.<br> • **adaptive** - enforces https if the calling site uses https.<br> • **default** - makes no change.
         * @property {string} [id] - An id for the instance. A unique id is always generated.
         * @property {boolean} [init=true] - Should the widget initialize automatically.
         * @property {boolean} [isMobile] - Indicates if the browser is mobile. Defaults to the RegExp expression <code>/iPhone&#124;iPad&#124;iPod&#124;Android/i.test(navigator.userAgent)</code>
         * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
         * @property {string} [logColor] - Hex color (#bada55) used for logging. A random color is generated as default.
         * @property {Element} [overlay] - Element to use for overlay purposes. May for instance use the overlay of another WeavyWidget instance.
         * @property {Object<string, Object>} [plugins] - Properties with the name of the plugins to configure. Each plugin may be enabled or disabled by setting the options to true or false. Providing an Object instead of true will enable the plugin and pass options to the plugin. See the reference for each plugin for available options.
         * @property {string} url - The URL to the Weavy-installation to connect to.
         */
        widget.options = widget.extendDefaults(WeavyWidget.defaults);

        // Extend default options with the passed in arugments
        for (var arg in arguments) {
            if (arguments[arg] && typeof arguments[arg] === "object") {
                widget.options = widget.extendDefaults(widget.options, arguments[arg], true);
            }
        }

        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        function generateId(id) {
            id = "wy-" + (id ? id.replace(/^wy-/, '') : S4() + S4());

            // Make sure id is unique
            if (_widgetIds.indexOf(id) !== -1) {
                id = generateId(id + S4());
            }

            return id;
        }

        widget.options.id = generateId(widget.options.id);
        _widgetIds.push(widget.options.id);

        /**
         * The unique instance color used by console logging.
         * 
         * @category properties
         * @type {string}
         */
        widget.logColor = widget.options.logColor || "#" + (S4() + S4()).substr(-6).replace(/^([8-9a-f].).{2}/, "$100").replace(/^(.{2})[8-9a-f](.).{2}/, "$1a$200").replace(/.{2}([8-9a-f].)$/, "00$1");

        /**
         * The hardcoded semver version of the widget-script.
         * @member {string} WeavyWidget.version 
         */
        if (WeavyWidget.version) {
            widget.options.version = widget.options.version || WeavyWidget.version;
            widget.log(WeavyWidget.version);
        }

        if (!widget.options.url || widget.options.url === "/") {
            widget.error("Required url not specified.\nnew WeavyWidget({ url: \"https://mytestsite.weavycloud.com/\" })");
        }

        /**
         * Indicating if the browser supports using ShadowDOM
         * 
         * @category properties
         * @type {boolean}
         */
        widget.supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

        /**
         * True when frames are blocked by Content Policy or the browser
         * 
         * @category properties
         * @type {boolean}
         */
        widget.isBlocked = false;

        /**
         * True when the widget has loaded options from the server.
         * 
         * @category properties
         * @type {boolean}
         */
        widget.isLoaded = false;

        /**
         * Common prefix for panel naming
         * 
         * @category panels
         * @type {string}
         */
        widget.panelPrefix = "weavy-panel";

        /**
         * Id of any currently open panel, otherwise null.
         * 
         * @category panels
         * @type {string}
         */
        widget.openPanelId = null;

        // DOM Elements

        /**
         * Placeholder for all DOM node references. Put any created elements or DOM related objects here.
         * 
         * @alias WeavyWidget#nodes
         * @typicalname widget.nodes
         */
        widget.nodes = {};

        /**
         * The root node where the Shadow root is attached. Uses WeavyWidget#options.container if specified.
         * 
         * @alias WeavyWidget#nodes#root
         * @type {Element}
         */
        widget.nodes.root = null;


        /**
         * The main container under the root. This is where all widget Elements are placed.
         * 
         * @alias WeavyWidget#nodes#container
         * @type {Element}
         */
        widget.nodes.container = null;

        /**
         * Container for displaying elements that needs to be full viewport and on top of other elements. Uses [options.overlay]{@link WeavyWidget#options} if specified.
         * 
         * @alias WeavyWidget#nodes#overlay
         * @type {Element}
         */
        widget.nodes.overlay = null;

        // EVENT HANDLING
        var _events = [];

        function registerEventHandler(event, handler, context, selector, onceHandler) {
            _events.push(arguments);
        }

        function getEventHandler(event, handler, context, selector) {
            var removeHandler = arguments;
            var eventHandler = _events.filter(function (eventHandler) {
                for (var i = 0; i < removeHandler.length; i++) {
                    if (eventHandler[i] === removeHandler[i]) {
                        return true;
                    }
                }
                return false;
            }).pop();

            return eventHandler && (eventHandler[4] || eventHandler[0]);
        }

        function unregisterEventHandler(event, handler, context, selector) {
            var removeHandler = arguments;
            _events = _events.filter(function (eventHandler) {
                for (var i = 0; i < eventHandler.length; i++) {
                    if (eventHandler[i] !== removeHandler[i]) {
                        return true;
                    }
                }
                return false;
            });
        }

        function clearEventHandlers() {
            _events.forEach(function (eventHandler) {
                var events = eventHandler[0];
                var handler = eventHandler[1];
                var context = eventHandler[2];
                var selector = eventHandler[3];
                var attachedHandler = eventHandler[4];

                if (typeof selector === "string") {
                    context.off(events, selector, attachedHandler || handler);
                } else {
                    context.off(events, attachedHandler || handler);
                }
            });
            _events = [];
        }


        /**
         * List of internal namespaces for events.
         * 
         * @category eventhandling
         * @type {Object.<string, string>}
         * @property {string} global=​ - Empty namespace for global events that should not use any specific namespace: "".
         * @property {string} connection=.connection.weavy - Used by weavy.connection events: ".connection.weavy".
         * @property {string} realtime=.rtmweavy - Used by weavy.realtime events: ".rtmweavy".
         * @property {string} widget=.event.weavy - Default namespace used by all widget events: ".event.weavy".
         */
        widget.eventNamespaces = {
            global: "",
            connection: ".connection.weavy",
            realtime: ".rtmweavy",
            widget: ".event.weavy",
        };

        function getEventArguments(context, events, selector, handler, namespace) {
            var defaultNamespace = widget.eventNamespaces.global

            if (typeof arguments[0] === "string") {
                // Widget event
                namespace = typeof arguments[1] === 'function' ? arguments[2] : arguments[3];
                handler = typeof arguments[1] === 'function' ? arguments[1] : arguments[2];
                selector = typeof arguments[1] === 'function' ? null : arguments[1];
                events = arguments[0];
                context = null;

                defaultNamespace = widget.eventNamespaces.widget;
            } else {
                // Global event

                // Default settings for weavy.connection
                if (arguments[0] === weavy.connection) {
                    defaultNamespace = widget.eventNamespaces.connection;
                    context = $(document);
                }

                // Default settings for weavy.realtime
                if (arguments[0] === weavy.realtime) {
                    defaultNamespace = widget.eventNamespaces.realtime;
                    context = $(document);
                }

                namespace = typeof arguments[2] === 'function' ? arguments[3] : arguments[4];
                handler = typeof arguments[2] === 'function' ? arguments[2] : arguments[3];
                selector = typeof arguments[2] === 'function' ? null : arguments[2];
            }

            namespace = typeof namespace === 'string' ? namespace : defaultNamespace;
            context = context && $(context) || (namespace === widget.eventNamespaces.widget ? $(widget) : $(document));

            // Supports multiple events separated by space
            events = events.split(" ").map(function (eventName) { return eventName + namespace; }).join(" ");

            return { context: context, events: events, selector: selector, handler: handler, namespace: namespace };
        }


        /**
         * Registers one or several event listneres. All event listners are managed and automatically unregistered on destroy.
         * 
         * When listening to widget events, you may also listen to `before:` and `after:` events by simply adding the prefix to ant widget event.
         * Eventhandlers listening to widget events may return modified data that is returned to the trigger. The data is passed on to the next event in the trigger event chain. If an event handler calls event.stopPropagation() or returns false, the event chain will be stopped and the value is returned.
         *
         * @example <caption>Widget event</caption>
         * widget.on("before:options", function(e, options) { ... })
         * widget.on("options", function(e, options) { ... })
         * widget.on("after:options", function(e, options) { ... })
         *  
         * @example <caption>Realtime event</caption>
         * widget.on(weavy.realtime, "eventname", function(e, message) { ... })
         *   
         * @example <caption>Connection event</caption>
         * widget.on(weavy.connection, "disconnect", function(e) { ... })
         *   
         * @example <caption>Button event</caption>
         * widget.on(myButton, "click", function() { ... })
         *   
         * @example <caption>Multiple document listeners with custom namespace</caption>
         * widget.on(document, ".modal", "show hide", function() { ... }, ".bs.modal")
         * 
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. weavy.connection and weavy.realtime may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, followed by any data arguments provided by the trigger.
         * @param {string} [namespace] - Optional namespace applied to all the event names. Namespaces are automatically selected for widget-, realtime- and connection- events. Any {@link WeavyWidget#eventNamespaces} may be used as parameter.
         * @see The underlying jQuery.on: {@link http://api.jquery.com/on/}
         */
        widget.on = function (context, events, selector, handler, namespace) {
            var args = getEventArguments.apply(this, arguments);
            var once = arguments[5];

            if (once) {
                var attachedHandler = function () {
                    args.handler.apply(this, arguments);
                    unregisterEventHandler(args.events, args.handler, args.context, args.selector);
                };

                registerEventHandler(args.events, args.handler, args.context, args.selector, attachedHandler);

                if (typeof args.selector === "string") {
                    args.context.one(args.events, args.selector, attachedHandler);
                } else {
                    args.context.one(args.events, attachedHandler);
                }
            } else {
                registerEventHandler(args.events, args.handler, args.context, args.selector);

                
                if (typeof args.selector === "string") {
                    args.context.on(args.events, args.selector, args.handler);
                } else {
                    args.context.on(args.events, args.handler);
                }
            }
        };

        /**
         * Registers one or several event listneres that are executed once. All event listners are managed and automatically unregistered on destroy.
         * 
         * Similar to {@link WeavyWidget#on}.
         * 
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. weavy.connection and weavy.realtime may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         * @param {string} [namespace] - Optional namespace applied to all the event names. Namespaces are automatically selected for widget-, realtime- and connection- events. Any {@link WeavyWidget#eventNamespaces} may be used as parameter.
         */
        widget.one = function (context, events, selector, handler, namespace) {
            widget.on(context, events, selector, handler, namespace, true);
        };

        /**
         * Unregisters event listneres. The arguments must match the arguments provided on registration using .on() or .one().
         *
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. weavy.connection and weavy.realtime may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         * @param {string} [namespace] - Optional namespace applied to all the event names. Namespaces are automatically selected for widget-, realtime- and connection- events. Any {@link WeavyWidget#eventNamespaces} may be used as parameter.
         */
        widget.off = function (context, events, selector, handler, namespace) {
            var args = getEventArguments.apply(this, arguments);

            var offHandler = getEventHandler(args.events, args.handler, args.context, args.selector);

            unregisterEventHandler(args.events, args.handler, args.context, args.selector);

            if (offHandler) {
                if (typeof args.selector === "string") {
                    args.context.off(args.events, args.selector, offHandler);
                } else {
                    args.context.off(args.events, offHandler);
                }
            }
        }

        /**
         * Trigger a custom event. Events are per default triggered on the widget instance using the widget.eventNamespaces.widget namespace.
         * 
         * The trigger has an event chain that adds before: and after: events automatically for all events. 
         * 
         * Eventhandlers listening to the event may return modified data that is returned by the trigger event. The data is passed on to the next event in the trigger event chain. If an event handler calls event.stopPropagation() or returns false, the event chain will be stopped and the value is returned.
         * 
         * @example
         * 
         * widget.triggerEvent("myevent");
         * 
         * // Will trigger the following events on the widget instance
         * // 1. `before:myevent.event.weavy`
         * // 2. `myevent.event.weavy`
         * // 3. `after:myevent.event.weavy`
         * 
         * @category eventhandling
         * @param {any} name - The name of the event.
         * @param {(Array/Object/JSON)} [data] - Data may be an array or plain object with data or a JSON encoded string. Unlike jQuery, an array of data will be passed as an array and _not_ as multiple arguments.
         * @param {string} [namespace] - The namespace is applied to the name. It defaults to the widget namespace. Any widget.eventNamespaces may also be used as parameter.
         * @param {Element} [context] - Context Element to trigger the event on. If omitted it defaults to the Widget instance.
         * @param {Event} [originalEvent] - When relaying another event, you may pass the original Event to access it in handlers.
         * @returns {data} The data passed to the event trigger including any modifications by event handlers.
         */
        widget.triggerEvent = function (name, data, namespace, context, originalEvent) {
            var hasPrefix = name.indexOf(":") !== -1;
            namespace = typeof namespace === 'string' ? namespace : widget.eventNamespaces.widget;
            context = context || (namespace === widget.eventNamespaces.widget ? $(widget) : $(document));
            name = name + namespace;

            // Triggers additional before:* and after:* events
            var beforeEvent = $.Event("before:" + name);
            var event = $.Event(name);
            var afterEvent = $.Event("after:" + name);

            if (originalEvent) {
                beforeEvent.originalEvent = originalEvent;
                event.originalEvent = originalEvent;
                afterEvent.originalEvent = originalEvent;
            }

            if (data && !$.isArray(data) && !$.isPlainObject(data)) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    widget.warn("Could not parse event data");
                }
            }

            widget.debug("trigger", name);

            // Wrap arrays in an array to avoid arrays converted to multiple arguments by jQuery
            if (hasPrefix) {
                data = context.triggerHandler(event, $.isArray(data) ? [data] : data) || data;
            } else {
                data = context.triggerHandler(beforeEvent, $.isArray(data) ? [data] : data) || data;
                if (data === false || beforeEvent.isPropagationStopped()) { return data; }

                data = context.triggerHandler(event, $.isArray(data) ? [data] : data) || data;
                if (data === false || event.isPropagationStopped()) { return data; }

                data = context.triggerHandler(afterEvent, $.isArray(data) ? [data] : data) || data;
            }

            return data;
        };


        // TIMEOUT HANDLING 

        var _timeouts = [];

        function clearTimeouts() {
            _timeouts.forEach(clearTimeout);
            _timeouts = [];
        }

        
        /**
         * Creates a managed timeout promise. Use this instead of window.setTimeout to get a timeout that is automatically managed and unregistered on destroy.
         * 
         * @example
         * var mytimeout = widget.timeout(200).then(function() { ... });
         * mytimeout.reject(); // Cancel the timeout
         * 
         * @category promises
         * @param {int} time=0 - Timeout in milliseconds
         * @returns {external:Promise}
         */
        widget.timeout = function (time) {
            var timeoutId, timeoutResolve, timeoutReject;
            var timeoutPromise = new Promise(function (resolve, reject) {
                _timeouts.push(timeoutId = setTimeout(function () { resolve(); }, time));
                timeoutResolve = resolve;
                timeoutReject = reject;
            }).catch(function () {
                clearTimeout(timeoutId);
                return Promise.reject();
            });

            /**
             * Create promise shim with .resolve() and .reject() included
             * @lends WeavyWidget#timeout
             */
            var timeout = {
                /**
                 * Register callbacks for when the timout is resolved or rejected (cancelled)
                 * 
                 * @ignore
                 * @param {function} onResolved - Called on timeout
                 * @param {function} onRejected - Called when timeout is cancelled
                 * @returns {external:Promise}
                 */
                then: function (onResolved, onRejected) {
                    timeoutPromise = timeoutPromise.then(onResolved, onRejected || function () { });
                    return timeout;
                },

                /**
                 * Register callbacks for when the timeout is rejected (cancelled).
                 * 
                 * @ignore
                 * @param {function} onRejected - Called when timout is cancelled
                 * @returns {external:Promise}
                 */
                catch: function (onRejected) {
                    timeoutPromise = timeoutPromise.catch(onRejected);
                    return timeout;
                },

                /**
                 * Register a callback that is called on both reject and resolve.
                 * 
                 * @ignore
                 * @param {function} onFinally - Always called
                 * @returns {external:Promise}
                 */
                finally: function (onFinally) {
                    timeoutPromise = timeoutPromise.finally(onFinally);
                    return timeout;
                },

                /**
                 * Additional {@link external:Promise} method for resolving the timeout before it has finished.
                 * @method
                 */
                resolve: timeoutResolve,

                /**
                 * Additional {@link external:Promise} method for cancelling the timout and reject the promise before it has finished.
                 * @method
                 */
                reject: timeoutReject
            };

            return timeout;
        };

        // PROMISES

        /**
         * Promise that the widget has finished transitions for closing.
         * If the widget already is closed, the promise is resolved instantly.
         * 
         * @example
         * widget.awaitClosed.then(function() { ... })
         * 
         * @category promises
         * @type {external:Promise}
         * @resolved when widget is closed
         */
        widget.awaitClosed = Promise.resolve();

        /**
         * Promise that the blocking check has finished. Resolves when {@link WeavyWidget#event:frame-check} is triggered.
         *
         * @example
         * widget.awaitBlocked.then(function() { ... })
         *
         * @category promises
         * @type {external:Promise}
         * @resolved when frames are not blocked.
         * @rejected when frames are blocked
         * */
        widget.awaitBlocked = new Promise(function (resolve, reject) {
            widget.on("frame-check", function (e, framecheck) {
                framecheck.blocked ? reject() : resolve();
            });
        });

        var loadPromise = function () {
            return new Promise(function (resolve) {
                widget.one("await:load", function () {
                    resolve();
                });
            })
        };

        /**
         * Promise that the widget has recieved the after:load event
         *
         * @example
         * widget.awaitLoaded.then(function() { ... })
         *
         * @category promises
         * @type {external:Promise}
         * @resolves when init is called, the websocket has connected, data is received from the server and the widget is built and the load event has finished.
         */
        widget.awaitLoaded = loadPromise();

        /**
         * Initializes the widget. This is done automatically unless you specify `init: false` in {@link WeavyWidget#options}.
         * @emits WeavyWidget#init
         */
        widget.init = function () {
            /**
             * Event that is triggered when the widget instance is initiated. This is done automatically unless you specify `init: false` in {@link WeavyWidget#options}.
             * You may use the `before:init` event together with `event.stopPropagation()` if you want to intercept the initialization.
             * 
             * @category events
             * @event WeavyWidget#init
             * @returns {Promise}
             */
            return widget.triggerEvent("init");
        }

        // INTERNAL FUNCTIONS
        function resetContainer() {
            if (widget.nodes.container) {
                $(widget.nodes.container).remove();
                widget.nodes.container = null;
                widget.isLoaded = false;
            }
        }

        function connect() {
            return weavy.connection.init(widget.options.url, null, true);
        }

        function disconnect(async, notify) {
            widget.log("disconnecting widget");
            if (widget.nodes.container) {
                $(widget.nodes.container).find("iframe").each(function (index, frame) {
                    //weavy.connection.removeWindow(frame.contentWindow);
                });
            }

            // NOTE: stop/disconnect directly if we are not authenticated 
            // signalr does not allow the user identity to change in an active connection
            return weavy.connection.disconnect(async, notify);
        }

        function connectAndLoad(fullReload, notify) {
            if (widget.isLoaded) {
                widget.awaitLoaded = loadPromise();
            }
            if (fullReload === true) {
                widget.isLoaded = false;
            }
            connect.call(widget).then(function () {
                widget.options.href = window.location.href;
                if (notify !== false) {

                    weavy.realtime.invoke("widget", "load", widget.options);
                }
            });

            return widget.awaitLoaded;
        }


        function registerLoading(panelId) {
            var frame = $(widget.getId("#weavy-panel-" + panelId), widget.nodes.container).find("iframe").get(0);
            if (frame && !frame.registered) {
                var onload = function () {
                    widget.sendWindowId(frame.contentWindow, frame.id, panelId);
                    widget.panelLoading.call(widget, panelId, false);
                    delete frame.dataset.src;
                    // add window to connections
                    weavy.connection.addWindow(frame.contentWindow);
                    frame.loaded = true;
                };
                widget.on(frame, "load", onload);
                frame.registered = true;
            }
        }

        function buildOutput() {
            // add container
            if (!widget.nodes.container) {
                widget.nodes.container = document.createElement("div");

                widget.nodes.container.className = "weavy-widget " + widget.options.className + ' ' + (widget.options.container ? 'weavy-custom' : 'weavy-default');
                widget.nodes.container.id = widget.getId("weavy-widget");
                widget.nodes.container.setAttribute("data-version", widget.options.version);

                if (widget.options.overlay) {
                    widget.nodes.overlay = $(widget.options.overlay)[0];
                } else {
                    widget.nodes.overlay = document.createElement("div");
                    widget.nodes.overlay.id = widget.getId("weavy-overlay");
                    widget.nodes.container.appendChild(widget.nodes.overlay);
                }

                widget.nodes.overlay.classList.add("weavy-overlay");

                // frame status checking
                widget.statusFrame = document.createElement("iframe");
                widget.statusFrame.className = "weavy-status-check weavy-hidden-frame";
                widget.statusFrame.style.display = "none";
                widget.statusFrame.id = widget.getId("weavy-status-check");

                /**
                 * Event triggered when frame blocking check has finished. You may also use the {@link WeavyWidget#awaitBlocked} promise to make sure the blocked check has finished.
                 *
                 * @category events
                 * @event WeavyWidget#frame-check
                 * @returns {object}
                 * @property {boolean} blocked - Indicates if frames are blocked.
                 */

                widget.on(widget.statusFrame, "load", function () {
                    // start testing for blocked iframe             
                    widget.isBlocked = true;
                    try {
                        this.contentWindow.postMessage({ "name": "ping" }, "*");
                    } catch (e) {
                        widget.warn("Frame postMessage is blocked", e);
                        widget.triggerEvent("frame-check", { blocked: true });
                    }

                });

                var onFrameReady = function (e) {
                    e = e.originalEvent || e;
                    switch (e.data.name) {
                        case "ready":
                            widget.triggerEvent("frame-check", { blocked: false });
                            widget.off(window, "message", onFrameReady);
                            break;
                    }
                };

                widget.on(window, "message", onFrameReady);

                widget.nodes.container.appendChild(widget.statusFrame);
                widget.timeout(1).then(function () {
                    widget.statusFrame.src = widget.options.statusUrl;
                });

                // append container to target element || html
                if (!widget.nodes.root) {
                    var target = $(widget.options.container)[0] || document.documentElement.appendChild(document.createElement("section"));
                    target.classList.add("weavy-root");

                    if (widget.supportsShadowDOM) {
                        target.classList.add("weavy-shadow");
                        target = target.attachShadow({ mode: "closed" });
                    }
                    widget.nodes.root = target;
                }

                widget.nodes.root.appendChild(widget.nodes.container);

            }

            /**
             * Event triggered when widget is building up the DOM elements.
             * 
             * Use this event to build all your elements and attach them to the widget.
             * At this point you may safely assume that widget.nodes.container is built.
             * 
             * Good practice is to build all elements in the build event and store them as properties on the widget.
             * Then you can attach them to other Elements in the after:build event.
             * This ensures that all Elements are built before they are attached to each other.
             *
             * If you have dependencies to Elements built by plugins you should also check that they actually exist before attaching to them.
             *
             * Often it's a good idea to check if the user is signed-in using {@link WeavyWidget#isAuthenticated} unless you're building something that doesn't require a signed in user.
             *
             * @example
             * widget.on("build", function() {
             *     if (widget.isAuthenticated()) {
             *         widget.myElement = document.createElement("DIV");
             *     }
             * });
             * 
             * widget.on("after:build", function() {
             *     if (widget.isAuthenticated()) {
             *         if (widget.nodes.dock) {
             *             widget.nodes.dock.appendChild(widget.myElement);
             *         }
             *     }
             * })
             *
             * @category events
             * @event WeavyWidget#build
             */

            widget.triggerEvent("build");
        }


        // PUBLIC METHODS

        /**
         * Appends the widget-id to an id. This makes the id unique per widget instance. You may define a specific widget-idfor the instance in the {@link WeavyWidget#options}. If no id is provided it only returns the widget id. The widget id will not be appended more than once.
         * 
         * @param {string} [id] - Any id that should be completed with the widget id.
         * @returns {string} Id completed with widget-id. If no id was provided it returns the widget-id only.
         */
        widget.getId = function (id) {
            return id ? widget.removeId(id) + "-" + widget.options.id : widget.options.id;
        }

        /**
         * Removes the widget id from an id created with {@link WeavyWidget#getId}
         * 
         * @param {string} id - The id from which the widget id will be removed.
         * @returns {string} Id without widget id.
         */
        widget.removeId = function (id) {
            return id ? id.replace(new RegExp("-" + widget.getId() + "$"), '') : id;
        };

        /**
         * Checks if the user is signed in. May chack against any optional provided data.
         * 
         * @category authentication
         * @param {Object} [optionalData] - Data that contains userId to verify against current user `{ userId: id }`, such as {@link WeavyWidget#options}.
         * @returns {boolean} True if the user is signed in
         */
        widget.isAuthenticated = function (optionalData) {
            if (optionalData) {
                return optionalData.userId && optionalData.userId === widget.options.userId ? true : false;
            }
            return widget.options.userId ? true : false;
        }

        /**
         * Sends the id of a frame to the frame content scripts, so that the frame gets aware of which id it has.
         * The frame needs to have a unique name attribute.
         * 
         * @category panels
         * @param {Window} contentWindow - The frame window to send the data to.
         * @param {string} windowName - The frame name attribute.
         * @param {string} [panelId] - If the frame is a panel, the panelId may also be provided.
         */
        widget.sendWindowId = function (contentWindow, windowName, panelId) {
            try {
                contentWindow.postMessage({
                    name: "window-id",
                    panelId: panelId,
                    widgetId: widget.getId(),
                    windowName: windowName,
                    weavyUrl: widget.options.url
                }, "*");
            } catch (e) {
                widget.error("Could not send window id", windowName, e);
            }
        };

        /**
         * Maximizes or restores the size of current panel.
         * 
         * @category panels
         * @emits WeavyWidget#resize
         */
        widget.resize = function () {
            $(widget.nodes.container).toggleClass("weavy-wide");

            /**
             * Triggered when the panel is resized due to a state change.
             * 
             * @category events
             * @event WeavyWidget#resize
             */
            widget.triggerEvent("resize", null);
        }

        /**
         * Maximize the size of current panel. 
         * 
         * @category panels
         * @emits WeavyWidget#maximize
         */
        widget.maximize = function () {
            $(widget.nodes.container).addClass("weavy-wide");

            /**
             * Triggered when the panel is maximized to full broser window size
             * 
             * @category events
             * @event WeavyWidget#maximize
             */
            widget.triggerEvent("maximize", null);
        }

        /**
         * Reload the widget data.
         * 
         * @category options
         * @param {WeavyWidget#options} [options] Any new or additional options.
         * @emits WeavyWidget#reload
         * @returns {Promise}
         */
        widget.reload = function (options) {
            widget.options = widget.extendDefaults(widget.options, options);
            connectAndLoad();

            /**
             * Triggered when the widget is reloaded with any new data. Current options are provided as event data.
             * 
             * @category events
             * @event WeavyWidget#reload
             * @returns {WeavyWidget#options}
             */
            widget.triggerEvent("reload", widget.options);
            return widget.awaitLoaded;
        }

        /**
         * Check if a panel is currently loading.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to check.
         * @returns {boolean} True if the panel curerently is loading
         */
        widget.panelIsLoading = function (panelId) {
            var frame = $(widget.getId("#weavy-panel-" + panelId), widget.nodes.container).find("iframe").get(0);
            return frame.getAttribute("src") && !frame.loaded ? true : false;
        };

        /**
         * Check if a panel has finished loading.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to check.
         * @returns {boolean} True if the panel has finished loading.
         */
        widget.panelIsLoaded = function (panelId) {
            var frame = $(widget.getId("#weavy-panel-" + panelId), widget.nodes.container).find("iframe").get(0);
            return frame.loaded ? true : false;
        };

        /**
         * Tells a panel that it need to reload it's content.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to refresh.
         * @emits WeavyWidget#refresh
         */
        widget.refresh = function (panelId) {

            widget.panelLoading.call(widget, panelId, true);

            var $target = $(widget.getId("#weavy-panel-" + panelId), widget.nodes.container);
            var frame = $target.find("iframe");

            frame[0].contentWindow.postMessage({ "name": "reload" }, "*");

            /**
             * Event triggered when a panel is resfreshed and needs to reload it's content.
             * 
             * @category events
             * @event WeavyWidget#refresh
             * @returns {Object}
             * @property {string} panelId - The id of the panel being refreshed.
             */
            widget.triggerEvent("refresh", { panelId: panelId });
        }

        /** 
         * Resets a panel to its original url. This can be used if the panel has ended up in an incorrect state.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to reset.
         */
        widget.reset = function (panelId) {
            widget.panelLoading.call(widget, panelId, true);
            var $target = $(widget.getId("#weavy-panel-" + panelId), widget.nodes.container);
            var frame = $target.find("iframe");
            frame[0].src = frame[0].dataset.src || frame[0].src || "about:blank";
        }

        /**
         * Open a specific panel. The open waits for the [block check]{@link WeavyWidget#awaitBlocked} to complete, then opens the panel.
         * Adds the `weavy-open` class to the {@link WeavyWidget#nodes#container}.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to open.
         * @param {string} [destination] - Tells the panel to navigate to a specified url.
         * @emits WeavyWidget#open
         */
        widget.open = function (panelId, destination) {
            widget.awaitBlocked.then(function () {
                $(widget.nodes.container).addClass("weavy-open");
                widget.openPanelId = panelId;

                /**
                 * Event triggered when a panel is opened.
                 * 
                 * @category events
                 * @event WeavyWidget#open
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel being openened.
                 * @property {string} [destination] - Any url being requested to open in the panel.
                 */
                widget.triggerEvent("open", { panelId: panelId, destination: destination });
            });
        }

        /**
         * Closes all panels and removes the `weavy-open` class from the {@link WeavyWidget#nodes#container}. Sets the {@link WeavyWidget#awaitClosed} Promise if not already closing.
         * 
         * @category panels
         * @returns {external:Promise} {@link WeavyWidget#awaitClosed}
         * @emits WeavyWidget#close
         */
        widget.close = function () {
            if ($(widget.nodes.container).hasClass("weavy-open")) {
                $(widget.nodes.container).removeClass("weavy-open");

                /**
                 * Event triggered when the widget closes all panels. Wait for the {@link WeavyWidget#awaitClosed} Promise to do additional things when the widget has finished closing.
                 * 
                 * @category events
                 * @event WeavyWidget#close
                 */
                widget.triggerEvent("close");

                // Return timeout promise
                return widget.awaitClosed = widget.timeout(250);
            } else {
                return widget.awaitClosed || Promise.resolve();
            }
        }

        /**
         * [Open]{@link WeavyWidget#open} or [close]{@link WeavyWidget#close} a specific panel.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel toggled.
         * @param {string} [destination] - Tells the panel to navigate to a specified url when opened.
         * @emits WeavyWidget#toggle
         */
        widget.toggle = function (panelId, destination) {
            if (!widget.isBlocked) {
                var closed = false;
                if ($(widget.nodes.container).hasClass("weavy-open") && widget.openPanelId === panelId) {
                    widget.log("toggle: widget closed");
                    widget.close();
                    closed = true;
                } else {
                    widget.log("toggle open:", panelId);
                    widget.open(panelId, typeof (destination) === "string" ? destination : null);
                }

                /**
                 * Event triggered when a panel is toggled open or closed.
                 * 
                 * @category events
                 * @event WeavyWidget#toggle
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel toggled.
                 * @property {boolean} closed - True if the panel is closed.
                 */
                widget.triggerEvent("toggle", { panelId: panelId, closed: closed });
            }
        }

        /**
         * Set the loading indicator on the specified panel. The loading indicatior is automatically removed on loading. It also makes sure the panel is registered and [sends frame id]{@link WeavyWidget#sendWindowId} when loaded.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel that is loading.
         * @param {boolean} isLoading - Sets whether the panel is loading or not.
         * @param {boolean} [fill] - Sets an opaque background that hides any panel content during loading.
         * @emits WeavyWidget#panel-loading
         */
        widget.panelLoading = function (panelId, isLoading, fill) {
            if (isLoading) {
                registerLoading(panelId);
                loadingTimeout[panelId] = widget.timeout(15000).then(widget.panelLoading.bind(widget, panelId, false));
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
             * @event WeavyWidget#panel-loading
             * @returns {Object}
             * @property {string} panelId - The id of the panel loading.
             * @property {boolean} isLoading - Indicating wheter the panel is loading or not.
             * @property {boolean} fill - True if the panel has an opaque background during loading.
             */
            widget.triggerEvent("panel-loading", { panelId: panelId, isLoading: isLoading, fill: fill });
        }

        /**
         * Load an url with data directly in a specific panel. Uses turbolinks forms if the panel is loaded and a form post to the frame if the panel isn't loaded.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to load in.
         * @param {string} url - The url to load in the panel.
         * @param {any} [data] -  URL/form-encoded data to send
         * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         */
        widget.loadInTarget = function (panelId, url, data, method) {
            var frameTarget = $(widget.nodes.container).find(widget.getId("#" + widget.panelPrefix + "-" + panelId) + " ." + widget.panelPrefix + "-frame").get(0);
            if (frameTarget) {
                if (frameTarget.dataset && frameTarget.dataset.src || !frameTarget.getAttribute("src")) {
                    // Not yet fully loaded
                    widget.sendToFrame(widget.getId(frameTarget.name), widget.httpsUrl(url), data, method);
                } else {
                    // Fully loaded, send using turbolinks
                    frameTarget.contentWindow.postMessage({ name: 'send', url: widget.httpsUrl(url), data: data, method: method }, "*");
                }
            }
        }

        /**
         * Loads an url in a frame or sends data into a specific frame. Will replace anything in the frame.
         * 
         * @category panels
         * @param {string} frameName - The name attribute identifier of the frame
         * @param {any} url - URL to load.
         * @param {any} [data] - URL/form encoded data.
         * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         */
        widget.sendToFrame = function (frameName, url, data, method) {
            method = String(method || "get").toLowerCase();

            // Ensure target exists
            var frame = $("iframe[name='" + frameName + "']", widget.nodes.container).get(0);

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

                if (!frame.src) {
                    // If no url is set yet, set a url
                    frame.src = frameUrl;
                    if (method === "get") {
                        // No need to send a form since data is appended to the url
                        return;
                    }
                }

                // Create a form to send to the frame
                var $form = $("<form>", {
                    action: url,
                    method: method,
                    target: frameName
                });

                if (data) {
                    data = data.replace(/\+/g, '%20');
                }
                var dataArray = data.split("&");

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
                $form.appendTo(widget.nodes.container).submit().remove();
            }
        }

        /**
         * Destroys the inctance of WeavyWidget. You should also remove any references to the widget after you have destroyed it. The [destroy event]{@link WeavyWidget#event:destroy} will be triggered before anything else is removed so that plugins etc may unregister and clean up, before the instance is gone.
         * @param {boolean} [keepConnection=false] - Set to true if you want the realtime-connection to remain connected.
         * @emits WeavyWidget#destroy
         */
        widget.destroy = function (keepConnection) {
            /**
             * Event triggered when the WeavyWidget instance is about to be destroyed. Use this event for clean up. 
             * - Any events registered using {@link WeavyWidget#on} and {@link WeavyWidget#one} will be unregistered automatically. 
             * - Timers using {@link WeavyWidget#timeout} will be cleared automatically.
             * - All elements under the {@link WeavyWidget#nodes#root} will be removed.
             * 
             * @category events
             * @event WeavyWidget#destroy
             */
            widget.triggerEvent("destroy", null);

            resetContainer();

            clearEventHandlers();
            clearTimeouts();

            _widgetIds.splice(_widgetIds.indexOf(widget.getId()), 1);

            if (!keepConnection && _widgetIds.length === 0) {
                disconnect();
            }

            $(widget.nodes.root).remove();
            widget.nodes.root = null;
        }

        // WIDGET EVENTS

        // Register init before any plugins do
        widget.on("init", function () {
            return connectAndLoad(true);
        });


        // MESSAGE EVENTS

        // listen for dispatched messages from weavy (close/resize etc.)
        widget.on(window, "message", function (e, message) {
            e = e.originalEvent || e;
            message = message || e.data;

            switch (message.name) {
                case "signing-in":
                    /**
                     * Event triggered when signing in process has begun. The user is still not authenticated. The authentication may result in {@link WeavyWidget#event:signed-in} or {@link WeavyWidget#event:authentication-error}.
                     * This event may be triggered from anywhere, not only the WeavyWidget instance.
                     * 
                     * @category events
                     * @event WeavyWidget#signing-in
                     * @returns {Object}
                     * @property {boolean} isLocal - Is the origin ov the event from this widget instance
                     */
                    widget.timeout(0).then(widget.triggerEvent.bind(widget, "signing-in", { isLocal: typeof e.source !== "undefined" && (!message.sourceWidgetId || message.sourceWidgetId === widget.getId()) }));
                    break;
                case "signing-out":
                    widget.close();
                    /**
                     * Event triggered when signing out process has begun. Use this event to do signing out animations and eventually clean up your elements. It will be followed by {@link WeavyWidget#event:signed-out}
                     * This event may be triggered from anywhere, not only the WeavyWidget instance.
                     * 
                     * @category events
                     * @event WeavyWidget#signing-out
                     * @returns {Object}
                     * @property {boolean} isLocal - Is the origin ov the event from this widget instance
                     */
                    widget.timeout(0).then(widget.triggerEvent.bind(widget, "signing-out", { isLocal: typeof e.source !== "undefined" && (!message.sourceWidgetId || message.sourceWidgetId === widget.getId()) }));
                    break;
                case "signed-out":
                    widget.options.userId = null;
                    break;
                case "authentication-error":
                    /**
                     * Event triggered when a sign-in attempt was unsuccessful.
                     * This event may be triggered from anywhere, not only the WeavyWidget instance.
                     * 
                     * @category events
                     * @event WeavyWidget#authentication-error
                     */
                    widget.timeout(0).then(widget.triggerEvent.bind(widget, "authentication-error"));
                    break;
            }

            if (typeof e.source !== "undefined" && (!message.sourceWidgetId || message.sourceWidgetId === widget.getId())) {
                /**
                 * Event for window messages directed to the current widget instance, such as messages sent from panels belonging to the widget instance.
                 * The original message event is attached as event.originalEvent.
                 * 
                 * Use data.name to determine which type of message theat was receivied.
                 * 
                 * @category events
                 * @event WeavyWidget#message
                 * @returns {Object.<string, data>}
                 * @property {string} name - The name of the message
                 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
                 */
                widget.triggerEvent("message", message, null, null, e);
            }
        });

        widget.on("message", function (e, message) {
            widget.debug("window message:", message.name);

            switch (message.name) {
                case "invoke":
                    if (weavy.connection.connection.state === weavy.connection.state.connected) {
                        var proxy = weavy.connection.proxies[message.hub];
                        proxy.invoke.apply(proxy, message.args).fail(function (error) {
                            widget.error(error)
                        });
                    }
                    break;
                case "ready":
                    widget.isBlocked = false;
                    // page loaded
                    if (message.sourcePanelId) {
                        widget.panelLoading.call(widget, message.sourcePanelId, false);
                    }

                    /**
                     * Event triggered when a panel sends a ready message. Check the sourcePanelId or sourceWindowName to see which panel that sent the ready message.
                     * 
                     * @category events
                     * @event WeavyWidget#ready
                     * @returns {Object}
                     * @property {string} sourceWindowName - The name of the frame (or window) for the panel.
                     * @property {string} sourcePanelId - The panelId of the panel
                     */
                    widget.triggerEvent("ready", message);
                    break;
                case "reload":
                    // reload and re-init all widgets
                    connectAndLoad(true);
                    break;
                case "reset":
                    var active = $(".weavy-panel.weavy-open", widget.nodes.container);
                    if (active.length) {
                        widget.reset(active.attr("data-id"));
                    }
                    break;
                case "close":
                    widget.close();
                    break;
                case "maximize":
                    widget.maximize();
                    break;
                case "send":
                    widget.loadInTarget(message.bubbleTarget, message.url, message.data, message.method);
                    widget.open(message.bubbleTarget);
                    break;
            }

        });

        // REALTIME EVENTS

        // signalR connection state has changed
        widget.on(weavy.connection, "state-changed", function (e, data) {
            if (disconnected && data.state.newState === weavy.connection.state.connected && widget.isAuthenticated()) {
                disconnected = false;

                // reload widget                
                weavy.connection.reload();
            }
        });

        // signalR connection disconnected
        widget.on(weavy.connection, "disconnected", function (e, data) {
            if (!data.explicitlyDisconnected) {
                disconnected = true;
            }
        });

        widget.on(weavy.connection, "user-change", function (e, data) {
            widget.log("user-change", data.eventName);

            /**
             * Event triggered when the user is successfully signed in using any authentication method. The realtime connection gets automatically reconnected before this event occurs.
             * This event is triggered when the server has recieved a sucessful sign-in using any method.
             * 
             * @category events
             * @event WeavyWidget#signed-in
             */

            /**
             * Event triggered when the user has been signed out. The realtime connection gets automatically reset when this event occurs.
             * This event is triggered when the user is signed out from the server for any reason.
             * 
             * @category events
             * @event WeavyWidget#signed-out
             */

            if (data.eventName === "signed-out") {
                widget.options.userId = null;
            }
            // Connnect then trigger signed-in or signed-out
            connectAndLoad(true, true).then(widget.triggerEvent.bind(widget, data.eventName));
        });

        widget.on(weavy.realtime, "loaded.weavy", function (e, data) {
            if (data.id && data.id === widget.getId()) {

                // Merge options
                widget.options = widget.extendDefaults(widget.options, data, true);

                /**
                 * Event triggered when options are processed and recieved from the server. Use this event to react to option changes from the server. 
                 * You may modify the data using the `before:options` event. This event is mostly followed by {@link WeavyWidget#event:build}.
                 * If you want to prevent the build event from triggering, you may set `widget.isLoaded = true`.
                 * 
                 * @category events
                 * @event WeavyWidget#options
                 * @returns {WeavyWidget#options}
                 */
                var processedOptions = widget.triggerEvent("options", data);

                // Merge options
                if (processedOptions) {
                    widget.options = widget.extendDefaults(widget.options, processedOptions, true);
                }

                if (widget.isLoaded === false) {
                    buildOutput.call(widget);
                    widget.isLoaded = true;

                    /**
                     * Event triggered when the widget has initialized, connected to the server and recieved and processed options, and built all components.
                     * Use this event to do stuff when everything is loaded.
                     * 
                     * Often it's a good idea to check if the user is signed-in using {@link WeavyWidget#isAuthenticated} unless you're building something that doesn't require a signed in user.
                     * 
                     * @example
                     * widget.on("load", function() {
                     *     if (widget.isAuthenticated()) {
                     *         widget.alert("Widget successfully loaded");
                     *     }
                     * });
                     * 
                     * @category events
                     * @event WeavyWidget#load
                     */
                    widget.triggerEvent("load");
                }
                widget.triggerEvent("await:load");
            }

        });


        // RUN PLUGINS

        /**
         * All enabled plugins are available in the plugin list. Anything exposed by the plugin is accessible here. 
         * You may use this to check if a plugin is enabled and active.
         * 
         * Set plugin options and enable/disable plugins using {@link WeavyWidget#options}.
         * 
         * @example
         * if (widget.plugins.alert) {
         *   widget.plugins.alert.alert("Alert plugin is enabled");
         * }
         * 
         * @category plugins
         * @type {Object.<string, WeavyWidgetPlugin>}
         */
        widget.plugins = {};

        var _unsortedDependencies = {};
        var _sortedDependencies = [];
        var _checkedDependencies = [];

        function sortByDependencies(pluginName) {
            if (!pluginName) {
                for (plugin in _unsortedDependencies) {
                    sortByDependencies(plugin);
                }
            } else {
                if (_unsortedDependencies.hasOwnProperty(pluginName)) {
                    var plugin = _unsortedDependencies[pluginName];
                    if (plugin.dependencies.length) {
                        plugin.dependencies.forEach(function (dep) {
                            // Check if plugin is enabled
                            if (typeof WeavyWidget.plugins[dep] !== "function") {
                                widget.error("plugin dependency needed by " + pluginName + " is not loaded/registered:", dep);
                            } else if (!(widget.options.includePlugins && widget.options.plugins[dep] !== false || !widget.options.includePlugins && widget.options.plugins[dep])) {
                                widget.error("plugin dependency needed by " + pluginName + " is disabled:", dep);
                            }

                            if (_checkedDependencies.indexOf(dep) === -1) {
                                _checkedDependencies.push(dep);
                                sortByDependencies(dep);
                            } else {
                                widget.error("You have circular WeavyWidget plugin dependencies:", pluginName, dep);
                            }
                        });
                    }

                    if (_unsortedDependencies.hasOwnProperty(pluginName)) {
                        _sortedDependencies.push(_unsortedDependencies[pluginName]);
                        delete _unsortedDependencies[pluginName];
                        _checkedDependencies = [];
                        return true;
                    }
                }
            }

            return false;
        }

        // Disable all plugins by setting plugin option to false
        if (widget.options.plugins !== false) {
            widget.options.plugins = widget.options.plugins || {};


            for (plugin in WeavyWidget.plugins) {
                if (typeof WeavyWidget.plugins[plugin] === "function") {

                    // Disable individual plugins by setting plugin options to false
                    if (widget.options.includePlugins && widget.options.plugins[plugin] !== false || !widget.options.includePlugins && widget.options.plugins[plugin]) {
                        _unsortedDependencies[plugin] = { name: plugin, dependencies: $.isArray(WeavyWidget.plugins[plugin].dependencies) ? WeavyWidget.plugins[plugin].dependencies : [] };
                    }
                }
            }

            // Sort by dependencies
            sortByDependencies();

            for (var sortedPlugin in _sortedDependencies) {
                var plugin = _sortedDependencies[sortedPlugin].name;

                widget.debug("Running WeavyWidget plugin:", plugin);

                // Extend plugin options
                widget.options.plugins[plugin] = widget.extendDefaults(WeavyWidget.plugins[plugin].defaults, $.isPlainObject(widget.options.plugins[plugin]) ? widget.options.plugins[plugin] : {}, true);

                // Run the plugin
                widget.plugins[plugin] = WeavyWidget.plugins[plugin].call(widget, widget.options.plugins[plugin]) || true;
            }

        }

        // INIT
        if (widget.options.init === true) {
            widget.init();
        }
    }

    // PROTOTYPE EXTENDING

    /**
     * Default options. These options are general for all WeavyWidget instances and may be overridden in {@link WeavyWidget#options}. You may add any general options you like here.
     * 
     * @example
     * // Defaults
     * WeavyWidget.defaults = {
     *     container: null,
     *     className: "",
     *     https: "adaptive",
     *     init: true,
     *     isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
     *     includePlugins: true,
     *     overlay: null,
     *     url: "/"
     * };
     * 
     * // Set a general url to connect all widget instances to
     * WeavyWidget.defaults.url = "https://myweavysite.com";
     * var widget = new WeavyWidget();
     *
     * @category options
     * @type {Object}
     * @property {Element} [container] - Container where the widget should be placed. If no Element is provided, a &lt;section&gt; is created next to the &lt;body&gt;-element.
     * @property {string} [className] - Additional classNames added to the widget.
     * @property {string} [https=adaptive] - How to enforce https-links. <br>• **force** -  makes all urls https.<br>• **adaptive** -  enforces https if the calling site uses https.<br>• **default** - makes no change.
     * @property {boolean} [init=true] - Should the widget initialize automatically.
     * @property {boolean} [isMobile] - Indicates if the browser is mobile. Defaults to the RegExp expression <code>/iPhone&#124;iPad&#124;iPod&#124;Android/i.test(navigator.userAgent)</code>
     * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
     * @property {Element} [overlay] - Element to use for overlay purposes. May for instance use the overlay of another WeavyWidget instance.
     * @property {string} url - The URL to the Weavy-installation to connect to.
     */
    WeavyWidget.defaults = {
        container: null,
        className: "",
        https: "adaptive", // force, adaptive or default 
        init: true,
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), // Review?
        includePlugins: true,
        overlay: null,
        url: "/"
    };


    /**
     * Option preset configurations. Use these for simple configurations of common options. You may add your own presets also. 
     * The presets may be merged with custom options when you create a new WeavyWidget, since the contructor accepts multiple option sets. 
     * 
     * @example
     * // Load the minimal widget core without any panels.
     * var widget = new WeavyWidget(WeavyWidget.presets.core, { url: "https://myweavysite.com" });
     * 
     * @category options
     * @type {Object}
     * @property {WeavyWidget#options} WeavyWidget.presets.core - Disable all plugins.
     * @property {WeavyWidget#options} WeavyWidget.presets.panel - Minimal plugin set to only have one or more panels instead of the full widget dock.
     */
    WeavyWidget.presets = {
        core: {
            includePlugins: false
        },
        panel: {
            className: "weavy-default",
            plugins: {
                alert: false,
                dock: false,
                fallback: false,
                messenger: false,
                notifications: false,
                panels: {
                    controls: false
                },
                personal: false,
                position: false,
                start: false,
                upgrade: false
            }
        }
    };

    /**
     * Placeholder for registering plugins. Plugins must be registered and available here to be accessible and initialized in the Widget. Register any plugins after you have loaded widget.js and before you create a new WeavyWidget instance.
     * @type {Object.<string, WeavyWidgetPlugin>}
     * @see {@link ../plugins|plugins}
     */
    WeavyWidget.plugins = {};

    // Logging functions
    var isIE = /; MSIE|Trident\//.test(navigator.userAgent);

    function colorLog(logMethod, id, color, logArguments) {
        // Binding needed for console.log.apply to work in IE
        var log = Function.prototype.bind.call(logMethod, console);

        if (isIE) {
            if (id) {
                log.apply(this, ["WeavyWidget " + id].concat($.makeArray(logArguments)));
            } else {
                log.apply(this, $.makeArray(logArguments));
            }
        } else {
            if (id) {
                log.apply(this, ["%cWeavyWidget %s", "color: " + color, id].concat($.makeArray(logArguments)));
            } else {
                log.apply(this, ["%cWeavyWidget", "color: gray"].concat($.makeArray(logArguments)));
            }
        }
    }

    // PROTOTYPE METHODS

    /**
     * Wrapper for `console.debug()` that adds the [instance id]{@link WeavyWidget#getId} of the widget as prefix using the {@link WeavyWidget#logColor}. 
     * @category logging
     * @name WeavyWidget.debug
     * @type {console.debug}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/debug}
     */
    WeavyWidget.prototype.debug = function () {
        colorLog(console.debug, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.error()` that adds the [instance id]{@link WeavyWidget#getId} of the widget as prefix using the {@link WeavyWidget#logColor}. 
     * @category logging
     * @name WeavyWidget.error
     * @type {console.error}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/error}
     */
    WeavyWidget.prototype.error = function () {
        colorLog(console.error, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.info()` that adds the [instance id]{@link WeavyWidget#getId} of the widget as prefix using the {@link WeavyWidget#logColor}. 
     * @category logging
     * @name WeavyWidget.info
     * @type {console.info}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/info}
     */
    WeavyWidget.prototype.info = function () {
        colorLog(console.info, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.log()` that adds the [instance id]{@link WeavyWidget#getId} of the widget as prefix using the {@link WeavyWidget#logColor}. 
     * @category logging
     * @name WeavyWidget.log
     * @type {console.log}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/log}
     */
    WeavyWidget.prototype.log = function () {
        colorLog(console.log, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.warn()` that adds the [instance id]{@link WeavyWidget#getId} of the widget as prefix using the {@link WeavyWidget#logColor}. 
     * @category logging
     * @name WeavyWidget.warn
     * @type {console.warn}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/warn}
     */
    WeavyWidget.prototype.warn = function () {
        colorLog(console.warn, this.options.id, this.logColor, arguments);
    };

    /**
     * Stores data for the current domain in the weavy namespace.
     * 
     * @category options
     * @name WeavyWidget.storeItem
     * @param {string} key - The name of the data
     * @param {data} value - Data to store
     * @param {boolean} [asJson=false] - True if the data in value should be stored as JSON
     */
    WeavyWidget.prototype.storeItem = function (key, value, asJson) {
        localStorage.setItem('weavy_' + window.location.hostname + "_" + key, asJson ? JSON.stringify(value) : value);
    };

    /**
     * Retrieves data for the current domain from the weavy namespace.
     * 
     * @category options
     * @name WeavyWidget.retrieveItem
     * @param {string} key - The name of the data to retrevie
     * @param {boolean} [isJson=false] - True if the data shoul be decoded from JSON
     */
    WeavyWidget.prototype.retrieveItem = function (key, isJson) {
        var value = localStorage.getItem('weavy_' + window.location.hostname + "_" + key);
        if (value && isJson) {
            return JSON.parse(value)
        }

        return value;
    };

    /**
     * Method for extending options. It merges together options. If the recursive setting is applied it will merge any plain object children. Note that Arrays are treated as data and not as tree structure when merging. 
     * 
     * The original options passed are left untouched. {@link WeavyWidget.httpsUrl} settings is applied to all url options.
     * 
     * @category options
     * @name WeavyWidget.extendDefaults
     * @param {Object} source - Original options.
     * @param {Object} properties - Merged options that will replace options from the source.
     * @param {boolean} [recursive=false] True will merge any sub-objects of the options recursively. Otherwise sub-objects are treated as data.
     * @returns {Object} A new object containing the merged options.
     */
    WeavyWidget.prototype.extendDefaults = function (source, properties, recursive) {
        source = source || {};
        properties = properties || {};

        var property;
        var https = properties.https || source.https || this.options.https || WeavyWidget.defaults.https || "default";

        // Make a copy
        var copy = {};
        for (property in source) {
            if (source.hasOwnProperty(property)) {
                copy[property] = source[property];
            }
        }

        // Apply properties to copy
        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                if (recursive && copy[property] && $.isPlainObject(copy[property]) && $.isPlainObject(properties[property])) {
                    copy[property] = this.extendDefaults(copy[property], properties[property], recursive);
                } else {
                    copy[property] = this.httpsUrl(properties[property], https);
                }
            }
        }
        return copy;
    };


    /**
     * Applies https enforcement to an url.
     * 
     * @category options
     * @name WeavyWidget.httpsUrl
     * @param {string} url - The url to process
     * @param {string} [https] How to treat http enforcement for the url. Default to settings from {@link WeavyWidget#options}. <br> • **force** - makes all urls https.<br> • **adaptive** - enforces https if the calling site uses https.<br> • **default** - makes no change.
     * @returns {string} url
     */
    WeavyWidget.prototype.httpsUrl = function (url, https) {
        https = https || this.options.https || WeavyWidget.defaults.https || "default";
        if (typeof url === "string") {
            if (https === "force") {
                return url.replace(/^http:/, "https:");
            } else if (https === "adaptive") {
                return url.replace(/^http:/, window.location.protocol);
            }
        }
        return url;
    };


    // SHIM
    // Deprecated name, remove this in next version
    this.Weavy = function () {
        console.warn("Using new Weavy() is deprecated. Use new WeavyWidget() instead.");

        for (var p in this.Weavy) {
            if (p && this.Weavy.hasOwnProperty(p)) {
                WeavyWidget[p] = this.Weavy[p];
            }
        }

        return WeavyWidget.apply(this, arguments);
    };

    this.Weavy.prototype = Object.create(WeavyWidget.prototype);

    for (var p in WeavyWidget) {
        if (p && WeavyWidget.hasOwnProperty(p)) {
            this.Weavy[p] = WeavyWidget[p];
        }
    }

})(jQuery);

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

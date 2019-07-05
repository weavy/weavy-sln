(function ($) {
    console.debug("weavy.js");

    var _weavyIds = [];

    /**
     * All options are optional. You may use multiple Weavy.presets together with options when constructing a weavy instance. Multiple option sets are merged together.
     * 
     * If you want to connect to a specific server use the [url option]{@link Weavy#options}.
     * 
     * These option presets are available for easy configuration
     * * Weavy.presets.core - All plugins disabled and minimal styles applied
     * * Weavy.presets.panel - A minimal recommended configuration for making only a panel.
     * 
     * @example
     * var weavy = new Weavy();
     * var coreDevWeavy = new Weavy(Weavy.presets.core, { url: "http://myweavysite.dev" });
     * 
     * @class Weavy
     * @classdesc The core class for Weavy.
     * @param {...Weavy#options} options - One or multiple option sets. Options will be merged together in order.
     * @typicalname weavy
     */

    this.Weavy = function () {
        /** 
         *  Reference to this instance
         *  @lends Weavy#
         */
        var weavy = this;

        var disconnected = false;
        var loadingTimeout = [];

        /**
         * Main options for Weavy. 
         * When weavy initializes, it connects to the server and processes the options and sends them back to weavy again. The options may then contain additional data. 
         * Weavy triggers a {@link Weavy#event:options} event when options are recieved from the server.
         * 
         * @category options
         * @typedef 
         * @type {Object}
         * @member
         * @property {Element} [container] - Container where weavy should be placed. If no Element is provided, a &lt;section&gt; is created next to the &lt;body&gt;-element.
         * @property {string} [className] - Additional classNames added to weavy.
         * @property {string} [https=adaptive] - How to enforce https-links. <br> • **force** -  makes all urls https.<br> • **adaptive** - enforces https if the calling site uses https.<br> • **default** - makes no change.
         * @property {string} [id] - An id for the instance. A unique id is always generated.
         * @property {boolean} [init=true] - Should weavy initialize automatically.
         * @property {boolean} [isMobile] - Indicates if the browser is mobile. Defaults to the RegExp expression <code>/iPhone&#124;iPad&#124;iPod&#124;Android/i.test(navigator.userAgent)</code>
         * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
         * @property {string} [logColor] - Hex color (#bada55) used for logging. A random color is generated as default.
         * @property {Element} [overlay] - Element to use for overlay purposes. May for instance use the overlay of another Weavy instance.
         * @property {Object<string, Object>} [plugins] - Properties with the name of the plugins to configure. Each plugin may be enabled or disabled by setting the options to true or false. Providing an Object instead of true will enable the plugin and pass options to the plugin. See the reference for each plugin for available options.
         * @property {string} [url] - The URL of the Weavy-installation to connect to. Defaults to the installation where the script came from.
         */
        weavy.options = weavy.extendDefaults(Weavy.defaults);

        // Extend default options with the passed in arugments
        for (var arg in arguments) {
            if (arguments[arg] && typeof arguments[arg] === "object") {
                weavy.options = weavy.extendDefaults(weavy.options, arguments[arg], true);
            }
        }

        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        function generateId(id) {
            id = "wy-" + (id ? id.replace(/^wy-/, '') : S4() + S4());

            // Make sure id is unique
            if (_weavyIds.indexOf(id) !== -1) {
                id = generateId(id + S4());
            }

            return id;
        }

        weavy.options.id = generateId(weavy.options.id);
        _weavyIds.push(weavy.options.id);

        /**
         * The unique instance color used by console logging.
         * 
         * @category properties
         * @type {string}
         */
        weavy.logColor = weavy.options.logColor || "#" + (S4() + S4()).substr(-6).replace(/^([8-9a-f].).{2}/, "$100").replace(/^(.{2})[8-9a-f](.).{2}/, "$1a$200").replace(/.{2}([8-9a-f].)$/, "00$1");

        /**
         * The hardcoded semver version of the weavy-script.
         * @member {string} Weavy.version 
         */
        if (Weavy.version) {
            weavy.options.version = weavy.options.version || Weavy.version;
            weavy.log(Weavy.version);
        }

        if (!weavy.options.url || weavy.options.url === "/") {
            weavy.error("Required url not specified.\nnew Weavy({ url: \"https://mytestsite.weavycloud.com/\" })");
        }

        /**
         * Indicating if the browser supports using ShadowDOM
         * 
         * @category properties
         * @type {boolean}
         */
        weavy.supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

        /**
         * True when frames are blocked by Content Policy or the browser
         * 
         * @category properties
         * @type {boolean}
         */
        weavy.isBlocked = false;

        /**
         * True when weavy has loaded options from the server.
         * 
         * @category properties
         * @type {boolean}
         */
        weavy.isLoaded = false;

        /**
         * Common prefix for panel naming
         * 
         * @category panels
         * @type {string}
         */
        weavy.panelPrefix = "weavy-panel";

        /**
         * Id of any currently open panel, otherwise null.
         * 
         * @category panels
         * @type {string}
         */
        weavy.openPanelId = null;

        // DOM Elements

        /**
         * Placeholder for all DOM node references. Put any created elements or DOM related objects here.
         * 
         * @alias Weavy#nodes
         * @typicalname weavy.nodes
         */
        weavy.nodes = {};

        /**
         * The root node where the Shadow root is attached. Uses Weavy#options.container if specified.
         * 
         * @alias Weavy#nodes#root
         * @type {Element}
         */
        weavy.nodes.root = null;


        /**
         * The main container under the root. This is where all weavy Elements are placed.
         * 
         * @alias Weavy#nodes#container
         * @type {Element}
         */
        weavy.nodes.container = null;

        /**
         * Container for displaying elements that needs to be full viewport and on top of other elements. Uses [options.overlay]{@link Weavy#options} if specified.
         * 
         * @alias Weavy#nodes#overlay
         * @type {Element}
         */
        weavy.nodes.overlay = null;

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
         * @property {string} connection=.connection.weavy - Used by wvy.connection events: ".connection.weavy".
         * @property {string} realtime=.rtmweavy - Used by wvy.realtime events: ".rtmweavy".
         * @property {string} weavy=.event.weavy - Default namespace used by all weavy events: ".event.weavy".
         */
        weavy.eventNamespaces = {
            global: "",
            connection: ".connection.weavy",
            realtime: ".rtmweavy",
            weavy: ".event.weavy",
        };

        function getEventArguments(context, events, selector, handler, namespace) {
            var defaultNamespace = weavy.eventNamespaces.global

            if (typeof arguments[0] === "string") {
                // Widget event
                namespace = typeof arguments[1] === 'function' ? arguments[2] : arguments[3];
                handler = typeof arguments[1] === 'function' ? arguments[1] : arguments[2];
                selector = typeof arguments[1] === 'function' ? null : arguments[1];
                events = arguments[0];
                context = null;

                defaultNamespace = weavy.eventNamespaces.weavy;
            } else {
                // Global event

                // Default settings for wvy.connection
                if (arguments[0] === wvy.connection) {
                    defaultNamespace = weavy.eventNamespaces.connection;
                    context = $(document);
                }

                // Default settings for wvy.realtime
                if (arguments[0] === wvy.realtime) {
                    defaultNamespace = weavy.eventNamespaces.realtime;
                    context = $(document);
                }

                namespace = typeof arguments[2] === 'function' ? arguments[3] : arguments[4];
                handler = typeof arguments[2] === 'function' ? arguments[2] : arguments[3];
                selector = typeof arguments[2] === 'function' ? null : arguments[2];
            }

            namespace = typeof namespace === 'string' ? namespace : defaultNamespace;
            context = context && $(context) || (namespace === weavy.eventNamespaces.weavy ? $(weavy) : $(document));

            // Supports multiple events separated by space
            events = events.split(" ").map(function (eventName) { return eventName + namespace; }).join(" ");

            return { context: context, events: events, selector: selector, handler: handler, namespace: namespace };
        }


        /**
         * Registers one or several event listneres. All event listners are managed and automatically unregistered on destroy.
         * 
         * When listening to weavy events, you may also listen to `before:` and `after:` events by simply adding the prefix to a weavy event.
         * Eventhandlers listening to weavy events may return modified data that is returned to the trigger. The data is passed on to the next event in the trigger event chain. If an event handler calls event.stopPropagation() or returns false, the event chain will be stopped and the value is returned.
         *
         * @example <caption>Widget event</caption>
         * weavy.on("before:options", function(e, options) { ... })
         * weavy.on("options", function(e, options) { ... })
         * weavy.on("after:options", function(e, options) { ... })
         *  
         * @example <caption>Realtime event</caption>
         * weavy.on(wvy.realtime, "eventname", function(e, message) { ... })
         *   
         * @example <caption>Connection event</caption>
         * weavy.on(wvy.connection, "disconnect", function(e) { ... })
         *   
         * @example <caption>Button event</caption>
         * weavy.on(myButton, "click", function() { ... })
         *   
         * @example <caption>Multiple document listeners with custom namespace</caption>
         * weavy.on(document, ".modal", "show hide", function() { ... }, ".bs.modal")
         * 
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. wvy.connection and wvy.realtime may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, followed by any data arguments provided by the trigger.
         * @param {string} [namespace] - Optional namespace applied to all the event names. Namespaces are automatically selected for weavy-, realtime- and connection- events. Any {@link Weavy#eventNamespaces} may be used as parameter.
         * @see The underlying jQuery.on: {@link http://api.jquery.com/on/}
         */
        weavy.on = function (context, events, selector, handler, namespace) {
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
         * Similar to {@link Weavy#on}.
         * 
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. wvy.connection and wvy.realtime may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         * @param {string} [namespace] - Optional namespace applied to all the event names. Namespaces are automatically selected for weavy-, realtime- and connection- events. Any {@link Weavy#eventNamespaces} may be used as parameter.
         */
        weavy.one = function (context, events, selector, handler, namespace) {
            weavy.on(context, events, selector, handler, namespace, true);
        };

        /**
         * Unregisters event listneres. The arguments must match the arguments provided on registration using .on() or .one().
         *
         * @category eventhandling
         * @param {Element} [context] - Context Element. If omitted it defaults to the Widget instance. wvy.connection and wvy.realtime may also be used as contexts.
         * @param {string} events - One or several event names separated by spaces. You may provide any namespaces in the names or use the general namespace parameter instead.
         * @param {string} [selector] - Only applicable if the context is an Element. Uses the underlying jQuery.on syntax.
         * @param {function} handler - The listener. The first argument is always the event, folowed by any data arguments provided by the trigger.
         * @param {string} [namespace] - Optional namespace applied to all the event names. Namespaces are automatically selected for weavy-, realtime- and connection- events. Any {@link Weavy#eventNamespaces} may be used as parameter.
         */
        weavy.off = function (context, events, selector, handler, namespace) {
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
         * Trigger a custom event. Events are per default triggered on the weavy instance using the weavy.eventNamespaces.weavy namespace.
         * 
         * The trigger has an event chain that adds `before:` and `after:` events automatically for all events except when any custom `prefix:` is specified. This way you may customize the eventchain by specifying `before:`, `on:` and `after:` in your event name to fire them one at the time. The `on:` prefix will then be removed from the name when the event is fired.
         * 
         * Eventhandlers listening to the event may return modified data that is returned by the trigger event. The data is passed on to the next event in the trigger event chain. If an event handler calls `event.stopPropagation()` or `return false`, the event chain will be stopped and the value is returned.
         * 
         * @example
         * 
         * // Normal triggering
         * weavy.triggerEvent("myevent");
         * 
         * // Will trigger the following events on the weavy instance
         * // 1. `before:myevent.event.weavy`
         * // 2. `myevent.event.weavy`
         * // 3. `after:myevent.event.weavy`
         * 
         * // Custom triggering, one at the time
         * weavy.triggerEvent("before:myevent");
         * weavy.triggerEvent("on:myevent");
         * weavy.triggerEvent("after:myevent");
         * 
         * @category eventhandling
         * @param {any} name - The name of the event.
         * @param {(Array/Object/JSON)} [data] - Data may be an array or plain object with data or a JSON encoded string. Unlike jQuery, an array of data will be passed as an array and _not_ as multiple arguments.
         * @param {string} [namespace] - The namespace is applied to the name. It defaults to the weavy namespace. Any weavy.eventNamespaces may also be used as parameter.
         * @param {Element} [context] - Context Element to trigger the event on. If omitted it defaults to the Widget instance.
         * @param {Event} [originalEvent] - When relaying another event, you may pass the original Event to access it in handlers.
         * @returns {data} The data passed to the event trigger including any modifications by event handlers.
         */
        weavy.triggerEvent = function (name, data, namespace, context, originalEvent) {
            var hasPrefix = name.indexOf(":") !== -1;
            namespace = typeof namespace === 'string' ? namespace : weavy.eventNamespaces.weavy;
            context = context || (namespace === weavy.eventNamespaces.weavy ? $(weavy) : $(document));
            name = name.replace("on:", "") + namespace;

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
                    weavy.warn("Could not parse event data");
                }
            }

            weavy.debug("trigger", name);

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
         * var mytimeout = weavy.timeout(200).then(function() { ... });
         * mytimeout.reject(); // Cancel the timeout
         * 
         * @category promises
         * @param {int} time=0 - Timeout in milliseconds
         * @returns {external:Promise}
         */
        weavy.timeout = function (time) {
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
             * @lends Weavy#timeout
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
         * Promise that weavy has finished transitions for closing.
         * If weavy already is closed, the promise is resolved instantly.
         * 
         * @example
         * weavy.whenClosed.then(function() { ... })
         * 
         * @category promises
         * @type {external:Promise}
         * @resolved when weavy is closed
         */
        weavy.whenClosed = Promise.resolve();

        /**
         * Promise that the blocking check has finished. Resolves when {@link Weavy#event:frame-check} is triggered.
         *
         * @example
         * weavy.whenBlockChecked.then(function() { ... })
         *
         * @category promises
         * @type {external:Promise}
         * @resolved when frames are not blocked.
         * @rejected when frames are blocked
         * */
        weavy.whenBlockChecked = new Promise(function (resolve, reject) {
            weavy.on("frame-check", function (e, framecheck) {
                framecheck.blocked ? reject() : resolve();
            });
        });

        var loadPromise = function () {
            return new Promise(function (resolve) {
                weavy.one("processed:load", function () {
                    resolve();
                });
            })
        };

        /**
         * Promise that weavy has recieved the after:load event
         *
         * @example
         * weavy.whenLoaded.then(function() { ... })
         *
         * @category promises
         * @type {external:Promise}
         * @resolved when init is called, the websocket has connected, data is received from the server and weavy is built and the load event has finished.
         */
        weavy.whenLoaded = loadPromise();

        /**
         * Initializes weavy. This is done automatically unless you specify `init: false` in {@link Weavy#options}.
         * @emits Weavy#init
         */
        weavy.init = function () {
            /**
             * Event that is triggered when the weavy instance is initiated. This is done automatically unless you specify `init: false` in {@link Weavy#options}.
             * You may use the `before:init` event together with `event.stopPropagation()` if you want to intercept the initialization.
             * 
             * @category events
             * @event Weavy#init
             * @returns {external:Promise}
             */
            return weavy.triggerEvent("init");
        }

        // INTERNAL FUNCTIONS
        function resetContainer() {
            if (weavy.nodes.container) {
                $(weavy.nodes.container).remove();
                weavy.nodes.container = null;
                weavy.isLoaded = false;
            }
        }

        function connect() {
            return wvy.connection.init(weavy.options.url, null, true);
        }

        function disconnect(async, notify) {
            weavy.log("disconnecting weavy");
            if (weavy.nodes.container) {
                $(weavy.nodes.container).find("iframe").each(function (index, frame) {
                    //wvy.connection.removeWindow(frame.contentWindow);
                });
            }

            // NOTE: stop/disconnect directly if we are not authenticated 
            // signalr does not allow the user identity to change in an active connection
            return wvy.connection.disconnect(async, notify);
        }

        function connectAndLoad(fullReload, notify) {
            if (weavy.isLoaded) {
                weavy.whenLoaded = loadPromise();
            }
            if (fullReload === true) {
                weavy.isLoaded = false;
            }
            connect.call(weavy).then(function () {
                weavy.options.href = window.location.href;
                if (notify !== false) {

                    wvy.realtime.invoke("client", "load", weavy.options);
                }
            });

            return weavy.whenLoaded;
        }


        function registerLoading(panelId) {
            var frame = $(weavy.getId("#weavy-panel-" + panelId), weavy.nodes.container).find("iframe").get(0);
            if (frame && !frame.registered) {
                var onload = function () {
                    weavy.sendWindowId(frame.contentWindow, frame.id, panelId);
                    weavy.setPanelLoading.call(weavy, panelId, false);
                    delete frame.dataset.src;
                    // add window to connections
                    wvy.connection.addWindow(frame.contentWindow);
                    frame.loaded = true;
                };
                weavy.on(frame, "load", onload);
                frame.registered = true;
            }
        }

        function buildOutput() {
            // add container
            if (!weavy.nodes.container) {
                weavy.nodes.container = document.createElement("div");

                weavy.nodes.container.className = "weavy-widget " + weavy.options.className + ' ' + (weavy.options.container ? 'weavy-custom' : 'weavy-default');
                weavy.nodes.container.id = weavy.getId("weavy-widget");
                weavy.nodes.container.setAttribute("data-version", weavy.options.version);

                if (weavy.options.overlay) {
                    weavy.nodes.overlay = $(weavy.options.overlay)[0];
                } else {
                    weavy.nodes.overlay = document.createElement("div");
                    weavy.nodes.overlay.id = weavy.getId("weavy-overlay");
                    weavy.nodes.container.appendChild(weavy.nodes.overlay);
                }

                weavy.nodes.overlay.classList.add("weavy-overlay");

                // frame status checking
                weavy.statusFrame = document.createElement("iframe");
                weavy.statusFrame.className = "weavy-status-check weavy-hidden-frame";
                weavy.statusFrame.style.display = "none";
                weavy.statusFrame.id = weavy.getId("weavy-status-check");

                /**
                 * Event triggered when frame blocking check has finished. You may also use the {@link Weavy#whenBlockChecked} promise to make sure the blocked check has finished.
                 *
                 * @category events
                 * @event Weavy#frame-check
                 * @returns {object}
                 * @property {boolean} blocked - Indicates if frames are blocked.
                 */

                weavy.on(weavy.statusFrame, "load", function () {
                    // start testing for blocked iframe             
                    weavy.isBlocked = true;
                    try {
                        this.contentWindow.postMessage({ "name": "ping" }, "*");
                    } catch (e) {
                        weavy.warn("Frame postMessage is blocked", e);
                        weavy.triggerEvent("frame-check", { blocked: true });
                    }

                });

                var onFrameReady = function (e) {
                    e = e.originalEvent || e;
                    switch (e.data.name) {
                        case "ready":
                            weavy.triggerEvent("frame-check", { blocked: false });
                            weavy.off(window, "message", onFrameReady);
                            break;
                    }
                };

                weavy.on(window, "message", onFrameReady);

                weavy.nodes.container.appendChild(weavy.statusFrame);
                weavy.timeout(1).then(function () {
                    weavy.statusFrame.src = weavy.options.statusUrl;
                });

                // append container to target element || html
                if (!weavy.nodes.root) {
                    var target = $(weavy.options.container)[0] || document.documentElement.appendChild(document.createElement("section"));
                    target.classList.add("weavy-root");

                    if (weavy.supportsShadowDOM) {
                        target.classList.add("weavy-shadow");
                        target = target.attachShadow({ mode: "closed" });
                    }
                    weavy.nodes.root = target;
                }

                weavy.nodes.root.appendChild(weavy.nodes.container);

            }

            /**
             * Event triggered when weavy is building up the DOM elements.
             * 
             * Use this event to build all your elements and attach them to weavy.
             * At this point you may safely assume that weavy.nodes.container is built.
             * 
             * Good practice is to build all elements in the build event and store them as properties on weavy.
             * Then you can attach them to other Elements in the after:build event.
             * This ensures that all Elements are built before they are attached to each other.
             *
             * If you have dependencies to Elements built by plugins you should also check that they actually exist before attaching to them.
             *
             * Often it's a good idea to check if the user is signed-in using {@link Weavy#isAuthenticated} unless you're building something that doesn't require a signed in user.
             *
             * @example
             * weavy.on("build", function() {
             *     if (weavy.isAuthenticated()) {
             *         weavy.nodes.myElement = document.createElement("DIV");
             *     }
             * });
             * 
             * weavy.on("after:build", function() {
             *     if (weavy.isAuthenticated()) {
             *         if (weavy.nodes.dock) {
             *             weavy.nodes.dock.appendChild(weavy.nodes.myElement);
             *         }
             *     }
             * })
             *
             * @category events
             * @event Weavy#build
             */

            weavy.triggerEvent("build");
        }


        // PUBLIC METHODS

        /**
         * Appends the weavy-id to an id. This makes the id unique per weavy instance. You may define a specific weavy-id for the instance in the {@link Weavy#options}. If no id is provided it only returns the weavy id. The weavy id will not be appended more than once.
         * 
         * @param {string} [id] - Any id that should be completed with the weavy id.
         * @returns {string} Id completed with weavy-id. If no id was provided it returns the weavy-id only.
         */
        weavy.getId = function (id) {
            return id ? weavy.removeId(id) + "-" + weavy.options.id : weavy.options.id;
        }

        /**
         * Removes the weavy id from an id created with {@link Weavy#getId}
         * 
         * @param {string} id - The id from which the weavy id will be removed.
         * @returns {string} Id without weavy id.
         */
        weavy.removeId = function (id) {
            return id ? id.replace(new RegExp("-" + weavy.getId() + "$"), '') : id;
        };

        /**
         * Checks if the user is signed in. May chack against any optional provided data.
         * 
         * @category authentication
         * @param {Object} [optionalData] - Data that contains userId to verify against current user `{ userId: id }`, such as {@link Weavy#options}.
         * @returns {boolean} True if the user is signed in
         */
        weavy.isAuthenticated = function (optionalData) {
            if (optionalData) {
                return optionalData.userId && optionalData.userId === weavy.options.userId ? true : false;
            }
            return weavy.options.userId ? true : false;
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
        weavy.sendWindowId = function (contentWindow, windowName, panelId) {
            try {
                contentWindow.postMessage({
                    name: "window-id",
                    panelId: panelId,
                    weavyId: weavy.getId(),
                    windowName: windowName,
                    weavyUrl: weavy.options.url
                }, "*");
            } catch (e) {
                weavy.error("Could not send window id", windowName, e);
            }
        };

        /**
         * Sends a postMessage to a panel iframe
         * 
         * @category panels
         * @param {string} panelId - If the frame is a panel, the panelId may also be provided.
         * @param {object} message - The Message to send
         * @param {Transferable[]} [transfer] - A sequence of Transferable objects that are transferred with the message.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
         */
        weavy.postMessage = function (panelId, message, transfer) {
            if (weavy.panelIsLoaded(panelId)) {
                var frame = $(weavy.getId("#weavy-panel-" + panelId), weavy.nodes.container).find("iframe").get(0);
                if (frame) {
                    try {
                        frame.contentWindow.postMessage(message, "*", transfer);
                    } catch (e) {
                        weavy.error("Could not post panel message", e);
                    }
                }
            }
        }

        /**
         * Maximizes or restores the size of current panel.
         * 
         * @category panels
         * @emits Weavy#resize
         */
        weavy.resize = function () {
            $(weavy.nodes.container).toggleClass("weavy-wide");

            /**
             * Triggered when the panel is resized due to a state change.
             * 
             * @category events
             * @event Weavy#resize
             */
            weavy.triggerEvent("resize", null);
        }

        /**
         * Maximize the size of current panel. 
         * 
         * @category panels
         * @emits Weavy#maximize
         */
        weavy.maximize = function () {
            $(weavy.nodes.container).addClass("weavy-wide");

            /**
             * Triggered when the panel is maximized to full broser window size
             * 
             * @category events
             * @event Weavy#maximize
             */
            weavy.triggerEvent("maximize", null);
        }

        /**
         * Reload weavy data.
         * 
         * @category options
         * @param {Weavy#options} [options] Any new or additional options.
         * @emits Weavy#reload
         * @returns {external:Promise} {@link Weavy#whenLoaded}
         */
        weavy.reload = function (options) {
            weavy.options = weavy.extendDefaults(weavy.options, options);
            connectAndLoad();

            /**
             * Triggered when weavy is reloaded with any new data. Current options are provided as event data.
             * 
             * @category events
             * @event Weavy#reload
             * @returns {Weavy#options}
             */
            weavy.triggerEvent("reload", weavy.options);
            return weavy.whenLoaded;
        }

        /**
         * Check if a panel is currently loading.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to check.
         * @returns {boolean} True if the panel curerently is loading
         */
        weavy.panelIsLoading = function (panelId) {
            var frame = $(weavy.getId("#weavy-panel-" + panelId), weavy.nodes.container).find("iframe").get(0);
            return frame.getAttribute("src") && !frame.loaded ? true : false;
        };

        /**
         * Check if a panel has finished loading.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to check.
         * @returns {boolean} True if the panel has finished loading.
         */
        weavy.panelIsLoaded = function (panelId) {
            var frame = $(weavy.getId("#weavy-panel-" + panelId), weavy.nodes.container).find("iframe").get(0);
            return frame.loaded ? true : false;
        };

        /**
         * Tells a panel that it need to reload it's content.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to refresh.
         * @emits Weavy#refresh
         */
        weavy.refresh = function (panelId) {

            weavy.setPanelLoading.call(weavy, panelId, true);

            var $target = $(weavy.getId("#weavy-panel-" + panelId), weavy.nodes.container);
            var frame = $target.find("iframe");

            frame[0].contentWindow.postMessage({ "name": "reload" }, "*");

            /**
             * Event triggered when a panel is resfreshed and needs to reload it's content.
             * 
             * @category events
             * @event Weavy#refresh
             * @returns {Object}
             * @property {string} panelId - The id of the panel being refreshed.
             */
            weavy.triggerEvent("refresh", { panelId: panelId });
        }

        /** 
         * Resets a panel to its original url. This can be used if the panel has ended up in an incorrect state.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel to reset.
         */
        weavy.reset = function (panelId) {
            weavy.setPanelLoading.call(weavy, panelId, true);
            var $target = $(weavy.getId("#weavy-panel-" + panelId), weavy.nodes.container);
            var frame = $target.find("iframe");
            frame[0].src = frame[0].dataset.src || frame[0].src || "about:blank";
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
        weavy.open = function (panelId, destination) {
            return weavy.whenBlockChecked.then(function () {
                $(weavy.nodes.container).addClass("weavy-open");
                weavy.openPanelId = panelId;

                /**
                 * Event triggered when a panel is opened.
                 * 
                 * @category events
                 * @event Weavy#open
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel being openened.
                 * @property {string} [destination] - Any url being requested to open in the panel.
                 */
                var openResult = weavy.triggerEvent("open", { panelId: panelId, destination: destination });

                if (openResult !== false) {
                    return Promise.resolve(openResult);
                } else {
                    return Promise.reject({ panelId: panelId, destination: destination });
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
        weavy.close = function (panelId) {
            if ((!panelId || panelId === weavy.openPanelId) && $(weavy.nodes.container).hasClass("weavy-open")) {
                $(weavy.nodes.container).removeClass("weavy-open");

                /**
                 * Event triggered when weavy closes all panels. Wait for the {@link Weavy#whenClosed} Promise to do additional things when weavy has finished closing.
                 * 
                 * @category events
                 * @event Weavy#close
                 */
                weavy.triggerEvent("close");

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
        weavy.toggle = function (panelId, destination) {
            if (!weavy.isBlocked) {
                var closed = false;
                if ($(weavy.nodes.container).hasClass("weavy-open") && weavy.openPanelId === panelId) {
                    weavy.log("toggle: weavy closed");
                    weavy.close();
                    closed = true;
                } else {
                    weavy.log("toggle open:", panelId);
                    weavy.open(panelId, typeof (destination) === "string" ? destination : null);
                }

                /**
                 * Event triggered when a panel is toggled open or closed.
                 * 
                 * @category events
                 * @event Weavy#toggle
                 * @returns {Object}
                 * @property {string} panelId - The id of the panel toggled.
                 * @property {boolean} closed - True if the panel is closed.
                 */
                weavy.triggerEvent("toggle", { panelId: panelId, closed: closed });
            }
        }

        /**
         * Set the loading indicator on the specified panel. The loading indicatior is automatically removed on loading. It also makes sure the panel is registered and [sends frame id]{@link Weavy#sendWindowId} when loaded.
         * 
         * @category panels
         * @param {string} panelId - The id of the panel that is loading.
         * @param {boolean} isLoading - Sets whether the panel is loading or not.
         * @param {boolean} [fillBackground] - Sets an opaque background that hides any panel content during loading.
         * @emits Weavy#panel-loading
         */
        weavy.setPanelLoading = function (panelId, isLoading, fillBackground) {
            if (isLoading) {
                registerLoading(panelId);
                loadingTimeout[panelId] = weavy.timeout(15000).then(weavy.setPanelLoading.bind(weavy, panelId, false));
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
             * @event Weavy#panel-loading
             * @returns {Object}
             * @property {string} panelId - The id of the panel loading.
             * @property {boolean} isLoading - Indicating wheter the panel is loading or not.
             * @property {boolean} fillBackground - True if the panel has an opaque background during loading.
             */
            weavy.triggerEvent("panel-loading", { panelId: panelId, isLoading: isLoading, fillBackground: fillBackground });
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
        weavy.load = function (panelId, url, data, method, replace) {
            url = weavy.httpsUrl(url, weavy.options.url);
            return weavy.whenBlockChecked.then(function () {
                var frameTarget = $(weavy.nodes.container).find(weavy.getId("#" + weavy.panelPrefix + "-" + panelId) + " ." + weavy.panelPrefix + "-frame").get(0);
                if (frameTarget) {
                    if (replace || frameTarget.dataset && frameTarget.dataset.src || !frameTarget.getAttribute("src")) {
                        // Not yet fully loaded
                        weavy.setPanelLoading(panelId, true, replace);
                        weavy.sendToFrame(weavy.getId(frameTarget.name), url, data, method);
                    } else {
                        // Fully loaded, send using turbolinks
                        frameTarget.contentWindow.postMessage({ name: 'send', url: url, data: data, method: method }, "*");
                    }
                }
            });
        }

        /**
         * Loads an url in a frame or sends data into a specific frame. Will replace anything in the frame.
         * 
         * @ignore
         * @category panels
         * @param {string} frameName - The name attribute identifier of the frame
         * @param {any} url - URL to load.
         * @param {any} [data] - URL/form encoded data.
         * @param {any} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         * @returns {external:Promise}
         */
        weavy.sendToFrame = function (frameName, url, data, method) {
            // Todo: return complete promise instead
            return weavy.whenBlockChecked.then(function () {
                method = String(method || "get").toLowerCase();

                // Ensure target exists
                var frame = $("iframe[name='" + frameName + "']", weavy.nodes.container).get(0);

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
                        window.open(frameUrl, frameName);
                        return;
                    }

                    weavy.info("sendToFrame using form");

                    // Create a form to send to the frame
                    var $form = $("<form>", {
                        action: url,
                        method: method,
                        target: frameName
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
         * Method for calling JSON API endpoints on the server. You may send data along with the request or retrieve data from the server.
         * 
         * jQuery ajax is used internally and you may override or extend any settings in the {@link external:jqXHR} by providing custom [jQuery Ajax settings]{@link external:jqAjaxSettings}.
         * 
         * You may of course call the endpoints using any other preferred AJAX method, but this method is preconfigured with proper encoding and crossdomain settings.
         *
         * @param {string} url - URL to the JSON endpoint. May be relative to the connected server.
         * @param {object} [data] - Data to send. May be an object that will be encoded or a string with pre encoded data.
         * @param {string} [method=GET] - HTTP Request Method {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods}
         * @param {external:jqAjaxSettings} [settings] - Settings to extend or override [jQuery Ajax settings]{@link external:jqAjaxSettings}.
         * @returns {external:jqXHR} {@link external:Promise}
         * 
         * @example <caption>Requires custom endpoints on the server, normally included in a sandbox installation.</caption>
         * // Create a space and open it as a panel
         * weavy.ajax("/api/spaces/", { name: "My Space" }, "POST").then(function(result) {
         *   weavy.addPanel("space" + result.id, result.url);
         *   weavy.open("space" + result.id);
         * });
         *
         * // Search for a space
         * weavy.ajax("/api/search", { q: "My Space", et: "space"}).then(function(result) {
         *   console.log("Found " + result.count + " results");
         * });
         */
        weavy.ajax = function (url, data, method, settings) {
            url = weavy.httpsUrl(url, weavy.options.url);
            method = method || "GET";
            data = data && typeof data === "string" && data || method !== "GET" && data && JSON.stringify(data) || data;

            settings = weavy.extendDefaults({
                url: url,
                method: method,
                data: data,
                contentType: "application/json",
                crossDomain: true,
                dataType: "json",
                xhrFields: {
                    withCredentials: true
                }
            }, settings, true);

            return $.ajax(settings);
        }

        /**
         * Destroys the instance of Weavy. You should also remove any references to weavy after you have destroyed it. The [destroy event]{@link Weavy#event:destroy} will be triggered before anything else is removed so that plugins etc may unregister and clean up, before the instance is gone.
         * @param {boolean} [keepConnection=false] - Set to true if you want the realtime-connection to remain connected.
         * @emits Weavy#destroy
         */
        weavy.destroy = function (keepConnection) {
            /**
             * Event triggered when the Weavy instance is about to be destroyed. Use this event for clean up. 
             * - Any events registered using {@link Weavy#on} and {@link Weavy#one} will be unregistered automatically. 
             * - Timers using {@link Weavy#timeout} will be cleared automatically.
             * - All elements under the {@link Weavy#nodes#root} will be removed.
             * 
             * @category events
             * @event Weavy#destroy
             */
            weavy.triggerEvent("destroy", null);

            resetContainer();

            clearEventHandlers();
            clearTimeouts();

            _weavyIds.splice(_weavyIds.indexOf(weavy.getId()), 1);

            if (!keepConnection && _weavyIds.length === 0) {
                disconnect();
            }

            $(weavy.nodes.root).remove();
            weavy.nodes.root = null;
        }

        // WIDGET EVENTS

        // Register init before any plugins do
        weavy.on("init", function () {
            return connectAndLoad(true);
        });


        // MESSAGE EVENTS

        // listen for dispatched messages from weavy (close/resize etc.)
        weavy.on(window, "message", function (e, message) {
            e = e.originalEvent || e;
            message = message || e.data;

            if (message) {
                switch (message.name) {
                    case "signing-in":
                        /**
                         * Event triggered when signing in process has begun. The user is still not authenticated. The authentication may result in {@link Weavy#event:signed-in} or {@link Weavy#event:authentication-error}.
                         * This event may be triggered from anywhere, not only the Weavy instance.
                         * 
                         * @category events
                         * @event Weavy#signing-in
                         * @returns {Object}
                         * @property {boolean} isLocal - Is the origin of the event from this weavy instance
                         */
                        weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-in", { isLocal: typeof e.source !== "undefined" && (!message.sourceWidgetId || message.sourceWidgetId === weavy.getId()) }));
                        break;
                    case "signing-out":
                        weavy.close();
                        /**
                         * Event triggered when signing out process has begun. Use this event to do signing out animations and eventually clean up your elements. It will be followed by {@link Weavy#event:signed-out}
                         * This event may be triggered from anywhere, not only the Weavy instance.
                         * 
                         * @category events
                         * @event Weavy#signing-out
                         * @returns {Object}
                         * @property {boolean} isLocal - Is the origin of the event from this weavy instance
                         */
                        weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-out", { isLocal: typeof e.source !== "undefined" && (!message.sourceWidgetId || message.sourceWidgetId === weavy.getId()) }));
                        break;
                    case "signed-out":
                        weavy.options.userId = null;
                        break;
                    case "authentication-error":
                        /**
                         * Event triggered when a sign-in attempt was unsuccessful.
                         * This event may be triggered from anywhere, not only the Weavy instance.
                         * 
                         * @category events
                         * @event Weavy#authentication-error
                         */
                        weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "authentication-error"));
                        break;
                }

                if (typeof e.source !== "undefined" && (!message.sourceWidgetId || message.sourceWidgetId === weavy.getId())) {
                    /**
                     * Event for window messages directed to the current weavy instance, such as messages sent from panels belonging to the weavy instance.
                     * The original message event is attached as event.originalEvent.
                     * 
                     * Use data.name to determine which type of message theat was receivied.
                     * 
                     * @category events
                     * @event Weavy#message
                     * @returns {Object.<string, data>}
                     * @property {string} name - The name of the message
                     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
                     */
                    weavy.triggerEvent("message", message, null, null, e);
                }
            }
        });

        weavy.on("message", function (e, message) {
            weavy.debug("window message:", message.name);

            switch (message.name) {
                case "invoke":
                    if (wvy.connection.connection.state === wvy.connection.state.connected) {
                        var proxy = wvy.connection.proxies[message.hub];
                        proxy.invoke.apply(proxy, message.args).fail(function (error) {
                            weavy.error(error)
                        });
                    }
                    break;
                case "ready":
                    weavy.isBlocked = false;
                    // page loaded
                    if (message.sourcePanelId) {
                        weavy.setPanelLoading.call(weavy, message.sourcePanelId, false);
                    }

                    /**
                     * Event triggered when a panel sends a ready message. Check the sourcePanelId or sourceWindowName to see which panel that sent the ready message.
                     * 
                     * @category events
                     * @event Weavy#ready
                     * @returns {Object}
                     * @property {string} sourceWindowName - The name of the frame (or window) for the panel.
                     * @property {string} sourcePanelId - The panelId of the panel
                     */
                    weavy.triggerEvent("ready", message);
                    break;
                case "reload":
                    // reload and re-init all weavy instances
                    connectAndLoad(true);
                    break;
                case "reset":
                    var active = $(".weavy-panel.weavy-open", weavy.nodes.container);
                    if (active.length) {
                        weavy.reset(active.attr("data-id"));
                    }
                    break;
                case "close":
                    weavy.close();
                    break;
                case "maximize":
                    weavy.maximize();
                    break;
                case "send":
                    weavy.load(message.panelId, message.url, message.data, message.method, true);
                    weavy.open(message.panelId);
                    break;

                case "request:open":
                    if (message.panelId) {
                        if (message.destination) {
                            weavy.load(message.panelId, message.destination, null, null, true);
                        }
                        weavy.open(message.panelId);
                    }
                    break;
                case "request:close":
                    if (message.panelId) {
                        weavy.close(message.panelId);
                    }
                    break;   
            }

        });

        // REALTIME EVENTS

        // signalR connection state has changed
        weavy.on(wvy.connection, "state-changed", function (e, data) {
            if (disconnected && data.state.newState === wvy.connection.state.connected && weavy.isAuthenticated()) {
                disconnected = false;

                // reload weavy                
                wvy.connection.reload();
            }
        });

        // signalR connection disconnected
        weavy.on(wvy.connection, "disconnected", function (e, data) {
            if (!data.explicitlyDisconnected) {
                disconnected = true;
            }
        });

        weavy.on(wvy.connection, "user-change", function (e, data) {
            weavy.log("user-change", data.eventName);

            /**
             * Event triggered when the user is successfully signed in using any authentication method. The realtime connection gets automatically reconnected before this event occurs.
             * This event is triggered when the server has recieved a sucessful sign-in using any method.
             * 
             * @category events
             * @event Weavy#signed-in
             */

            /**
             * Event triggered when the user has been signed out. The realtime connection gets automatically reset when this event occurs.
             * This event is triggered when the user is signed out from the server for any reason.
             * 
             * @category events
             * @event Weavy#signed-out
             */

            if (data.eventName === "signed-out") {
                weavy.options.userId = null;
            }
            // Connnect then trigger signed-in or signed-out
            connectAndLoad(true, true).then(weavy.triggerEvent.bind(weavy, data.eventName));
        });

        weavy.on(wvy.realtime, "badge.weavy", function (e, data) {

            /**
             * Triggers when the number of unread conversations or notifications change.
             * 
             * @example
             * weavy.on("badge", function (e, data) {
             *     weavy.log("New notifications count", data.notifications);
             *     weavy.log("Unread conversations count", data.conversations);
             * });
             * 
             * @event badge#badge
             * @category events
             * @returns {Object}
             * @property {int} conversations - Number of unread conversations
             * @property {int} notifications - Number of unread notifications
             * @property {int} total - The total number of unread conversations and notifications.
             */
            weavy.triggerEvent("badge", data);
        });

        weavy.on(wvy.realtime, "loaded.weavy", function (e, data) {
            if (data.id && data.id === weavy.getId()) {

                // Merge options
                weavy.options = weavy.extendDefaults(weavy.options, data, true);

                /**
                 * Event triggered when options are processed and recieved from the server. Use this event to react to option changes from the server. 
                 * You may modify the data using the `before:options` event. This event is mostly followed by {@link Weavy#event:build}.
                 * If you want to prevent the build event from triggering, you may set `weavy.isLoaded = true`.
                 * 
                 * @category events
                 * @event Weavy#options
                 * @returns {Weavy#options}
                 */
                var processedOptions = weavy.triggerEvent("options", data);

                // Merge options
                if (processedOptions) {
                    weavy.options = weavy.extendDefaults(weavy.options, processedOptions, true);
                }

                if (weavy.isLoaded === false) {
                    buildOutput.call(weavy);
                    weavy.isLoaded = true;

                    /**
                     * Event triggered when weavy has initialized, connected to the server and recieved and processed options, and built all components.
                     * Use this event to do stuff when everything is loaded.
                     * 
                     * Often it's a good idea to check if the user is signed-in using {@link Weavy#isAuthenticated} unless you're building something that doesn't require a signed in user.
                     * 
                     * @example
                     * weavy.on("load", function() {
                     *     if (weavy.isAuthenticated()) {
                     *         weavy.alert("Widget successfully loaded");
                     *     }
                     * });
                     * 
                     * @category events
                     * @event Weavy#load
                     */
                    weavy.triggerEvent("load");
                }
                weavy.triggerEvent("processed:load");
            }

        });


        // RUN PLUGINS

        /**
         * All enabled plugins are available in the plugin list. Anything exposed by the plugin is accessible here. 
         * You may use this to check if a plugin is enabled and active.
         * 
         * Set plugin options and enable/disable plugins using {@link Weavy#options}.
         * 
         * @example
         * if (weavy.plugins.alert) {
         *   weavy.plugins.alert.alert("Alert plugin is enabled");
         * }
         * 
         * @category plugins
         * @type {Object.<string, plugin>}
         */
        weavy.plugins = {};

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
                            if (typeof Weavy.plugins[dep] !== "function") {
                                weavy.error("plugin dependency needed by " + pluginName + " is not loaded/registered:", dep);
                            } else if (!(weavy.options.includePlugins && weavy.options.plugins[dep] !== false || !weavy.options.includePlugins && weavy.options.plugins[dep])) {
                                weavy.error("plugin dependency needed by " + pluginName + " is disabled:", dep);
                            }

                            if (_checkedDependencies.indexOf(dep) === -1) {
                                _checkedDependencies.push(dep);
                                sortByDependencies(dep);
                            } else {
                                weavy.error("You have circular Weavy plugin dependencies:", pluginName, dep);
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
        if (weavy.options.plugins !== false) {
            weavy.options.plugins = weavy.options.plugins || {};


            for (plugin in Weavy.plugins) {
                if (typeof Weavy.plugins[plugin] === "function") {

                    // Disable individual plugins by setting plugin options to false
                    if (weavy.options.includePlugins && weavy.options.plugins[plugin] !== false || !weavy.options.includePlugins && weavy.options.plugins[plugin]) {
                        _unsortedDependencies[plugin] = { name: plugin, dependencies: $.isArray(Weavy.plugins[plugin].dependencies) ? Weavy.plugins[plugin].dependencies : [] };
                    }
                }
            }

            // Sort by dependencies
            sortByDependencies();

            for (var sortedPlugin in _sortedDependencies) {
                var plugin = _sortedDependencies[sortedPlugin].name;

                weavy.debug("Running Weavy plugin:", plugin);

                // Extend plugin options
                weavy.options.plugins[plugin] = weavy.extendDefaults(Weavy.plugins[plugin].defaults, $.isPlainObject(weavy.options.plugins[plugin]) ? weavy.options.plugins[plugin] : {}, true);

                // Run the plugin
                weavy.plugins[plugin] = Weavy.plugins[plugin].call(weavy, weavy.options.plugins[plugin]) || true;
            }

        }

        // INIT
        if (weavy.options.init === true) {
            weavy.init();
        }
    }

    // PROTOTYPE EXTENDING

    /**
     * Option preset configurations. Use these for simple configurations of common options. You may add your own presets also. 
     * The presets may be merged with custom options when you create a new Weavy, since the contructor accepts multiple option sets. 
     * 
     * @example
     * // Load the minimal weavy core without any panels.
     * var weavy = new Weavy(Weavy.presets.core, { url: "https://myweavysite.com" });
     * 
     * @category options
     * @type {Object}
     * @property {Weavy#options} Weavy.presets.noplugins - Disable all plugins.
     * @property {Weavy#options} Weavy.presets.core - Enable all core plugins only.
     * @property {Weavy#options} Weavy.presets.extended - Enable all core plugins and all extended plugins.
     * @property {Weavy#options} Weavy.presets.panel - Minimal plugin set to only have one or more panels.
     */
    Weavy.presets = {
        noplugins: {
            includePlugins: false
        },
        core: {
            includePlugins: false,
            plugins: {
                alert: true,
                attach: true,
                authentication: true,
                panels: true,
                preview: true,
                sso: true,
                theme: true
            }
        },
        extended: {
            includePlugins: true
        },
        panel: {
            includePlugins: false,
            className: "weavy-default",
            plugins: {
                attach: true,
                panels: {
                    controls: false
                },
                preview: true,
                theme: true
            }
        }
    };

    /**
     * Default options. These options are general for all Weavy instances and may be overridden in {@link Weavy#options}. You may add any general options you like here.
     * 
     * @example
     * // Defaults
     * Weavy.defaults = {
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
     * // Set a general url to connect all weavy instances to
     * Weavy.defaults.url = "https://myweavysite.com";
     * var weavy = new Weavy();
     *
     * @category options
     * @type {Object}
     * @property {Element} [container] - Container where weavy should be placed. If no Element is provided, a &lt;section&gt; is created next to the &lt;body&gt;-element.
     * @property {string} [className] - Additional classNames added to weavy.
     * @property {string} [https=adaptive] - How to enforce https-links. <br>• **force** -  makes all urls https.<br>• **adaptive** -  enforces https if the calling site uses https.<br>• **default** - makes no change.
     * @property {boolean} [init=true] - Should weavy initialize automatically.
     * @property {boolean} [isMobile] - Indicates if the browser is mobile. Defaults to the RegExp expression <code>/iPhone&#124;iPad&#124;iPod&#124;Android/i.test(navigator.userAgent)</code>
     * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
     * @property {Element} [overlay] - Element to use for overlay purposes. May for instance use the overlay of another Weavy instance.
     * @property {string} url - The URL to the Weavy-installation to connect to.
     */
    Weavy.defaults = {
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
     * Placeholder for registering plugins. Plugins must be registered and available here to be accessible and initialized in the Widget. Register any plugins after you have loaded weavy.js and before you create a new Weavy instance.
     * @type {Object.<string, plugin>}
     */
    Weavy.plugins = {};

    /**
     * Id list of all created instances.
     * @name Weavy.instances
     * @type {string[]}
     */
    Object.defineProperty(Weavy, 'instances', {
        get: function() { return _weavyIds.slice(); },
        configurable: false
    });


    // Logging functions
    var isIE = /; MSIE|Trident\//.test(navigator.userAgent);

    function colorLog(logMethod, id, color, logArguments) {
        // Binding needed for console.log.apply to work in IE
        var log = Function.prototype.bind.call(logMethod, console);

        if (isIE) {
            if (id) {
                log.apply(this, ["Weavy " + id].concat($.makeArray(logArguments)));
            } else {
                log.apply(this, $.makeArray(logArguments));
            }
        } else {
            if (id) {
                log.apply(this, ["%cWeavy %s", "color: " + color, id].concat($.makeArray(logArguments)));
            } else {
                log.apply(this, ["%cWeavy", "color: gray"].concat($.makeArray(logArguments)));
            }
        }
    }

    // PROTOTYPE METHODS

    /**
     * Wrapper for `console.debug()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using the {@link Weavy#logColor}. 
     * @category logging
     * @type {console.debug}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/debug}
     */
    Weavy.prototype.debug = function () {
        colorLog(console.debug, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.error()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using the {@link Weavy#logColor}. 
     * @category logging
     * @type {console.error}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/error}
     */
    Weavy.prototype.error = function () {
        colorLog(console.error, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.info()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using the {@link Weavy#logColor}. 
     * @category logging
     * @type {console.info}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/info}
     */
    Weavy.prototype.info = function () {
        colorLog(console.info, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.log()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using the {@link Weavy#logColor}. 
     * @category logging
     * @type {console.log}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/log}
     */
    Weavy.prototype.log = function () {
        colorLog(console.log, this.options.id, this.logColor, arguments);
    };

    /**
     * Wrapper for `console.warn()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using the {@link Weavy#logColor}. 
     * @category logging
     * @type {console.warn}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Console/warn}
     */
    Weavy.prototype.warn = function () {
        colorLog(console.warn, this.options.id, this.logColor, arguments);
    };

    /**
     * Stores data for the current domain in the weavy namespace.
     * 
     * @category options
     * @param {string} key - The name of the data
     * @param {data} value - Data to store
     * @param {boolean} [asJson=false] - True if the data in value should be stored as JSON
     */
    Weavy.prototype.storeItem = function (key, value, asJson) {
        localStorage.setItem('weavy_' + window.location.hostname + "_" + key, asJson ? JSON.stringify(value) : value);
    };

    /**
     * Retrieves data for the current domain from the weavy namespace.
     * 
     * @category options
     * @param {string} key - The name of the data to retrevie
     * @param {boolean} [isJson=false] - True if the data shoul be decoded from JSON
     */
    Weavy.prototype.retrieveItem = function (key, isJson) {
        var value = localStorage.getItem('weavy_' + window.location.hostname + "_" + key);
        if (value && isJson) {
            return JSON.parse(value)
        }

        return value;
    };

    /**
     * Method for extending options. It merges together options. If the recursive setting is applied it will merge any plain object children. Note that Arrays are treated as data and not as tree structure when merging. 
     * 
     * The original options passed are left untouched. {@link Weavy.httpsUrl} settings is applied to all url options.
     * 
     * @category options
     * @param {Object} source - Original options.
     * @param {Object} properties - Merged options that will replace options from the source.
     * @param {boolean} [recursive=false] True will merge any sub-objects of the options recursively. Otherwise sub-objects are treated as data.
     * @returns {Object} A new object containing the merged options.
     */
    Weavy.prototype.extendDefaults = function (source, properties, recursive) {
        source = source || {};
        properties = properties || {};

        var property;
        var https = properties.https || source.https || this.options.https || Weavy.defaults.https || "nochange";

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
                    copy[property] = this.httpsUrl(properties[property], null, https);
                }
            }
        }
        return copy;
    };


    /**
     * Applies https enforcement to an url. Optionally adds a baseUrl to relative urls.
     * 
     * @category options
     * @param {string} url - The url to process
     * @param {string} [baseUrl] - Url to preprend to relative urls. Ie. `weavy.options.url`
     * @param {string} [https] - How to treat http enforcement for the url. Default to settings from {@link Weavy#options}. <br> • **enforce** - makes all urls https.<br> • **adaptive** - enforces https if the calling site uses https.<br> • **nochange** - makes no change.
     * @returns {string} url
     */
    Weavy.prototype.httpsUrl = function (url, baseUrl, https) {
        https = https || this.options.https || Weavy.defaults.https || "nochange";
        if (typeof url === "string" && https !== "nochange") {
            // Check baseUrl and url protocol
            if (baseUrl && !/^[0-9a-zA-Z+\-.]*:/.test(url)) {
                // Remove beginning slash
                if (url.indexOf("/") === 0) {
                    url = url.substr(1);
                }
                // Add trailing slash
                if (baseUrl.lastIndexOf("/") !== baseUrl.length - 1) {
                    baseUrl += "/";
                }
                url = baseUrl + url;
            }
            
            // Check protocol
            if (https === "enforce") {
                url = url.replace(/^http:/, "https:");
            } else if (https === "adaptive") {
                url = url.replace(/^http:/, window.location.protocol);
            }
        }
        return url;
    };


    // SHIM
    // Deprecated name, remove this in next version
    this.WeavyWidget = function () {
        console.warn("Using new WeavyWidget() is deprecated. Use new Weavy() instead.");

        for (var p in this.WeavyWidget) {
            if (p && this.WeavyWidget.hasOwnProperty(p)) {
                Weavy[p] = this.WeavyWidget[p];
            }
        }
        
        return Weavy.apply(this, arguments);
    };

    this.WeavyWidget.prototype = Object.create(Weavy.prototype);

    for (var p in Weavy) {
        if (p && Weavy.hasOwnProperty(p)) {
            this.WeavyWidget[p] = Weavy[p];
        }
    }

})(jQuery);

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

/**
 * @external jqXHR
 * @see http://api.jquery.com/jQuery.ajax/#jqXHR
 */

/**
 * @external jqAjaxSettings
 * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
 */

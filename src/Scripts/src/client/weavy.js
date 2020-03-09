/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './events',
            './panels',
            './space',
            './authentication',
            './navigation',
            './utils',
            './console'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./events'),
            require('./panels'),
            require('./space'),
            require('./authentication'),
            require('./navigation'),
            require('./utils'),
            require('./console')
        );
    } else {
        // Browser globals (root is window)
        root.Weavy = factory(
            jQuery,
            root.WeavyEvents,
            root.WeavyPanels,
            root.WeavySpace,
            root.WeavyAuthentication,
            root.WeavyNavigation,
            root.WeavyUtils,
            root.WeavyConsole
        );
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyEvents, WeavyPanels, WeavySpace, WeavyAuthentication, WeavyNavigation, utils, WeavyConsole) {
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

    var Weavy = function () {
        /** 
         *  Reference to this instance
         *  @lends Weavy#
         */
        var weavy = this;

        var disconnected = false;

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

        function generateId(id) {
            id = "wy-" + (id ? id.replace(/^wy-/, '') : utils.S4() + utils.S4());

            // Make sure id is unique
            if (_weavyIds.indexOf(id) !== -1) {
                id = generateId(id + utils.S4());
            }

            return id;
        }

        weavy.options.id = generateId(weavy.options.id);
        _weavyIds.push(weavy.options.id);

        // Logging

        this.console = new WeavyConsole(weavy.options.id, weavy.options.loggingColor, weavy.options.logging);

        this.log = this.console.log;
        this.debug = this.console.debug;
        this.warn = this.console.warn;
        this.error = this.console.error;
        this.info = this.console.info;

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
         * Data about the current user.
         * Use weavy.user.id to get the id of the user.
         * 
         * @category properties
         * @type {Object}
         */
        weavy.user = null;

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
         * True when weavy is loading options from the server.
         * 
         * @category properties
         * @type {boolean}
         */
        weavy.isLoading = false;

        /**
         * True when weavy has loaded options from the server.
         * 
         * @category properties
         * @type {boolean}
         */
        weavy.isLoaded = false;


        // DOM Elements

        /**
         * Placeholder for all DOM node references. Put any created elements or DOM related objects here.
         * 
         * @alias Weavy#nodes
         * @typicalname weavy.nodes
         */
        weavy.nodes = {}; // TODO: Use weakmap instead?

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

        /**
         * Container for all global overlay panels
         * 
         * @alias Weavy#nodes#panels
         * @type {Element}
         */
        weavy.nodes.panels = null;

        // WEAVY REALTIME CONNECTION
        weavy.connection = wvy.connection.get(weavy.options.url);

        // EVENT HANDLING
        weavy.events = new WeavyEvents(weavy);

        weavy.on = weavy.events.on;
        weavy.one = weavy.events.one;
        weavy.off = weavy.events.off;
        weavy.triggerEvent = weavy.events.triggerEvent;


        // PANELS
        weavy.panels = new WeavyPanels(weavy);

        weavy.on("before:build", function () {
            if (!weavy.nodes.panels) {
                weavy.nodes.panels = weavy.panels.createContainer();
                weavy.nodes.panels.classList.add("weavy-drawer")
            }
        });

        weavy.on("build", function () {
            weavy.nodes.overlay.appendChild(weavy.nodes.panels);
        });

        weavy.on("after:panel-open", function (e, open) {
            if (open.panels === weavy.nodes.panels) {
                weavy.nodes.panels.classList.add("weavy-drawer-in");
            }
        });

        weavy.on("after:panel-close", function (e, close) {
            if (close.panels === weavy.nodes.panels) {
                weavy.nodes.panels.classList.remove("weavy-drawer-in");
            }
        });

        // AUTHENTICATION
        weavy.authentication = new WeavyAuthentication(weavy, { jwt: weavy.options.jwt });


        // CONTEXTS

        weavy.spaces = new Array();

        /**
         * Set up weavy spaces
         */
        weavy.space = function (options) {
            var space;

            var isSpaceId = Number.isInteger(options);
            var isSpaceKey = typeof options === "string";
            var isSpaceConfig = $.isPlainObject(options);
            var spaceSelector = isSpaceConfig && options || isSpaceId && { id: options } || isSpaceKey && { key: options };

            if (spaceSelector) {
                try {
                    space = weavy.spaces.filter(function (ctx) { return ctx.match(spaceSelector) }).pop();
                } catch (e) {}

                if (!space) {
                    if (isSpaceConfig) {
                        space = new WeavySpace(weavy, options);
                        weavy.spaces.push(space);
                        $.when(weavy.authentication.whenAuthenticated, weavy.whenLoaded).then(function () {
                            space.fetchOrCreate();
                        });
                    } else {
                        weavy.warn("Space " + (isSpaceConfig ? JSON.stringify(spaceSelector) : options) + " does not exist." + (isSpaceId ? "" : " \n Use weavy.space(" + JSON.stringify(spaceSelector) + ") to create the space."))
                    }
                }
            }

            return space;
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
            var timeoutId;
            var whenTimeout = $.Deferred();

            _timeouts.push(timeoutId = setTimeout(function () { whenTimeout.resolve(); }, time));

            whenTimeout.catch(function () {
                clearTimeout(timeoutId);
            });

            return whenTimeout;
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

        function disconnect(async, notify) {
            weavy.log("disconnecting weavy");

            // NOTE: stop/disconnect directly if we are not authenticated 
            // signalr does not allow the user identity to change in an active connection
            return weavy.connection.disconnect(async, notify);
        }

        function connectAndLoad(fullReload, notify) {
            if (weavy.isLoaded) {
                weavy.whenLoaded = loadPromise();
            }
            if (fullReload === true) {
                weavy.isLoaded = false;
            }

            if (!weavy.isLoading) {
                weavy.isLoading = true;
                weavy.connection.init(true).then(function () {
                    weavy.options.href = window.location.href;
                    if (notify !== false) {

                        weavy.connection.invoke("client", "init", weavy.options).then(function (clientData) {
                            weavy.triggerEvent("clientdata", clientData);
                        }).catch(function (error) {
                            weavy.error("Weavy connectAndLoad client init", error.message, error);
                        });
                    }
                });
            }

            return weavy.whenLoaded;
        }


        var _roots = new Map();

        weavy.createRoot = function (container, id) {
            var rootId = weavy.getId(id);

            if (!container) {
                weavy.error("No container defined for createRoot", rootId);
                return;
            }
            if (_roots.has(rootId)) {
                weavy.warn("Root already created", rootId);
                return _roots.get(rootId);
            }

            var target = $(container)[0];
            target.classList.add("weavy");


            var rootContainer = document.createElement("div");
            rootContainer.className = "weavy-container " + weavy.options.className;
            rootContainer.setAttribute("data-version", weavy.options.version);
            rootContainer.id = weavy.getId("weavy-container-" + weavy.removeId(rootId));     

            var root = rootContainer;

            weavy.triggerEvent("before:create-root", { target: target, root: root, container: rootContainer, id: rootId });

            if (weavy.supportsShadowDOM) {
                target.classList.add("weavy-shadow");
                root = target.attachShadow({ mode: "closed" });
            }

            root.appendChild(rootContainer);

            weavy.triggerEvent("on:create-root", { target: target, root: root, container: rootContainer, id: rootId });
            weavy.triggerEvent("after:create-root", { target: target, root: root, container: rootContainer, id: rootId });

            _roots.set(rootId, { target: target, root: root, container: rootContainer, id: rootId });

            return { target: target, root: root, container: rootContainer, id: rootId };
        };

        weavy.getRoot = function (id) {
            return _roots.get(weavy.getId(id));
        }

        function frameStatusCheck() {
            if (!weavy.nodes.statusFrame) {
                // frame status checking
                weavy.nodes.statusFrame = document.createElement("iframe");
                weavy.nodes.statusFrame.className = "weavy-status-check weavy-hidden-frame";
                weavy.nodes.statusFrame.style.display = "none";
                weavy.nodes.statusFrame.id = weavy.getId("weavy-status-check");
                weavy.nodes.statusFrame.setAttribute("name", weavy.getId("weavy-status-check"));

                weavy.one(wvy.postal, "ready", weavy.getId("weavy-status-check"), function () {
                    weavy.isBlocked = false;
                    weavy.triggerEvent("frame-check", { blocked: false });
                });

                weavy.nodes.container.appendChild(weavy.nodes.statusFrame);
                weavy.timeout(1).then(function () {
                    weavy.nodes.statusFrame.src = weavy.data.statusUrl;
                    weavy.isBlocked = true;
                    try {
                        wvy.postal.registerContentWindow(weavy.nodes.statusFrame.contentWindow, weavy.getId("weavy-status-check"), weavy.getId("weavy-status-check"));
                    } catch (e) {
                        weavy.warn("Frame postMessage is blocked", e);
                        weavy.triggerEvent("frame-check", { blocked: true });
                    }

                });
            }

            return weavy.whenBlockChecked;
        }

        function initRoot() {
            // add container
            if (!weavy.getRoot()) {
                // append container to target element || html
                var rootSection = $(weavy.options.container)[0] || document.documentElement.appendChild(document.createElement("section"));

                var root = weavy.createRoot.call(weavy, rootSection);
                weavy.nodes.container = root.root;
                weavy.nodes.overlay = root.container;

                weavy.nodes.overlay.classList.add("weavy-overlay");
            }
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
            return id ? String(id).replace(new RegExp("-" + weavy.getId() + "$"), '') : id;
        };

        /**
         * Checks if the user is signed in. May chack against any optional provided data.
         * 
         * @category authentication
         * @returns {boolean} True if the user is signed in
         */
        weavy.isAuthenticated = function () {
            return weavy.authentication.userId && weavy.authentication.userId !== -1 ? true : false;
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
        weavy.registerWindowId = function (contentWindow, windowName) {
            try {
                wvy.postal.registerContentWindow(contentWindow, windowName, weavy.getId());
            } catch (e) {
                weavy.error("Could not send window id", windowName, e);
            }
        };

        /**
         * Maximizes or restores the size of current panel.
         * 
         * @category panels
         * @emits Weavy#resize
         */
        weavy.resize = function () {
            //$(weavy.nodes.container).toggleClass("weavy-wide");

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
            //$(weavy.nodes.container).addClass("weavy-wide");

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
            weavy.log("weavy.reload()")
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
        weavy.sendToFrame = function (frame, url, data, method) {
            // Todo: return complete promise instead
            return weavy.whenBlockChecked.then(function () {
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
         *   weavy.panels.addPanel("space" + result.id, result.url);
         *   weavy.panels.open("space" + result.id);
         * });
         *
         * // Search for a space
         * weavy.ajax("/api/search", { q: "My Space", et: "space"}).then(function(result) {
         *   console.log("Found " + result.count + " results");
         * });
         */
        weavy.ajax = function (url, data, method, settings, skipAuthenticationCheck) {
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

            if (!skipAuthenticationCheck) {
                // Wait for load to get auth state
                return weavy.whenLoaded.then(function () {
                    if (weavy.isAuthenticated()) {
                        // If signed in do ajax
                        return $.ajax(settings);
                    } else if (weavy.authentication) {
                        // If authentication plugin is active, show sign-in panel
                        return weavy.authentication.whenAuthenticated.then(function () {
                            // When signed-in, do ajax
                            return $.ajax(settings);
                        });
                    } else {
                        // Give up if not signed in and authentication plugin disabled (no sign-in panel)
                        return Promise.reject();
                    }
                });
            } else {
                // Skip the auth check and try ajax anyway
                return $.ajax(settings);
            }
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

            weavy.events.clear();
            clearTimeouts();

            _weavyIds.splice(_weavyIds.indexOf(weavy.getId()), 1);

            if (!keepConnection && _weavyIds.length === 0) {
                disconnect();
            }

            var root = weavy.getRoot();
            if (root) {
                $(root.container).remove();
                $(root.root).remove();
            }
            weavy.nodes.container = null;
            weavy.nodes.overlay = null;

            weavy.isLoaded = false;
        }

        // EVENTS

        // Register init before any plugins do
        weavy.on("init", function () {
            if (weavy.options.space) {
                weavy.options.spaces = weavy.options.space;
                weavy.warn("Using new Weavy({ space: ... }) is deprecated. Use new Weavy({ spaces: [...]}) instead.");
            }
            if (weavy.options.spaces) {
                var spaces = utils.asArray(weavy.options.spaces);

                spaces.forEach(function (spaceOptions) {
                    if (weavy.spaces.filter(function (space) { return space.match(spaceOptions); }).length === 0) {
                        weavy.spaces.push(new WeavySpace(weavy, spaceOptions));
                    }
                });
            }
            return connectAndLoad(true);
        });


        // MESSAGE EVENTS

        // listen for dispatched messages from weavy (close/resize etc.)
        weavy.on(wvy.postal, "signing-in", function (e) {
            var message = e.data;
            /**
             * Event triggered when signing in process has begun. The user is still not authenticated. The authentication may result in {@link Weavy#event:signed-in} or {@link Weavy#event:authentication-error}.
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @category events
             * @event Weavy#signing-in
             * @returns {Object}
             * @property {boolean} isLocal - Is the origin of the event from this weavy instance
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-in", { isLocal: typeof e.source !== "undefined" && (message.weavyId === true || message.weavyId === weavy.getId()) }));
        });

        weavy.on(wvy.postal, "signing-out", function (e) {
            var message = e.data;
            /**
             * Event triggered when signing out process has begun. Use this event to do signing out animations and eventually clean up your elements. It will be followed by {@link Weavy#event:signed-out}
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @category events
             * @event Weavy#signing-out
             * @returns {Object}
             * @property {boolean} isLocal - Is the origin of the event from this weavy instance
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-out", { isLocal: typeof e.source !== "undefined" && (message.weavyId === true || message.weavyId === weavy.getId()) }));
        });

        weavy.on(wvy.postal, "authentication-error", function (e) {
            /**
             * Event triggered when a sign-in attempt was unsuccessful.
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @category events
             * @event Weavy#authentication-error
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "authentication-error"));
        });


        weavy.on(wvy.postal, "message", function (message) {
            /**
                * THIS IS DEPRECATED. Use the weavy.on(wvy.postal, "message-name", function(e) { ... }); instead
                * 
                * Event for window messages directed to the current weavy instance, such as messages sent from panels belonging to the weavy instance.
                * The original message event is attached as event.originalEvent.
                * 
                * Use e.data.name to determine which type of message theat was receivied.
                * 
                * @deprecated
                * @category events
                * @event Weavy#message
                * @returns {Object.<string, data>}
                * @property {string} name - The name of the message
                * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage}
            */
            weavy.triggerEvent("message", message.data, message);
        });

        weavy.on(wvy.postal, "reload", weavy.getId(), function (message) {
            // reload and re-init all weavy instances
            weavy.log("reload recieved from postal, reconnecting and loading");
            //connectAndLoad(true);
        });

        weavy.on(wvy.postal, "reset", weavy.getId(), function (message) {
            var active = $(".weavy-panel.weavy-open", weavy.nodes.container); // TODO: use weavy.panelId?
            if (active.length) {
                weavy.reset(active.attr("data-id"));
            }
        });

        weavy.on(wvy.postal, "close", weavy.getId(), function (message) {
            weavy.close();
        });

        weavy.on(wvy.postal, "maximize", weavy.getId(), function (message) {
            weavy.maximize();
        });

        weavy.on(wvy.postal, "send", weavy.getId(), function (message) {
            weavy.load(message.data.panelId, message.data.url, message.data.data, message.data.method, true);
            weavy.open(message.data.panelId);
        });

        weavy.on(wvy.postal, "request:open", weavy.getId(), function (message) {
            if (message.data.panelId) {
                if (message.data.destination) {
                    weavy.load(message.data.panelId, message.data.destination, null, null, true);
                }
                weavy.open(message.data.panelId);
            }
        });

        weavy.on(wvy.postal, "request:close", weavy.getId(), function (message) {
            if (message.data.panelId) {
                weavy.close(message.data.panelId);
            }
        });

        // REALTIME EVENTS

        // signalR connection state has changed
        weavy.on(weavy.connection, "state-changed.connection", function (e, data) {
            if (disconnected && data.state === weavy.connection.states.connected && weavy.isAuthenticated()) {
                disconnected = false;

                weavy.debug("Connection state changed: connected and signed in => weavy.connection.reload()?")
                // reload weavy                
                //weavy.connection.reload();
            }
        });

        // signalR connection disconnected
        weavy.on(weavy.connection, "disconnected.connection", function (e, data) {
            if (!data.explicitlyDisconnected) {
                disconnected = true;
            }
        });

        weavy.on(weavy.connection, "user-change.connection", function (e, data) {
            weavy.log("user-change", data.state, "reconnecting and loading");

            weavy.user = data.user;

            // Connnect then trigger signed-in or signed-out
            var eventResult = weavy.triggerEvent("before:" + data.state);
            eventResult = eventResult !== false && weavy.triggerEvent("on:" + data.state);

            eventResult !== false && connectAndLoad(true).then(function () {
                weavy.triggerEvent("after:" + data.state);
            });
        });

        weavy.on(weavy.connection, "badge.weavy", function (e, data) {

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

        weavy.on("signing-out signed-out", function () {
            weavy.triggerEvent("badge", { conversations: 0, notifications: 0, total: 0});
        })

        weavy.on("clientdata", function (e, clientData) {

            // Merge options
            //weavy.data = weavy.extendDefaults(weavy.data, clientData, true);
            weavy.data = clientData;

            if (weavy.isAuthenticated() && clientData.spaces) {
                var spaces = utils.asArray(clientData.spaces);

                spaces.forEach(function (spaceData) {
                     var foundSpace = weavy.spaces.filter(function (ctx) { return ctx.match(spaceData) }).pop();
                    if (foundSpace) {
                        weavy.debug("Populating space data", spaceData.id);
                        foundSpace.data = spaceData;
                        foundSpace.configure();
                    }
                })
            }

            if (weavy.isLoaded === false) {
                initRoot.call(weavy);

                frameStatusCheck.call(weavy);

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
                 * weavy.on("build", function(e, root) {
                 *     if (weavy.isAuthenticated()) {
                 *         weavy.nodes.myElement = document.createElement("DIV");
                 *     }
                 * });
                 * 
                 * weavy.on("after:build", function(e, root) {
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

                weavy.isLoaded = true;
                weavy.triggerEvent("build", { container: weavy.nodes.container, overlay: weavy.nodes.overlay });


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

            weavy.isLoading = false;
            weavy.triggerEvent("processed:load");

        });

        // NAVIGATION
        weavy.navigation = new WeavyNavigation(weavy);

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
                filebrowser: true,
                preview: true,
                theme: true
            }
        },
        extended: {
            includePlugins: true
        },
        panel: {
            includePlugins: false,
            className: "weavy-frame",
            plugins: {
                filebrowser: true,
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
     * @property {string} [className=weavy-default] - Additional classNames added to weavy.
     * @property {string} [https=adaptive] - How to enforce https-links. <br>• **force** -  makes all urls https.<br>• **adaptive** -  enforces https if the calling site uses https.<br>• **default** - makes no change.
     * @property {boolean} [init=true] - Should weavy initialize automatically.
     * @property {boolean} [isMobile] - Indicates if the browser is mobile. Defaults to the RegExp expression <code>/iPhone&#124;iPad&#124;iPod&#124;Android/i.test(navigator.userAgent)</code>
     * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
     * @property {Element} [overlay] - Element to use for overlay purposes. May for instance use the overlay of another Weavy instance.
     * @property {string} url - The URL to the Weavy-installation to connect to.
     */
    Weavy.defaults = {
        container: null,
        className: "weavy-frame",
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


    // PROTOTYPE METHODS

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

    return Weavy;

}));

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

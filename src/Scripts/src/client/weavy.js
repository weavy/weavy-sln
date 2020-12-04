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
            './navigation',
            './utils',
            './console',
            './promise'
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
            require('./navigation'),
            require('./utils'),
            require('./console'),
            require('./promise')
        );
    } else {
        // Browser globals (root is window)
        root.Weavy = factory(
            jQuery,
            root.WeavyEvents,
            root.WeavyPanels,
            root.WeavySpace,
            root.WeavyNavigation,
            root.WeavyUtils,
            root.WeavyConsole,
            root.WeavyPromise
        );
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyEvents, WeavyPanels, WeavySpace, WeavyNavigation, utils, WeavyConsole, WeavyPromise) {
    console.debug("weavy.js");

    // DEFINE CUSTOM ELEMENTS AND STYLES

    /**
     * Three custom elements are used <weavy>, <weavy-root> and <weavy-container>
     * <weavy> can't be defined and acts only as a DOM placeholder.
     **/
    if ('customElements' in window) {
        try {
            window.customElements.define('weavy-root', HTMLElement.prototype);
            window.customElements.define('weavy-container', HTMLElement.prototype);
        } catch(e) { }
    } 

    // <weavy> and <weavy-root> should have no layout of their own.
    var weavyElementCSS = 'weavy, weavy-root { display: contents; }';

    // <weavy> and <weavy-root> gets layout only if needed 
    if (!('CSS' in window && CSS.supports('display', 'contents'))) {
        weavyElementCSS = 'weavy, weavy-root { display: flex; position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }';
    }

    // Prefer modern CSS registration
    if (document.adoptedStyleSheets) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(weavyElementCSS);
        document.adoptedStyleSheets = Array.prototype.concat.call(document.adoptedStyleSheets, [sheet]);
    } else {
        // Fallback CSS registration
        var elementStyleSheet = document.createElement("style");
        elementStyleSheet.type = "text/css";
        elementStyleSheet.styleSheet ? elementStyleSheet.styleSheet.cssText = weavyElementCSS : elementStyleSheet.appendChild(document.createTextNode(weavyElementCSS));

        document.getElementsByTagName("head")[0].appendChild(elementStyleSheet);
    }

    // WEAVY

    var _weavyIds = [];

    /**
     * All options are optional. You may use multiple Weavy.presets together with options when constructing a weavy instance. Multiple option sets are merged together.
     * 
     * If you want to connect to a specific server use the [url option]{@link Weavy#options}.
     * 
     * These option presets are available for easy configuration
     * * Weavy.presets.noplugins - Disable all plugins
     * * Weavy.presets.core - Use the minimal core plugin configuration without additional plugins.
     * 
     * @example
     * var weavy = new Weavy();
     * 
     * var devSettings = {
     *     logging: true
     * };
     * 
     * var coreDevWeavy = new Weavy(Weavy.presets.core, devSettings, { url: "http://myweavysite.dev" });
     * 
     * @class Weavy
     * @classdesc The core class for the Weavy client.
     * @param {...Weavy#options} options - One or multiple option sets. Options will be merged together in order.
     */

    var Weavy = function () {
        /** 
         * Reference to this instance
         * @lends Weavy#
         */
        var weavy = this;

        /**
         * Main options for Weavy. The JWT option is required.
         * When weavy initializes, it connects to the server and processes the options as well as using them internally. 
         * 
         * @see [Client Options]{@link https://docs.weavy.com/client/development/options}
         * @typedef 
         * @type {Object}
         * @member
         * @property {Element} [container] - Container where weavy should be placed. If no Element is provided, a &lt;weavy&gt; root is created next to the &lt;body&gt;-element.
         * @property {string} [className] - Additional classNames added to weavy.
         * @property {string} [https=adaptive] - How to enforce https-links. <br> • **force** -  makes all urls https.<br> • **adaptive** - enforces https if the calling site uses https.<br> • **default** - makes no change.
         * @property {string} [id] - An id for the instance. A unique id is always generated.
         * @property {string} jwt - The JWT token passed to {@link WeavyAuthentication}.
         * @property {boolean} [init=true] - Should weavy initialize automatically?
         * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
         * @property {string} [lang] - [Language code]{@link https://en.wikipedia.org/wiki/ISO_639-1} of preferred user interface language, e.g. <code>en</code> for English. When set, it must match one of your [configured languages]{@link https://docs.weavy.com/server/localization}.
         * @property {Object|boolean} [logging] - Options for console logging. Set to false to disable.
         * @property {string} [logging.color] - Hex color (#bada55) used for logging. A random color is generated as default.
         * @property {boolean} [logging.log] - Enable log messages in console.
         * @property {boolean} [logging.debug] - Enable debug messages in console.
         * @property {boolean} [logging.info] - Enable info messages in console.
         * @property {boolean} [logging.warn] - Enable warn messages in console.
         * @property {boolean} [logging.error] - Enable error messages in console.
         * @property {Object.<string, Object>} [plugins] - Properties with the name of the plugins to configure. Each plugin may be enabled or disabled by setting the options to true or false. Providing an Object instead of true will enable the plugin and pass options to the plugin. See the reference for each plugin for available options.
         * @property {boolean} [preload] - Start automatic preloading after load
         * @property {Array.<WeavySpace#options>} spaces - Array of space definititions with apps to initialize spaces directly at initialization. See {@link Weavy#space}.
         * @property {string} [tz] - Timezone identifier, e.g. <code>Pacific Standard Time</code>. When specified, this setting overrides the timezone setting on a user´s profile. The list of valid timezone identifiers can depend on the version and operating system of your Weavy server.
         * @property {string} [url] - The URL of the Weavy-installation to connect to. Defaults to the installation where the script came from.
         */
        weavy.options = weavy.extendDefaults(Weavy.defaults);

        // Extend default options with the passed in arguments
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

        /**
         * Class for wrapping native console logging.
         * - Options for turning on/off logging
         * - Optional prefix by id with color
         * 
         * @type {WeavyConsole}
         * @category logging
         * @borrows WeavyConsole#log as Weavy#log
         * @borrows WeavyConsole#debug as Weavy#debug
         * @borrows WeavyConsole#warn as Weavy#warn
         * @borrows WeavyConsole#error as Weavy#error
         * @borrows WeavyConsole#info as Weavy#info
         */
        weavy.console = new WeavyConsole(weavy.options.id, weavy.options.logging && weavy.options.logging.color, weavy.options.logging);

        weavy.log = weavy.console.log;
        weavy.debug = weavy.console.debug;
        weavy.warn = weavy.console.warn;
        weavy.error = weavy.console.error;
        weavy.info = weavy.console.info;

        // ID functions

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
         * The hardcoded semver version of the weavy-script.
         * @member {string} Weavy.version 
         */
        if (Weavy.version) {
            weavy.log(Weavy.version);
        }

        if (!weavy.options.url || weavy.options.url === "/") {
            weavy.error("Required url not specified.\nnew Weavy({ url: \"https://mytestsite.weavycloud.com/\" })");
        }

        /**
         * Data about the current user.
         * Use weavy.user.id to get the id of the user.
         * 
         * @category authentication
         * @type {Object}
         */
        weavy.user = null;


        /**
         * Client configuration data from the server. Based on what is passed in {@link Weavy#options} to the server and currently defined spaces.
         * 
         * @typedef
         * @type {Object}
         * @property {Array.<WeavySpace#data>} spaces - List of configured spaces.
         * @property {Object} plugins - Options for configured plugins.
         * @property {Object} [plugins.theme] - Options for the theme plugin
         * @property {string} plugins.theme.logo - Thumb URL for the global installation logo.
         * @property {string} plugins.theme.themeColor - Primary color for the theme in Hex color.
         * @property {string} plugins.theme.clientCss - The CSS for the client. Gets injected in weavy roots.
         * @property {string} status - Status of the server. Should be "ok".
         * @property {string} version - Semver string of the server version. Should match the script {@link Weavy.version}.
         **/
        weavy.data = null;

        /**
         * True when frames are blocked by Content Policy or the browser
         * 
         * @type {boolean}
         */
        weavy.isBlocked = false;

        /**
         * True when weavy is loading options from the server.
         * 
         * @type {boolean}
         */
        weavy.isLoading = false;

        /**
         * True when weavy has loaded options from the server.
         * 
         * @type {boolean}
         */
        weavy.isLoaded = false;


        // EVENT HANDLING

        /**
         * Instance of {@link WeavyEvents} which enables propagation and before and after phases for events.
         *
         * The event system provides event chaining with a bubbling mechanism that propagates all the way from the emitting child trigger to the weavy instance.
         * 
         * All events in the client have three phases; before, on and after. Each event phase is a prefix to the event name.
         * - The before:event-name is triggered in an early stage of the event cycle and is a good point to modify event data or cancel the event.
         * - The on:event-name is the normal trigger point for the event. It does not need to be prefixed when registering an event listener, you can simly use the event-name when you register a listener. This is the phase you normally use to register event listeners.
         * - The after:event-name is triggered when everything is processed. This is a good point to execute code that is dependent on that all other listers have been executed.
         * 
         * Cancelling an event by calling `event.stopPropagation()` will stop any propagation and cause all the following phases for the event to be cancelled.
         * 
         * @type {WeavyEvents}
         * @category eventhandling
         * @borrows WeavyEvents#on as Weavy#on
         * @borrows WeavyEvents#one as Weavy#one
         * @borrows WeavyEvents#off as Weavy#off
         * @borrows WeavyEvents#triggerEvent as Weavy#triggerEvent
         **/
        weavy.events = new WeavyEvents(weavy);
        weavy.on = weavy.events.on;
        weavy.one = weavy.events.one;
        weavy.off = weavy.events.off;
        weavy.triggerEvent = weavy.events.triggerEvent;


        // AUTHENTICATION & JWT

        /**
         * Reference to the instance of the WeavyAuthentication for the current server.
         * 
         * You always need to define a JWT provider in your {@link Weavy#options}. 
         * This may be a function that returns a JWT string or returns a promise that resolves a JWT string. 
         * The function will be called again whenever a new JWT token is needed.
         * You may also provide a JWT string directly, then you can't benifit from weavy requesting a new token when needed.
         * 
         * See [Client Authentication]{@link https://docs.weavy.com/client/authentication} for full authentication documentation.
         * 
         * @type {WeavyAuthentication}
         * @category authentication
         * @borrows WeavyAuthentication#setJwt as Weavy#authentication#setJwt
         * @borrows WeavyAuthentication#signIn as Weavy#authentication#signIn
         * @borrows WeavyAuthentication#signOut as Weavy#authentication#signOut
         */
        weavy.authentication = wvy.authentication.get(weavy.httpsUrl(weavy.options.url));

        if (weavy.options.jwt === undefined) {
            weavy.error("specify a jwt string or a provider function")
        }

        weavy.authentication.init(weavy.options.jwt);

        weavy.on(weavy.authentication, "user", function (e, auth) {
            weavy.user = auth.user;

            if (/^signed-in|signed-out|changed-user|user-error$/.test(auth.state)) {

                if (!weavy.isLoading) {
                    if (weavy.isLoaded) {
                        weavy.whenLoaded.reset();
                    }
                    weavy.isLoaded = false;
                    weavy.data = null;
                }


                if (auth.state === "changed-user") {
                    weavy.triggerEvent("signed-out", { id: -1 });
                    weavy.triggerEvent("signed-in", auth);
                } else {
                    weavy.triggerEvent(auth.state, auth);
                }

                // Refresh client data
                loadClientData();
            }
        });

        weavy.on(weavy.authentication, "signing-in", function (e) {
            /**
             * Triggered when the authentication process has started.
             * @event Weavy#signing-in
             * @category authentication
             */
            weavy.triggerEvent("signing-in");
        });

        weavy.on(weavy.authentication, "clear-user", function (e) {
            /**
             * Triggered when user data needs to be cleared. For example when a user is signing out.
             * @event Weavy#clear-user
             * @category authentication
             */
            weavy.triggerEvent("clear-user");
        });

        weavy.on(weavy.authentication, "authentication-error", function (e, error) {
            /**
             * Triggered when the authentication process was unsuccessful.
             * 
             * @event Weavy#authentication-error
             * @category authentication
             * @returns {Object}
             * @property {string} method - Which metod that was used to authenticate "jwt" or "panel"
             * @property {int} status - The HTTP error code from the server, like 401 for an unauthorized user
             * @property {string} message - The message from the server, like "Unauthorized"
             */
            weavy.triggerEvent("authentication-error", error);
        });

        // WEAVY REALTIME CONNECTION

        /**
         * Reference to the instance of the realtime connection to the server.
         * 
         * @type {WeavyConnection}
         **/
        weavy.connection = wvy.connection.get(weavy.httpsUrl(weavy.options.url));


        // PANELS

        /**
         * Placeholder for all DOM node references. Put any created elements or DOM related objects here.
         * 
         * @category panels
         * @namespace Weavy#nodes
         * @typicalname .nodes
         * @type {Object}
         * @property {Element} container - The main container under the root. This is where all common weavy Elements are placed.
         * @property {Element} overlay - Container for displaying elements that needs to be full viewport and on top of other elements.
         */
        weavy.nodes = {};
        weavy.nodes.container = null;
        weavy.nodes.overlay = null;


        /**
         * Placeholder for all panels.
         * 
         * @type {Object}
         * @category panels
         * @namespace Weavy#nodes#panels
         * @typicalname .nodes.panels
         **/
        weavy.nodes.panels = {};

        /**
         * Instance of the panel manager for all iframes in the weavy instance.
         * 
         * @type {WeavyPanels}
         * @category panels
         **/
        weavy.panels = new WeavyPanels(weavy);

        weavy.on("before:build", function () {
            if (!weavy.nodes.panels.drawer) {
                /**
                 * Side drawer panel container. Slides in/out automatically when a child panel is opened or closed. Attached to {@link Weavy#nodes#overlay}.
                 * 
                 * @type {WeavyPanels~container}
                 * @category panels
                 * @name Weavy#nodes#panels#drawer
                 **/
                weavy.nodes.panels.drawer = weavy.panels.createContainer();
                weavy.nodes.panels.drawer.classList.add("weavy-drawer");
                weavy.nodes.overlay.appendChild(weavy.nodes.panels.drawer);
            }

            if (!weavy.nodes.panels.preview) {
                /**
                 * Preview panel container. Attached to {@link Weavy#nodes#overlay}.
                 * 
                 * @type {WeavyPanels~container}
                 * @category panels
                 * @name Weavy#nodes#panels#preview
                 **/
                weavy.nodes.panels.preview = weavy.panels.createContainer();
                weavy.nodes.panels.preview.classList.add("weavy-preview");
                weavy.nodes.overlay.appendChild(weavy.nodes.panels.preview);
            }
        });

        weavy.on("after:panel-open", function (e, open) {
            if (open.panels === weavy.nodes.panels.drawer) {
                weavy.nodes.panels.drawer.classList.add("weavy-drawer-in");
            }
        });

        weavy.on("after:panel-close", function (e, close) {
            if (close.panels === weavy.nodes.panels.drawer) {
                weavy.nodes.panels.drawer.classList.remove("weavy-drawer-in");
            }
        });


        // SPACES

        /**
         * List of all current defined spaces as an Array.
         * @category spaces
         * @type {Array.<WeavySpace>}
         **/
        weavy.spaces = new Array();

        /**
         * Selects, fetches or creates a space in the weavy instance.
         *
         * The space needs to be defined using a space definition object containing at least a key, which will fetch or create the space on the server.
         * If the defined space already has been set up, the space will only be selected in the client.
         * After the space is defined it can be quickly selected in the client using only the id (int) or the key (string) of the space, 
         * which never will create nor fetch the space from the server.
         *
         * @example
         * // Define a space that will be fetched or created on the server
         * var space = weavy.space({ key: "mykey", name: "My Space" });
         *
         * // Select the newly defined space
         * var spaceAgain = weavy.space("mykey");
         * 
         * @category spaces
         * @function
         * @param {int|string|WeavySpace#options} options - space id, space key or space definition object.
         * @returns {WeavySpace}
         * @see {@link WeavySpace#options}
         */

        weavy.space = function (options) {
            var space;

            var isSpaceId = Number.isInteger(options);
            var isSpaceKey = typeof options === "string";
            var isSpaceConfig = $.isPlainObject(options);
            var spaceSelector = isSpaceConfig && options || isSpaceId && { id: options } || isSpaceKey && { key: options };

            if (spaceSelector) {
                try {
                    space = weavy.spaces.filter(function (s) { return s.match(spaceSelector) }).pop();
                } catch (e) {}

                if (!space) {
                    if (isSpaceConfig) {
                        space = new WeavySpace(weavy, options);
                        weavy.spaces.push(space);
                        $.when(weavy.authentication.whenAuthorized(), weavy.whenLoaded()).then(function () {
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

        /**
         * Clears all current timouts 
         **/
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
         * @function
         * @param {int} time=0 - Timeout in milliseconds
         * @returns {WeavyPromise}
         */
        weavy.timeout = function (time) {
            var timeoutId;
            var whenTimeout = new WeavyPromise();

            _timeouts.push(timeoutId = setTimeout(function () { whenTimeout.resolve(); }, time));

            whenTimeout.catch(function () {
                clearTimeout(timeoutId);
            });

            return whenTimeout;
        };

        // PROMISES

        /**
         * Promise that the blocking check has finished. Resolves when {@link Weavy#event:frame-check} is triggered.
         *
         * @example
         * weavy.whenReady().then(function() { ... })
         *
         * @category promises
         * @function
         * @returns {WeavyPromise}
         * @resolved when frames are not blocked.
         * @rejected when frames are blocked
         * */
        weavy.whenReady = new WeavyPromise();

        weavy.on("frame-check", function (e, framecheck) {
            framecheck.blocked ? weavy.whenReady.reject() : weavy.whenReady.resolve();
        });

        /**
         * Promise that weavy has recieved the after:load event
         *
         * @example
         * weavy.whenLoaded().then(function() { ... })
         *
         * @category promises
         * @function
         * @returns {WeavyPromise}
         * @resolved when init is called, the websocket has connected, data is received from the server and weavy is built and the load event has finished.
         */
        weavy.whenLoaded = new WeavyPromise();

        weavy.on("processed:load", function () {
            weavy.whenLoaded.resolve();
        });

        /**
         * Initializes weavy. This is done automatically unless you specify `init: false` in {@link Weavy#options}.
         * @param {Weavy#options} [options] Any new or additional options.
         * @emits Weavy#init
         * @returns {WeavyPromise}
         * @resolved When the weavy instance is initialized, ready and loaded.
         */
        weavy.init = function (options) {

            weavy.options = weavy.extendDefaults(weavy.options, options);

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

        function loadClientData() {
            if (!weavy.isLoading) {
                if (weavy.isLoaded) {
                    weavy.whenLoaded.reset();
                }

                weavy.isLoaded = false;
                weavy.isLoading = true;
 
                weavy.options.href = window.location.href;

                var authUrl = weavy.httpsUrl("/client/init", weavy.options.url);

                var initData = {
                    spaces: weavy.spaces.map(function (space) {
                        return space.options;
                    }),
                    plugins: weavy.options.plugins,
                    version: Weavy.version
                }

                if (weavy.options.lang) {
                    initData.lang = weavy.options.lang;
                }
                if (weavy.options.tz) {
                    initData.tz = weavy.options.tz;
                }

                weavy.ajax(authUrl, initData, "POST", null, true).then(function (clientData) {

                    /**
                     * Triggered when init data has been loaded from the server.
                     * 
                     * @event Weavy#clientdata
                     * @category events
                     * @returns {Weavy#data}
                     **/
                    weavy.triggerEvent("clientdata", clientData);
                });
            }
            return weavy.whenLoaded();
        }


        var _roots = new Map();

        /**
         * Creates an isolated shadow root in the DOM tree to place nodes in.
         * 
         * @param {Element|jQuery|string} parentSelector - The node to place the root in.
         * @param {string} id - Id of the root.
         * @emits Weavy#create-root
         * @returns {Weavy~root}
         */
        weavy.createRoot = function (parentSelector, id) {
            var supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

            var rootId = weavy.getId(id);

            if (!parentSelector) {
                weavy.error("No parent container defined for createRoot", rootId);
                return;
            }
            if (_roots.has(rootId)) {
                weavy.warn("Root already created", rootId);
                return _roots.get(rootId);
            }

            var parentElement = $(parentSelector)[0];

            var rootSection = document.createElement("weavy");

            rootSection.id = rootId;

            var rootDom = document.createElement("weavy-root");
            rootDom.setAttribute("data-version", Weavy.version);

            var rootContainer = document.createElement("weavy-container");
            rootContainer.className = "weavy-container";
            rootContainer.id = weavy.getId("weavy-container-" + weavy.removeId(rootId));     

            /**
             * Weavy shadow root to enable closed scopes in the DOM that also can be managed and removed.
             * The shadow root will isolate styles and nodes within the root.
             * 
             * Structure:
             * 
             * {parent} ➜ &lt;weavy/&gt; ➜ {ShadowDOM} ➜ {container}
             * 
             * @typedef Weavy~root 
             * @type {Object}
             * @property {Element} parent - The parent DOM node where the root is attached.
             * @property {Element} section - The &lt;weavy/&gt; node which is the placeholder for the root. Attached to the parent.
             * @property {ShadowDOM} root - The &lt;weavy-root/&gt; that is a closed ShadowDOM node. Attached to the section.
             * @property {Element} container - The &lt;weavy-container/&gt; where you safely can place elements. Attached to the root.
             * @property {string} id - The id of the root.
             * @property {function} remove() - Function to remove the root from the DOM.
             * @see https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
             **/
            var root = { parent: parentElement, section: rootSection, root: rootDom, container: rootContainer, id: rootId };

            // TODO: use returned/modified data
            weavy.triggerEvent("before:create-root", root);

            parentElement.appendChild(rootSection);
            rootSection.appendChild(rootDom);

            if (supportsShadowDOM) {
                root.root = rootDom = rootDom.attachShadow({ mode: "closed" });
            }
            rootDom.appendChild(rootContainer);

            /**
             * Triggered when a shadow root is created
             * 
             * @event Weavy#create-root
             * @returns {Weavy~root}
             **/
            weavy.triggerEvent("on:create-root", root);

            root.remove = function () {
                weavy.triggerEvent("before:remove-root", root);

                $(root.container).remove();
                $(root.section).remove();

                weavy.triggerEvent("on:remove-root", root);

                _roots.delete(rootId);

                weavy.triggerEvent("after:remove-root", root);
            };

            weavy.triggerEvent("after:create-root", root);

            _roots.set(rootId, root);

            return root;
        };

        /**
         * Get a Weavy shadow root by id.
         * 
         * @param {string} id - The id of the root.
         * @returns {Weavy~root}
         */
        weavy.getRoot = function (id) {
            return _roots.get(weavy.getId(id));
        }

        /**
         * Checks that frame communication is not blocked.
         **/
        function frameStatusCheck() {
            var statusUrl = "/client/ping";

            if (!weavy.nodes.statusFrame) {
                // frame status checking
                weavy.nodes.statusFrame = document.createElement("iframe");
                weavy.nodes.statusFrame.className = "weavy-status-check weavy-hidden";
                weavy.nodes.statusFrame.style.display = "none";
                weavy.nodes.statusFrame.id = weavy.getId("weavy-status-check");
                weavy.nodes.statusFrame.setAttribute("name", weavy.getId("weavy-status-check"));

                weavy.one(wvy.postal, "ready", { weavyId: weavy.getId(), windowName: weavy.getId("weavy-status-check") }, function () {
                    weavy.log("Frame status check", "√")
                    weavy.isBlocked = false;

                    /**
                     * Triggered when the frame check is done.
                     * 
                     * @event Weavy#frame-check
                     * @returns {Object}
                     * @property {boolean} blocked - Whether iframes communication is blocked or not.
                     * @resolves {Weavy#whenReady}
                     **/
                    weavy.triggerEvent("frame-check", { blocked: false });
                });

                weavy.nodes.container.appendChild(weavy.nodes.statusFrame);
                weavy.timeout(1).then(function () {
                    weavy.nodes.statusFrame.src = weavy.httpsUrl(statusUrl, weavy.options.url);
                    weavy.isBlocked = true;

                    try {
                        wvy.postal.registerContentWindow(weavy.nodes.statusFrame.contentWindow, weavy.getId("weavy-status-check"), weavy.getId());
                    } catch (e) {
                        weavy.warn("Frame postMessage is blocked", e);
                        weavy.triggerEvent("frame-check", { blocked: true });
                    }
                });
            }

            return weavy.whenReady();
        }

        /**
         * Creates the general weavy root where overlays etc are placed.
         **/
        function initRoot() {
            // add container
            if (!weavy.getRoot()) {
                // append container to target element || html
                var rootParent = $(weavy.options.container)[0] || document.documentElement;

                var root = weavy.createRoot.call(weavy, rootParent);
                weavy.nodes.container = root.root;
                weavy.nodes.overlay = root.container;

                weavy.nodes.overlay.classList.add("weavy-overlay");
            }
        }


        // PUBLIC METHODS


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
        weavy.ajax = function (url, data, method, settings, allowAnonymous) {
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
                dataFilter: function (data, dataType) {
                    return dataType === "json" ? JSON.stringify(utils.keysToCamel(JSON.parse(data))) : data;
                },
                xhrFields: {
                    withCredentials: true
                },
                headers: {
                    // https://stackoverflow.com/questions/8163703/cross-domain-ajax-doesnt-send-x-requested-with-header
                    "X-Requested-With": "XMLHttpRequest"
                }
            }, settings, true);

            var whenAuthenticated = allowAnonymous ? weavy.authentication.whenAuthenticated : weavy.authentication.whenAuthorized;

            return whenAuthenticated().then(function () {
                return weavy.authentication.getJwt().then(function (token) {
                    var whenAjax = new WeavyPromise();

                    if (typeof token === "string") {
                        // JWT configured, use bearer token
                        settings.headers.Authorization = "Bearer " + token;
  
                        $.ajax(settings).then(
                            function (data, textStatus, jqXHR) {
                                whenAjax.resolve(data, textStatus, jqXHR);
                            },
                            function (jqXHR, textStatus, errorThrown) {
                                if (jqXHR.status === 401) {
                                    weavy.warn("weavy.ajax: JWT failed, trying again");
                                    return weavy.authentication.getJwt(true).then(function (token) {
                                        // new bearer token
                                        settings.headers.Authorization = "Bearer " + token;
                                        $.ajax(settings).then(
                                            function (data, textStatus, jqXHR) {
                                                whenAjax.resolve(data, textStatus, jqXHR);
                                            },
                                            function (jqXHR, textStatus, errorThrown) {
                                                whenAjax.reject(jqXHR, textStatus, errorThrown);
                                            }
                                        );
                                    })
                                } else {
                                    weavy.error("weavy.ajax: authenticate with JWT token failed", textStatus, jqXHR.responseJSON && jqXHR.responseJSON.message ? "\n" + jqXHR.responseJSON.message : errorThrown);
                                    whenAjax.reject(jqXHR, textStatus, errorThrown);
                                }
                            }
                        );
                    } else {
                        // JWT not configured, try without bearer token
                        $.ajax(settings).then(
                            function (data, textStatus, jqXHR) {
                                whenAjax.resolve(data, textStatus, jqXHR);
                            },
                            function (jqXHR, textStatus, errorThrown) {
                                whenAjax.reject(jqXHR, textStatus, errorThrown);
                            }
                        );
                    }

                    return whenAjax();
                });
            });
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

            _roots.forEach(function (root) {
                root.remove();
            });


            // Unregister all content windows
            try {
                wvy.postal.unregisterAll(weavy.getId());
            } catch (e) {
                weavy.warn("weavy.destroy: could not unregister postal content windows")
            }

            // Delete everything in the instance
            for (var prop in weavy) {
                if (Object.prototype.hasOwnProperty.call(weavy, prop)) {
                    delete weavy[prop];
                }
            }
        }

        // EVENTS

        // Register init before any plugins do
        weavy.on("init", function () {

            // Prepopulate spaces
            if (weavy.options.spaces) {
                var spaces = utils.asArray(weavy.options.spaces);

                spaces.forEach(function (spaceOptions) {
                    if (weavy.spaces.filter(function (space) { return space.match(spaceOptions); }).length === 0) {
                        weavy.spaces.push(new WeavySpace(weavy, spaceOptions));
                    }
                });
            }

            return loadClientData().then(function () {
                var wFrameStatusCheck = frameStatusCheck.call(weavy);
                var wConnectionInit = weavy.connection.init(true, weavy.authentication);
                return $.when(wFrameStatusCheck, wConnectionInit);
            });
        });


        // REALTIME EVENTS

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
             * @event Weavy#badge
             * @category events
             * @returns {Object}
             * @property {int} conversations - Number of unread conversations
             * @property {int} notifications - Number of unread notifications
             * @property {int} total - The total number of unread conversations and notifications.
             */
            weavy.triggerEvent("badge", data);
        });

        weavy.on("clear-user signed-out", function () {
            weavy.triggerEvent("badge", { conversations: 0, notifications: 0, total: 0 });
        })

        weavy.on("clientdata", function (e, clientData) {

            // Merge options
            //weavy.data = weavy.extendDefaults(weavy.data, clientData, true);
            weavy.data = clientData;

            if (weavy.authentication.isAuthorized() && clientData.spaces) {
                var spaces = utils.asArray(clientData.spaces);

                spaces.forEach(function (spaceData) {
                    var foundSpace = weavy.spaces.filter(function (space) { return space.match(spaceData) }).pop();
                    if (foundSpace) {
                        weavy.debug("Populating space data", spaceData.id);
                        foundSpace.data = spaceData;
                        foundSpace.configure();
                    }
                })
            }

            // Do a script version mismatch check
            if (Weavy.version !== weavy.data.version) {
                weavy.error("Weavy client/server version mismatch! \nclient: " + Weavy.version + " \nserver: " + weavy.data.version);
            }

            if (weavy.isLoaded === false) {
                initRoot.call(weavy);

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
                    * Often it's a good idea to check if the user is signed-in using {@link WeavyAuthentication#isAuthenticated} unless you're building something that doesn't require a signed in user.
                    *
                    * @example
                    * weavy.on("build", function(e, root) {
                    *     if (weavy.authentication.isAuthorized()) {
                    *         weavy.nodes.myElement = document.createElement("DIV");
                    *     }
                    * });
                    * 
                    * weavy.on("after:build", function(e, root) {
                    *     if (weavy.authentication.isAuthorized()) {
                    *         if (weavy.nodes.overlay) {
                    *             weavy.nodes.overlay.appendChild(weavy.nodes.myElement);
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
                    *     if (weavy.authentication.isAuthorized()) {
                    *         weavy.alert("Client successfully loaded");
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
                if (Object.prototype.hasOwnProperty.call(_unsortedDependencies, pluginName)) {
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

                    if (Object.prototype.hasOwnProperty.call(_unsortedDependencies, pluginName)) {
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
     * // Load the minimal weavy core without any additional plugins.
     * var weavy = new Weavy(Weavy.presets.core, { url: "https://myweavysite.com" });
     * 
     * @name Weavy.presets
     * @type {Object}
     * @property {Weavy#options} Weavy.presets.noplugins - Disable all plugins.
     * @property {Weavy#options} Weavy.presets.core - Enable all core plugins only.
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
        }
    };

    /**
     * Default options. These options are general for all Weavy instances and may be overridden in {@link Weavy#options}. 
     * You may add any general options you like here. The url is always set to the installation where your weavy.js was generated.
     * 
     * @example
     * // Defaults
     * Weavy.defaults = {
     *     container: null,
     *     className: "",
     *     https: "adaptive",
     *     init: true,
     *     includePlugins: true,
     *     preload: true,
     *     url: "/"
     * };
     * 
     * // Set a general url to connect all weavy instances to
     * Weavy.defaults.url = "https://myweavysite.com";
     * var weavy = new Weavy();
     *
     * @type {Object}
     * @name Weavy.defaults
     * @property {Element} [container] - Container where weavy should be placed. If no Element is provided, a &lt;section&gt; is created next to the &lt;body&gt;-element.
     * @property {string} [className=weavy-default] - Additional classNames added to weavy.
     * @property {string} [https=adaptive] - How to enforce https-links. <br>• **force** -  makes all urls https.<br>• **adaptive** -  enforces https if the calling site uses https.<br>• **default** - makes no change.
     * @property {boolean} [init=true] - Should weavy initialize automatically.
     * @property {boolean} [includePlugins=true] - Whether all registered plugins should be enabled by default. If false, then each plugin needs to be enabled in plugin-options.
     * @property {boolean} [preload] - Start automatic preloading after load
     * @property {string} url - The URL to the Weavy-installation to connect to.
     */
    Weavy.defaults = {
        container: null,
        https: "adaptive", // force, adaptive or default 
        init: true,
        includePlugins: true,
        preload: true,
        url: "/"
    };


    /**
     * Placeholder for registering plugins. Plugins must be registered and available here to be accessible and initialized in the Weavy instance. Register any plugins after you have loaded weavy.js and before you create a new Weavy instance.
     * 
     * @name Weavy.plugins
     * @type {Object.<string, plugin>}
     */
    Weavy.plugins = {};

    /**
     * Id list of all created instances.
     * @name Weavy.instances
     * @type {string[]}
     */
    Object.defineProperty(Weavy, 'instances', {
        get: function () { return _weavyIds.slice(); },
        configurable: false
    });


    // PROTOTYPE METHODS

    /**
     * Method for extending options. It merges together options. If the recursive setting is applied it will merge any plain object children. Note that Arrays are treated as data and not as tree structure when merging. 
     * 
     * The original options passed are left untouched. {@link Weavy.httpsUrl} settings is applied to all url options.
     * 
     * @name Weavy#extendDefaults
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
            if (Object.prototype.hasOwnProperty.call(source, property)) {
                copy[property] = source[property];
            }
        }

        // Apply properties to copy
        for (property in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, property)) {
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
     * @name Weavy#httpsUrl
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

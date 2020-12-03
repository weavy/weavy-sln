/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './panels',
            './utils',
            './promise'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./panels'),
            require('./utils'),
            require('./promise')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyApp = factory(jQuery, root.WeavyPanels, root.WeavyUtils, root.WeavyPromise);
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyPanels, utils, WeavyPromise) {
    console.debug("app.js");

    /**
     * @class WeavyApp
     * @classdesc Base class for representation of apps in Weavy.
     * @example
     * var app = weavy.space(...).app({ key: "myapp1", type: "posts" });
     */

    /**
     * This class is automatically instantiated when defining apps in weavy. 
     * All the methods and properties are accessible in each instance. 
     * The passed options will fetch the app or create it.
     * 
     * @constructor
     * @hideconstructor
     * @param {Weavy} weavy - Weavy instance the app belongs to
     * @param {WeavySpace} space - Weavy Space the app belongs to
     * @param {WeavyApp#options} options - App options
     * @param {Object} [data] - Initial data belonging to the app
     */
    var WeavyApp = function (weavy, space, options, data) {

        weavy.log("new WeavyApp", options);

        /** 
         * Reference to this instance
         * @lends WeavyApp#
         */
        var app = this;

        /** 
         * The container passed in from {@link WeavyApp#options}.
         * @category properties
         * @type {Element|jQuery|string}
         */
        app.container = null;

        /** 
         * The root object for the container of the app. 
         * @category properties
         * @type {Object}
         * @property {Element} container - The inner container to put nodes in.
         * @property {string} id - The id of the root
         * @property {Element} parent - The element defined in options to contain the app.
         * @property {ShadowRoot} root - The isolated ShadowRoot in the section.
         * @property {Element} section - The &lt;weavy&gt;-section within the parent.
         * @property {Function} remove() - Method for removing the root from the DOM.
         */
        app.root = null;

        /** 
         * The Panel displaying the app.
         * @category properties
         * @type {WeavyPanel}
         */
        app.panel = null;

        /**
         * The url of the app, received from app data.
         * @category properties
         * @type {string}
         */
        app.url = null;

        /**
         * The server id of the app, received from app data.
         * @category properties
         * @type {int}
         */
        app.id = null;

        /**
         * The name of the app, defined in options or received from app data.
         * @category properties
         * @type {string}
         */
        app.name = null;

        /**
         * The key of the app, defined in options or recieved from app data.
         * @category properties
         * @type {string}
         */
        app.key = null;

        /**
         * The guid of the app type. May also be used to define the app type in options.
         * @category properties
         * @type {string}
         */
        app.guid = null;

        /** 
         * The short readable type of the app, such as "files" .
         * @category properties
         * @type {string}
         */
        app.type = null;

        /** 
         * The full type name of the app, such as "Weavy.Core.Models.Files".
         * @category properties
         * @type {string}
         */
        app.typeName = null;

        /** 
         * Will the app open automatically when loaded? Defaults to true. 
         * @see WeavyApp#options
         * @category properties
         * @type {boolean}
         */
        app.autoOpen = null;

        /**
         * The {@link Weavy} instance the app belongs to.
         * @category properties
         * @type {Weavy}
         */
        app.weavy = weavy;

        /**
         * The {@link WeavySpace} the app belongs to.
         * @category properties
         * @type {WeavySpace}
         */
        app.space = space;

        /**
         * Options for defining the app. Key and type is required.
         * 
         * @example
         * space.app({
         *   key: "mykey",
         *   name: "Posts",
         *   type: "posts",
         *   container: "#myappcontainer",
         *   open: false,
         *   controls: true
         * });
         * 
         * @category options
         * @typedef
         * @member
         * @type {Object}
         * @property {int} id - The server id of the app. Usually only used to reference a specific app on the server.
         * @property {string} key - The id representing the app in the context environment.
         * @property {string} name - The display name of the app.
         * @property {boolean} open - Should the app panel open automatically? Looks for the {@link WeavySpace#options} if not defined. Defaults to true unless space.options.tabbed is true
         * @property {Element|jQuery|string} container - The container where the app should be placed.
         * @property {string} type - The kind of app. <br> • posts <br> • files <br> • messenger <br> • search <br> • tasks <br> • notifications <br> • posts <br> • comments
         * @property {boolean} controls - Show or hide the panel controls. Defaults to false unless space.options.controls is true.
         */
        app.options = options;

        /**
         * The server data for the app.
         * 
         * @example
         * {
		 *   id: 2136,
		 *   guid: "523edd88-4bbf-4547-b60f-2859a6d2ddc1",
		 *   key: "files",
		 *   name: "Files",
		 *   url: "/e/apps/2136",
		 *   typeName: "Weavy.Core.Models.Files",
		 *   options: {
		 *     key: "files",
		 *     type: "files"
         *   }
		 * }
         * 
         * @category properties
         * @typedef
         * @member
         * @type {Object}
         * @property {int} id - The server id for the app.
         * @property {string} key - The client key for the app.
         * @property {string} guid - The GUID for the app type.
         * @property {string} name - User readable title for the app.
         * @property {string} url - The base url to the app.
         * @property {string} typeName - The full app type, e.g. "Weavy.Core.Models.Posts"
         * @property {WeavyApp#options} [options] - Any app definition passed to the server. Should match {@link WeavyApp#options}.
         */
        app.data = data;

        // EVENT HANDLERS

        /** 
         * The parent which the events bubbles to.
         * @category events
         * @type {WeavySpace}
         * @ignore
         */
        app.eventParent = space;

        /**
         * Event listener registration for the specific app. Only recieves events that belong to the app.
         * 
         * @category events
         * @function
         * @example
         * weavy.space("myspace").app("myapp").on("open", function(e) { ... })
         */
        app.on = weavy.events.on.bind(app);

        /**
         * One time event listener registration for the specific app. Is only triggered once and only recieves events that belong to the app.
         *
         * @category events
         * @function
         * @example
         * weavy.space("myspace").app("myapp").one("open", function(e) { ... })
         */
        app.one = weavy.events.one.bind(app);

        /**
         * Event listener unregistration for the specific app.
         * 
         * @category events
         * @function
         * @example
         * weavy.space("myspace").app("myapp").off("open", function(e) { ... })
         */
        app.off = weavy.events.off.bind(app);

        /**
         * Triggers events on the specific app. The events will also bubble up to the space and then the weavy instance.
         *
         * @category events
         * @function
         * @example
         * weavy.space("myspace").app("myapp").triggerEvent("myevent", [eventData])
         */
        app.triggerEvent = weavy.events.triggerEvent.bind(app);

        /** 
         * Is the app currently open? Returns the open status of the app panel.
         * @category properties
         * @member isOpen
         * @memberof WeavyApp#
         * @type {boolean}
         */
        Object.defineProperty(this, "isOpen", {
            get: function () {
                weavy.log("isOpen", app.panel, app.panel && app.panel.isOpen);
                return app.panel ? app.panel.isOpen : false;
            }
        });

        /**
         * Has the app loaded?
         * @category properties
         * @type {boolean}
         */
        app.isLoaded = false;

        /**
         * Is the app built? 
         * @category properties
         * @type {boolean}
         */
        app.isBuilt = false;

        /**
         * Promise that resolves when the app is loaded.
         * 
         * @category promises
         * @type {WeavyPromise}
         */
        app.whenLoaded = new WeavyPromise();

        /**
         * Promise that resolves when the app is built.
         * 
         * @category promises
         * @type {WeavyPromise}
         */
        app.whenBuilt = new WeavyPromise();

        /**
         * Configure the app with options or data. If the app has data it will also be built. 
         * Currently existing options are extended with new options.
         * Data will resolve {@link WeavyApp#whenLoaded} promise.
         * 
         * @category methods
         * @function
         * @param {WeavyApp#options} options
         * @param {WeavyApp#data} data
         * @resolves {WeavyApp#whenLoaded}
         */
        app.configure = function (options, data) {
            if (options && typeof options === "object") {
                app.options = app.weavy.extendDefaults(app.options, options, true);
            }

            if (data && typeof data === "object") {
                app.data = data;
            }

            if (app.options && typeof app.options === "object") {
                if (app.autoOpen === null || app.container === null) {
                    app.autoOpen = app.options && app.options.open !== undefined ? app.options.open : (space && space.options && space.options.open !== undefined ? space.options.open : (space && !space.tabbed || false));
                    app.container = app.options.container;
                }

                if (app.id === null && app.options.id) {
                    app.id = app.options.id;
                }

                if (app.key === null && app.options.key) {
                    app.key = app.options.key;
                }

                if (app.name === null && app.options.name) {
                    app.name = app.options.name;
                }

                if (app.type === null && app.options.type) {
                    app.type = app.options.type;
                }
            }

            if (app.data && typeof app.data === "object") {
                app.id = app.data.id;
                app.name = app.data.name;
                app.typeName = app.data.typeName;
                app.guid = app.data.guid;

                app.url = app.data.url;

                // Check if app.data needs to be added in space.data.apps
                if (app.space.data && app.space.data.apps) {
                    var dataApps = utils.asArray(app.space.data.apps);

                    var foundAppData = dataApps.filter(function (appData) { return app.match(appData) }).pop();
                    if (!foundAppData) {
                        // Add to space data
                        app.space.data.apps.push(app.data);
                    }
                }

                app.isLoaded = true;
                app.whenLoaded.resolve(app.data);

                if (!app.isBuilt && app.weavy.isLoaded) {
                    app.build();
                }
            }
        }


        /**
         * Sets options and fetches (or creates) the app on the server. Options will replace existing options.
         * When data is fetched, the {@link WeavyApp#whenLoaded} promise is resolved.
         * 
         * @category methods
         * @function
         * @param {WeavyApp#options} [options] - Optional new app options
         * @returns {WeavyApp#whenLoaded}
         * @resolves {WeavyApp#whenLoaded}
         */
        app.fetchOrCreate = function (options) {

            if (options && typeof options === "object") {
                app.options = options;
            }

            if (app.options && typeof app.options === "object") {

                var initAppUrl = weavy.httpsUrl("/client/app", weavy.options.url);

                var optionsWithSpace = weavy.extendDefaults({ space: space.id || space.key }, app.options);

                weavy.ajax(initAppUrl, optionsWithSpace, "POST").then(function (data) {
                        app.data = data;
                        app.configure.call(app);
                    }).catch(function (xhr, status, error) {
                        app.weavy.error("WeavyApp.fetchOrCreate()", xhr.responseJSON && xhr.responseJSON.message || xhr);
                        app.whenLoaded.reject(xhr.responseJSON && xhr.responseJSON.message || xhr);
                    });
            } else {
                app.whenLoaded.reject(new Error("WeavyApp.fetchOrCreate() requires options"));
            }

            return app.whenLoaded();
        }


        /**
         * Converts panel events to app events. Copies all the data from the panel event to the app event. 
         * Set it as an eventhandler to trigger a new event while passing along event data.
         * 
         * @ignore
         * @function
         * @param {string} eventName - The name of the event to trigger.
         * @param {string} panelId - The id of the panel
         * @param {any} triggerData - The additional data to add to the event.
         * @param {Event} e - The panel event.
         * @param {any} data - The data from the panel event.
         */
        function bridgePanelEvent(eventName, panelId, triggerData, e, data) {
            if (data.panelId === panelId) {
                for (var tProp in triggerData) {
                    if (Object.prototype.hasOwnProperty.call(data, tProp)) {
                        triggerData[tProp] = data[tProp];
                    }
                }
                var eventResult = app.triggerEvent(eventName, triggerData);
                if (eventResult === false) {
                    return false;
                } else if (eventResult) {
                    for (var dProp in data) {
                        if (Object.prototype.hasOwnProperty.call(eventResult, dProp)) {
                            data[dProp] = eventResult[dProp];
                        }
                    }
                    return data;
                }
            }
        }

        /**
         * Builds the app. Creates a shadow root and a panel. Is executed on the {@link Weavy#event:build} event.
         * 
         * @category methods
         * @function
         * @resolves {WeavyApp#whenBuilt}
         */
        app.build = function () {
            // TODO: return whenBuilt promise
            weavy.authentication.whenAuthorized().then(function () {
                var root = app.root || app.space && app.space.root;

                if (app.options && app.data) {
                    if (!root && app.container) {
                        try {
                            app.root = root = weavy.createRoot(app.container, "app-" + app.id);
                            root.container.panels = weavy.panels.createContainer("app-container-" + app.id);
                            root.container.panels.eventParent = app;
                            root.container.appendChild(root.container.panels);
                        } catch (e) {
                            weavy.log("could not create app in container");
                        }
                    }

                    if (!app.isBuilt && root) {
                        app.isBuilt = true;
                        weavy.debug("Building app", app.id);
                        var panelId = "app-" + app.id;
                        var controls = app.options && app.options.controls !== undefined ? app.options.controls : (app.space.options && app.space.options.controls !== undefined ? app.space.options.controls : false);
                        app.panel = root.container.panels.addPanel(panelId, app.url, { controls: controls });

                        /**
                         * Triggered when the app panel is opened.
                         * 
                         * @category events
                         * @event WeavyApp#open
                         * @returns {Object}
                         * @property {WeavySpace} space - The space that the app belongs to
                         * @property {WeavyApp} app - The app that fires the event
                         * @extends WeavyPanel#event:panel-open
                         */
                        weavy.on("panel-open", bridgePanelEvent.bind(app, "open", panelId, { space: app.space, app: app, destination: null }));

                        /**
                         * Triggered when the app panel is toggled. Is always followed by either {@link WeavyApp#event:open} event or {@link WeavyApp#event:close} event.
                         * 
                         * @category events
                         * @event WeavyApp#toggle
                         * @returns {Object}
                         * @property {WeavySpace} space - The space that the app belongs to
                         * @property {WeavyApp} app - The app that fires the event
                         * @extends WeavyPanel#event:panel-toggle
                         */
                        weavy.on("panel-toggle", bridgePanelEvent.bind(app, "toggle", panelId, { space: app.space, app: app, destination: null }));

                        /**
                         * Triggered when the app panel is closed.
                         * 
                         * @category events
                         * @event WeavyApp#close
                         * @returns {Object}
                         * @property {WeavySpace} space - The space that the app belongs to
                         * @property {WeavyApp} app - The app that fires the event
                         * @extends WeavyPanel#event:panel-close
                         */
                        weavy.on("panel-close", bridgePanelEvent.bind(app, "close", panelId, { space: app.space, app: app }));

                        app.whenBuilt.resolve();
                    }
                }

            })
        };

        weavy.on("build", app.build.bind(app));

        // Opens the app automatically after build
        app.whenBuilt().then(function () {
            if (app.autoOpen) {
                app.open();
            }
        });

        weavy.on("after:signed-in", function () {
            if (app.autoOpen) {
                // Reopen on sign in
                app.open();
            }
        });

        app.configure();
    };

    /**
     * Opens the app panel and optionally loads a destination url after waiting for {@link WeavyApp#whenBuilt}.
     * If the space is {@link WeavySpace#tabbed} it also closes the other apps in the space.
     * 
     * @category panels
     * @function WeavyApp#open
     * @param {string} [destination] - Destination url to navigate to on open
     * @returns {external:Promise}
     */
    WeavyApp.prototype.open = function (destination) {
        var app = this;
        var weavy = app.weavy;
        var whenBuiltAndLoaded = $.when(app.whenBuilt(), weavy.whenLoaded());
        return whenBuiltAndLoaded.then(function () {
            var openPromises = [app.panel.open(destination)];

            // Sibling apps should be closed if the space is a tabbed space
            if (app.space && app.space.tabbed) {
                Array.from(app.space.apps || []).forEach(function (spaceApp) {
                    if (spaceApp !== app) {
                        openPromises.push(spaceApp.panel.close(true));
                    }
                });
            }

            return Promise.all(openPromises);
        });
    }

    /**
     * Closes the app panel.
     * 
     * @category panels
     * @function WeavyApp#close
     * @returns {external:Promise}
     * */
    WeavyApp.prototype.close = function () {
        var app = this;
        app.autoOpen = false;
        return app.whenBuilt().then(function () {
            return app.panel.close();
        });
    }

    /**
     * Toggles the app panel open or closed. It optionally loads a destination url on toggle open.
     * If the space is {@link WeavySpace#tabbed} it also closes the other apps in the space.
     * 
     * @category panels
     * @function WeavyApp#toggle
     * @param {string} [destination] - Destination url to navigate to on open
     * @returns {external:Promise}
     */
    WeavyApp.prototype.toggle = function (destination) {
        var app = this;

        return app.whenBuilt().then(function () {
            var isOpen = app.panel.isOpen;
            var togglePromises = [app.panel.toggle(destination)];

            // Sibling apps should be closed if the space is a tabbed space
            if (!isOpen && app.space && app.space.tabbed) {
                Array.from(app.space.apps || []).forEach(function (spaceApp) {
                    if (spaceApp !== app) {
                        togglePromises.push(spaceApp.panel.close(true));
                    }
                });
            }

            return Promise.all(togglePromises);
        });
    }

    /**
     * Removes the app in the client and the DOM. The app will not be removed on the server and can be added and fetched at any point again.
     * 
     * @category methods
     * @function WeavyApp#remove
     * @returns {external:Promise}
     */
    WeavyApp.prototype.remove = function () {
        var app = this;
        var space = this.space;
        var weavy = this.weavy;

        weavy.debug("Removing app", app.id);

        var whenPanelRemoved = app.panel ? app.panel.remove() : Promise.resolve();

        var whenRemoved = whenPanelRemoved.then(function () {
            var appRoot = weavy.getRoot("app-" + app.id);
            if (appRoot) {
                appRoot.remove();
            }
        });

        space.apps = space.apps.filter(function (a) { return !a.match(app) });

        return whenRemoved;
    }

    /**
     * Check if another app or an object is matching this app. It checks for a match of the id property or the key property.
     * 
     * @category methods
     * @function WeavyApp#match
     * @param {WeavyApp|Object} options
     * @param {int} [options.id] - Optional id to match.
     * @param {string} [options.key] - Optional key to match.
     * @returns {boolean} 
     */
    WeavyApp.prototype.match = function (options) {
        if (options) {
            if (options.id && this.id) {
                return options.id === this.id
            }

            if (options.key && this.key) {
                return utils.ciEq(options.key, this.key);
            }
        }

        return false;
    };

    return WeavyApp;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

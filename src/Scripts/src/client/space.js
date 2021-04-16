/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            './app',
            '../utils',
            '../promise'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('./app'),
            require('../utils'),
            require('../promise')
        );
    } else {
        // Browser globals (root is window)
        root.WeavySpace = factory(
            root.WeavyApp,
            root.WeavyUtils,
            root.WeavyPromise
        );
    }
}(typeof self !== 'undefined' ? self : this, function (WeavyApp, utils, WeavyPromise) {
    console.debug("space.js");

    /**
     * @class WeavySpace
     * @classdesc Base class for representation of spaces in Weavy.
     * @example
     * var space = weavy.space({ key: "myspace1" });
     */

    /**
     * This class is automatically instantiated when defining spaces in weavy. 
     * All the methods and properties are accessible in each instance. 
     * The passed options will fetch the space or create it. 
     * 
     * @constructor
     * @hideconstructor
     * @param {Weavy} weavy - Weavy instance the space belongs to.
     * @param {WeavySpace#options} options - Options defining the space
     * @param {Object} [data] - Initial data populating the space
     */
    function WeavySpace(weavy, options, data) {
        /** 
         *  Reference to this instance
         *  @lends WeavySpace#
         */
        var space = this;

        /**
         * The server id of the space, received from space data.
         * @category properties
         * @type {int}
         */
        space.id = null;

        /**
         * The name of the space, defined in options or received from space data.
         * @category properties
         * @type {string}
         */
        space.name = null;

        /**
         * The key of the space, defined in options or recieved from space data.
         * @category properties
         * @type {string}
         */
        space.key = null;

        /**
         * The {@link Weavy} instance the space belongs to.
         * @category properties
         * @type {Weavy}
         */
        space.weavy = weavy;

        /**
         * Options for defining the space. Key (or existing id) is required.
         * 
         * @example
         * weavy.space({
         *     key: "myspace",
         *     name: "My space",
         *     description: "A tabbed space for the team",
         *     container: "#space-area",
         *     controls: true,
         *     tabbed: true,
         *     apps: [
         *         { key: "myposts", type: "posts", open:: true },
         *         { key: "myfiles", type: "files" }
         *     ]
         * })
         * 
         * @category options
         * @typedef
         * @member
         * @type {Object}
         * @property {int} [id] - The server id of the space. Usually only used to reference a specific space on the server.
         * @property {string} key - The id representing the space in the context environment.
         * @property {string} [name] - User readable title for the space.
         * @property {string} [description] - Description of the space.
         * @property {Element|jQuery|string} [container] - Container for all apps in the space. May be overridden in individual apps.
         * @property {boolean} controls - Show or hide the panel controls for the apps in the space. May be overridden in individual apps.
         * @property {boolean} tabbed - Makes the apps in the space act as {@link WeavySpace#tabbed}, so that only one is open at the time.
         * @property {Array.<WeavyApp#options>} apps - List of app definitions for the space.
         */
        space.options = options;

        /**
         * The server data for the space.
         * 
         * @example
         * {
		 *   id: 1081,
		 *   key: "test-space",
		 *   name: "Test space",
		 *   tags: ["test"],
		 *   thumb: "/spaces/1081/avatar-{options}.svg?v=f2ae1b0",
		 *   apps: [{
		 *     id: 2150,
		 *     guid: "f667c9ee-b1f1-49e6-b32f-8a363f5cdb96",
	     *     key: "notifications",
		 *     name: "Notifications",
		 *     url: "/e/apps/2150",
		 *     typeName: "Weavy.Areas.Apps.Models.Notifications",
		 *     options: {
		 *       key: "notifications",
		 *       type: "notifications"
		 *     }
		 *   }],
		 *   options: {
		 *     key: "test-space",
		 *     name: "Test space"
		 *   }
         * }
         * 
         * @category properties
         * @typedef
         * @member
         * @type {Object}
         * @property {int} id - The server id for the space.
         * @property {string} key - The client key for the space.
         * @property {string} name - User readable title for the space.
         * @property {Array.<string>} tags - List of tags for the space.
         * @property {string} thumb - Server relative URL to the thumb for the space. \{options\} must be replaced with thumb options.
         * @property {Array.<WeavyApp#data>} apps - List of data for apps in the space.
         * @property {WeavySpace#options} [options] - Any space definition sent to the server. Should match {@link WeavySpace#options}.
         */
        space.data = data;

        /**
         * Array of all the apps defined in the space 
         * @category apps
         * @type {Array.<WeavyApp>}
         */
        space.apps = new Array();

        // EVENT HANDLERS

        /** 
         * The parent which the events bubbles to.
         * @category eventhandling
         * @type {Weavy}
         * @ignore
         */
        space.eventParent = weavy;

        /**
         * Event listener registration for the specific space. Only recieves events that belong to the space or any descendant apps.
         * 
         * @category eventhandling
         * @function
         * @example
         * weavy.space("myspace").on("open", function(e) { ... })
         */
        space.on = weavy.events.on.bind(space);

        /**
         * One time event listener registration for the specific space. Is only triggered once and only recieves events that belong to the space or any descendant apps.
         *
         * @category eventhandling
         * @function
         * @example
         * weavy.space("myspace").one("open", function(e) { ... })
         */
        space.one = weavy.events.one.bind(space);

        /**
         * Event listener unregistration for the specific space.
         * 
         * @category eventhandling
         * @function
         * @example
         * weavy.space("myspace").off("open", function(e) { ... })
         */
        space.off = weavy.events.off.bind(space);

        /**
         * Triggers events on the specific app. The events will also bubble up to the space and then the weavy instance.
         *
         * @category eventhandling
         * @function
         * @example
         * weavy.space("myspace").triggerEvent("myevent", [eventData])
         */
        space.triggerEvent = weavy.events.triggerEvent.bind(space);

        /**
         * Has the space loaded?
         * @category properties
         * @type {boolean}
         */
        space.isLoaded = false;

        /**
         * Is the space built? 
         * @category properties
         * @type {boolean}
         */
        space.isBuilt = false;

        /**
         * Promise that resolves when the space is loaded.
         * 
         * @category promises
         * @type {WeavyPromise}
         */
        space.whenLoaded = new WeavyPromise();

        /**
         * Promise that resolves when the space is built.
         * 
         * @category promises
         * @type {WeavyPromise}
         */
        space.whenBuilt = new WeavyPromise();

        // Use tabbed option otherwise false.
        /**
         * Is the space tabbed? Defined in {@link WeavySpace#options}. If true only one app will be open at the time in the space.
         * 
         * Defaults to false.
         * 
         * @category properties
         * @type {boolean}
         */
        space.tabbed = options.tabbed !== undefined ? options.tabbed : false;

        /**
         * Configure the space with options or data. If the space has data it will also be built. 
         * Currently existing options are extended with new options.
         * Data will resolve {@link WeavySpace#whenLoaded} promise.
         * 
         * @category methods
         * @function
         * @param {WeavySpace#options} options
         * @param {WeavySpace#data} data
         * @resolves {WeavySpace#whenLoaded}
         */
        space.configure = function (options, data) {

            if (options && typeof options === "object") {
                space.options = space.weavy.extendDefaults(space.options, options, true);
            }

            if (data && typeof data === "object") {
                space.data = data;
            }

            if (space.options && typeof space.options === "object") {
                space.container = space.options.container;

                if (space.id === null && space.options.id) {
                    space.id = space.options.id;
                }

                if (space.key === null && space.options.key) {
                    space.key = space.options.key;
                }

                if (space.name === null && space.options.name) {
                    space.name = space.options.name;
                }

                if (space.options.apps) {
                    var optionsApps = utils.asArray(space.options.apps);

                    optionsApps.forEach(function (appOptions) {
                        var foundApps = space.apps.filter(function (app) { return app.match(appOptions); });
                        if (foundApps.length === 0) {
                            space.apps.push(new WeavyApp(weavy, space, appOptions));
                        }
                    });
                }


            }

            if (space.data && typeof space.data === "object") {
                space.id = space.data.id;
                space.name = space.data.name;

                if (!space.key && space.data.key) {
                    space.key = space.data.key;
                }

                if (space.data.apps) {
                    var dataApps = utils.asArray(space.data.apps);

                    space.apps.forEach(function (app) {
                        var foundAppData = dataApps.filter(function (appData) { return app.match(appData) }).pop();
                        if (foundAppData) {
                            weavy.debug("Populating app data", { id: foundAppData.id, key: foundAppData.key || app.key, type: foundAppData.type || app.type });
                            app.data = foundAppData;
                            app.configure();
                        }
                    })
                }

                space.isLoaded = true;
                space.whenLoaded.resolve(space);

                if (space.weavy.isLoaded) {
                    space.build();
                }

            }
        }

        /**
         * Sets options and fetches (or creates) the space on the server. Options will replace existing options.
         * When data is fetched, the {@link WeavySpace#whenLoaded} promise is resolved.
         * 
         * @category methods
         * @function
         * @param {WeavySpace#options} [options] - Optional new space options
         * @returns {WeavySpace#whenLoaded}
         * @resolves {WeavySpace#whenLoaded}
         */
        space.fetchOrCreate = function (options) {
            if (options && typeof options === "object") {
                space.options = options;
            }

            if (space.options && typeof space.options === "object") {
                var initSpaceUrl = weavy.httpsUrl("/client/space", weavy.options.url);

                weavy.ajax(initSpaceUrl, space.options, "POST").then(function (data) {
                    space.data = data;
                    space.configure.call(space);
                }).catch(function (xhr, status, error) {
                    space.weavy.error("WeavySpace.fetchOrCreate()", xhr.responseJSON && xhr.responseJSON.message || xhr);
                    space.whenLoaded.reject(xhr.responseJSON && xhr.responseJSON.message || xhr);
                });
            } else {
                space.whenLoaded.reject(new Error("WeavySpace.fetchOrCreate() requires options"));
            }
            return space.whenLoaded();
        }

        /**
         * Builds the space. Creates a shadow root if needed. Is executed on the {@link Weavy#event:build} event.
         * 
         * @category methods
         * @function
         * @resolves {WeavySpace#whenBuilt}
         */
        space.build = function (e, build) {
            // TODO: return whenBuilt promise
            var space = this;
            var weavy = this.weavy;
            if (weavy.authentication.isAuthorized() && space.data && typeof space.data === "object") {
                weavy.debug("Building space", space.id);

                if (!space.root && space.container) {
                    space.isBuilt = true;
                    space.root = weavy.createRoot(space.container, "space-" + space.id);
                    space.root.container.panels = weavy.panels.createContainer();
                    space.root.container.appendChild(space.root.container.panels.node);
                    space.whenBuilt.resolve(space);
                }
            }
        }

        space.weavy.on("build", space.build.bind(space));

        space.configure();
    }

    /**
     * Function for making an id/key/object in to an app definition object
     * 
     * @category apps
     * @ignore
     * @function WeavySpace~getAppSelector
     * @param {int|string|WeavyApp#options} options - The id/key/object to parse
     * @returns {Object} appSelector
     * @returns {boolean} appSelector.isId - Is appOptions parsed as id (int)?
     * @returns {boolean} appSelector.isKey - Is appOptions parsed as a key (string)?
     * @returns {boolean} appSelector.isConfig - Is AppOptions parsed as an app definition (Object)?
     * @returns {Object} appSelector.selector - App definition object
     */
    function getAppSelector(options) {
        var isId = Number.isInteger(options);
        var isKey = typeof options === "string";
        var isConfig = utils.isPlainObject(options);

        var selector = isConfig && options || isId && { id: options } || isKey && { key: options };

        if (!selector) {
            if ('id' in options) {
                selector = { id: options.id };
            } else if ('key' in options) {
                selector = { key: options.key };
            }
        }

        return { isId: isId, isKey: isKey, isConfig: isConfig, selector: selector };
    }

    /**
     * Selects, fetches or creates an app in the space. 
     * 
     * The app needs to be defined using an app definition object containing at least a key, which will fetch or create the app on the server. 
     * If the defined app already has been defined, the app will only be selected in the client. 
     * After the app is defined it can be quickly selected in the client using only the id (int) or the key (string) of the app, which never will create nor fetch the app from the server.
     * 
     * @example
     * // Define an app that will be fetched or created on the server
     * var app = space.app({ key: "mykey", type: "files", container: "#mycontainer" });
     * 
     * // Select the newly defined app
     * var appAgain = space.app("mykey");
     * 
     * @category apps
     * @function WeavySpace#app
     * @param {int|string|WeavyApp#options} options - app id, app key or app definition object.
     * @returns {WeavyApp}
     */
    WeavySpace.prototype.app = function (options) {
        var space = this;
        var weavy = this.weavy;
        var app;

        var appSelector = getAppSelector(options);

        if (appSelector.selector) {
            try {
                app = space.apps.filter(function (a) { return a.match(appSelector.selector) }).pop();
            } catch (e) { }

            if (!app) {
                if (appSelector.isConfig) {
                    app = new WeavyApp(weavy, space, options);
                    space.apps.push(app);
                    Promise.all([weavy.authentication.whenAuthorized(), weavy.whenInitialized(), space.whenLoaded()]).then(function () {
                        app.fetchOrCreate();
                    }).catch(function (reason) {
                        weavy.warn("Could not fetchOrCreate space", reason || "");
                    });
                } else {
                    weavy.warn("App " + JSON.stringify(appSelector.selector) + " does not exist." + (appSelector.isId ? "" : " \n Use weavy.space(" + (space.key && "\"" + space.key + "\"" || space.id || "...") + ").app(" + JSON.stringify(appSelector.selector) + ") to create the app."))
                }
            }
        }

        return app;
    }

    /**
     * Removes the space and all it's apps from the client and the DOM. The space will not be removed on the server and can be added and fetched at any point again.
     * 
     * @category methods
     * @function WeavySpace#remove
     * @returns {external:Promise}
     */

    WeavySpace.prototype.remove = function () {
        var space = this;
        var weavy = this.weavy;

        weavy.debug("Removing space", space.id);

        var whenAllRemoved = [];

        this.apps.forEach(function (app) {
            whenAllRemoved.push(app.remove());
        })

        weavy.spaces = weavy.spaces.filter(function (s) { return !s.match(space) });

        return Promise.all(whenAllRemoved).then(function () {
            var spaceRoot = weavy.getRoot("space-" + space.id);
            if (spaceRoot) {
                spaceRoot.remove();
            }
        }, function (reason) {
            weavy.warn("Could not remove apps in space " + space.id + ".", reason);
        });
    }

    /**
     * Check if another space or an object is matching this space. It checks for a match of the id property or the key property.
     * 
     * @category methods
     * @function WeavySpace#match
     * @param {WeavySpace|Object} options
     * @param {int} [options.id] - Optional id to match.
     * @param {string} [options.key] - Optional key to match.
     * @returns {boolean}
     */
    WeavySpace.prototype.match = function (options) {
        if (options) {
            if (options.id && this.id) {
                return options.id === this.id
            }

            if (options.key && this.key) {
                return utils.eqString(options.key, this.key);
            }
        }

        return false;
    };

    return WeavySpace;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */


/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './app',
            './utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./app'),
            require('./utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavySpace = factory(
            jQuery,
            root.WeavyApp,
            root.WeavyUtils
        );
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyApp, utils) {
    console.debug("space.js");

    var WeavySpace = function (weavy, options, data) {
        /** 
         *  Reference to this instance
         *  @lends WeavySpace#
         */
        var space = this;

        this.id = null;
        this.name = null;
        this.key = null;

        this.weavy = weavy;

        /**
         * Options for the space
         * @member {Object} space.options
         * @property {} space.options.apps
         * @property {} space.options.container
         * @property {boolean} space.options.toggled
         */
        this.options = options;
        this.data = data;


        this.apps = new Array();

        // Event handlers
        this.eventParent = weavy;
        this.on = weavy.events.on.bind(space);
        this.one = weavy.events.one.bind(space);
        this.off = weavy.events.off.bind(space);
        this.triggerEvent = weavy.events.triggerEvent.bind(space);

        this.isLoaded = false;
        this.isBuilt = false;

        var _whenLoaded = $.Deferred();
        Object.defineProperty(this, "whenLoaded", {
            get: _whenLoaded.promise
        });

        var _whenBuilt = $.Deferred();
        Object.defineProperty(this, "whenBuilt", {
            get: _whenBuilt.promise
        });

        // Use toggled option or check for container otherwise false.
        this.toggled = options.toggled !== undefined ? options.toggled : (!!options.container || false);

        this.configure = function (options, data) {

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
                            weavy.debug("Populating app data", foundAppData.id);
                            app.data = foundAppData;
                            app.configure();
                        }
                    })
                }


                space.isLoaded = true;
                _whenLoaded.resolve(space.data);

                if (space.weavy.isLoaded) {
                    space.build();
                }

            }
        }

        this.fetchOrCreate = function (options) {
            if (options && typeof options === "object") {
                space.options = options;
            }

            if (space.options && typeof space.options === "object") {
                space.weavy.connection.invoke("client", "initSpace", space.options).then(function (data) {
                    space.data = data;

                    space.configure.call(space);
                }).catch(function (error) {
                    space.weavy.error("WeavySpace.fetchOrCreate()", error.message, error);
                    _whenLoaded.reject(error);
                });
            } else {
                _whenLoaded.reject(new Error("WeavySpace.fetchOrCreate() requires options"));
            }

            return space.whenLoaded;
        }

        this.build = function (e, build) {
            var space = this;
            var weavy = this.weavy;
            if (weavy.authentication.isAuthorized() && space.data && typeof space.data === "object") {
                weavy.debug("Building space", space.id);

                if (!space.root && space.container) {
                    space.isBuilt = true;
                    space.root = weavy.createRoot(space.container, space.id);
                    space.root.container.panels = weavy.panels.createContainer();
                    space.root.container.append(space.root.container.panels);
                    _whenBuilt.resolve();
                }
            }
        }

        space.weavy.on("build", space.build.bind(space));

        space.configure();

    };

    WeavySpace.prototype.app = function (appOptions) {
        var space = this;
        var weavy = this.weavy;
        var app;

        var isAppId = Number.isInteger(appOptions);
        var isAppKey = typeof appOptions === "string";
        var isAppConfig = $.isPlainObject(appOptions);
        var appSelector = isAppConfig && appOptions || isAppId && { id: appOptions } || isAppKey && { key: appOptions };

        if (appSelector) {
            try {
                app = space.apps.filter(function (a) { return a.match(appSelector) }).pop();
            } catch (e) { }

            if (!app) {
                if (isAppConfig) {
                    app = new WeavyApp(weavy, space, appOptions);
                    space.apps.push(app);
                    $.when(weavy.authentication.whenAuthorized(), weavy.whenLoaded).then(function () {
                        app.fetchOrCreate();
                    });
                } else {
                    weavy.warn("App " + (isAppConfig ? JSON.stringify(appSelector) : appOptions) + " does not exist." + (isAppId ? "" : " \n Use weavy.space(" + (space.key && "\"" + space.key + "\"" || space.id || "...") + ").app(" + JSON.stringify(appSelector) + ") to create the app."))
                }
            }
        }

        return app;
    } 

    WeavySpace.prototype.open = function (appOptions, destination) {
        return this.app(appOptions).open(destination);
    }

    WeavySpace.prototype.toggle = function (appOptions, destination) {
        return this.app(appOptions).toggle();    
    }

    WeavySpace.prototype.close = function (appOptions) {
        return this.app(appOptions).close();
    }

    WeavySpace.prototype.clear = function () {
        this.apps.forEach(function (app) {
            app.clear();
        });
    }

    WeavySpace.prototype.match = function (options) {
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

    return WeavySpace;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */


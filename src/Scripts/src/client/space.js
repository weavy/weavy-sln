/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './app',
            './utils',
            './promise'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./app'),
            require('./utils'),
            require('./promise')
        );
    } else {
        // Browser globals (root is window)
        root.WeavySpace = factory(
            jQuery,
            root.WeavyApp,
            root.WeavyUtils,
            root.WeavyPromise
        );
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyApp, utils, WeavyPromise) {
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
         * @property {boolean} space.options.tabbed
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

        this.whenLoaded = new WeavyPromise();
        this.whenBuilt = new WeavyPromise();

        // Use tabbed option otherwise false.
        this.tabbed = options.tabbed !== undefined ? options.tabbed : false;

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
                            weavy.debug("Populating app data", { id: foundAppData.id, key: foundAppData.key || app.key, type: foundAppData.type || app.type });
                            app.data = foundAppData;
                            app.configure();
                        }
                    })
                }

                space.isLoaded = true;
                space.whenLoaded.resolve(space.data);

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

        this.build = function (e, build) {
            var space = this;
            var weavy = this.weavy;
            if (weavy.authentication.isAuthorized() && space.data && typeof space.data === "object") {
                weavy.debug("Building space", space.id);

                if (!space.root && space.container) {
                    space.isBuilt = true;
                    space.root = weavy.createRoot(space.container, "space-" + space.id);
                    space.root.container.panels = weavy.panels.createContainer();
                    space.root.container.appendChild(space.root.container.panels);
                    space.whenBuilt.resolve();
                }
            }
        }

        space.weavy.on("build", space.build.bind(space));

        space.configure();

    };

    function getAppSelector(appOptions) {
        var isId = Number.isInteger(appOptions);
        var isKey = typeof appOptions === "string";
        var isConfig = $.isPlainObject(appOptions);

        var selector = isConfig && appOptions || isId && { id: appOptions } || isKey && { key: appOptions };

        if (!selector) {
            if ('id' in appOptions) {
                selector = { id: appOptions.id };
            } else if ('key' in appOptions) {
                selector = { key: appOptions.key };
            }
        }

        return { isId: isId, isKey: isKey, isConfig: isConfig, selector: selector };
    }

    WeavySpace.prototype.app = function (appOptions) {
        var space = this;
        var weavy = this.weavy;
        var app;

        var appSelector = getAppSelector(appOptions);

        if (appSelector.selector) {
            try {
                app = space.apps.filter(function (a) { return a.match(appSelector.selector) }).pop();
            } catch (e) { }

            if (!app) {
                if (appSelector.isConfig) {
                    app = new WeavyApp(weavy, space, appOptions);
                    space.apps.push(app);
                    $.when(weavy.authentication.whenAuthorized(), weavy.whenLoaded(), space.whenLoaded()).then(function () {
                        app.fetchOrCreate();
                    });
                } else {
                    weavy.warn("App " + (appSelector.isConfig ? JSON.stringify(appSelector) : appOptions) + " does not exist." + (appSelector.isId ? "" : " \n Use weavy.space(" + (space.key && "\"" + space.key + "\"" || space.id || "...") + ").app(" + JSON.stringify(appSelector.selector) + ") to create the app."))
                }
            }
        }

        return app;
    }

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


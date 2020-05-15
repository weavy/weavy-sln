/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './panels',
            './utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./panels'),
            require('./utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyApp = factory(jQuery, root.WeavyPanels, root.WeavyUtils);
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyPanels, utils) {
    console.debug("app.js");

    var WeavyApp = function (weavy, space, options, data) {

        weavy.log("new WeavyApp", options);

        /** 
         *  Reference to this instance
         *  @lends WeavyApp#
         */
        var app = this;

        this.container = null;
        this.root = null;
        this.panel = null;
        this.url = null;

        this.id = null;
        this.name = null;
        this.key = null;
        this.guid = null;
        this.type = null;
        this.typeName = null;

        this.autoOpen = null;

        this.weavy = weavy;
        this.space = space;
        this.options = options;
        this.data = data;

        // Event handlers
        this.eventParent = space;
        this.on = weavy.events.on.bind(app);
        this.one = weavy.events.one.bind(app);
        this.off = weavy.events.off.bind(app);
        this.triggerEvent = weavy.events.triggerEvent.bind(app);

        Object.defineProperty(this, "isOpen", {
            get: function () {
                weavy.log("isOpen", app.panel, app.panel && app.panel.isOpen);
                return app.panel ? app.panel.isOpen : false;
            }
        });

        this.isLoaded = false;
        this.isBuilt = false;

        var _whenLoaded = $.Deferred();
        // app.whenLoaded().then(...)
        Object.defineProperty(app, "whenLoaded", {
            get: function () {
                return _whenLoaded.promise;
            }
        });

        var _whenBuilt = $.Deferred();
        // app.whenBuilt().then(...)
        Object.defineProperty(app, "whenBuilt", {
            get: function () {
                return _whenBuilt.promise;
            }
        });


        this.configure = function (options, data) {
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
                _whenLoaded.resolve(app.data);

                if (!app.isBuilt && app.weavy.isLoaded) {
                    app.build();
                }
            }
        }

        this.fetchOrCreate = function (options) {

            if (options && typeof options === "object") {
                app.options = options;
            }

            if (app.options && typeof app.options === "object") {

                weavy.connection.invoke("client", "initApp", setSpace(app.options, app.space)).then(function (data) {
                    app.data = data;
                    app.configure.call(app);
                }).catch(function (error) {
                    app.weavy.error("WeavyApp.fetchOrCreate()", error.message, error);
                    _whenLoaded.reject(error);
                });
            } else {
                _whenLoaded.reject(new Error("WeavyApp.fetchOrCreate() requires options"));
            }

            return app.whenLoaded();
        }

        function bridgePanelEvent(eventName, panelId, triggerData, e, data) {
            if (data.panelId === panelId) {
                for (const prop in triggerData) {
                    if (Object.prototype.hasOwnProperty.call(data, prop)) {
                        triggerData[prop] = data[prop];
                    }
                }
                var eventResult = app.triggerEvent(eventName, triggerData);
                if (eventResult === false) {
                    return false;
                } else if (eventResult) {
                    for (const prop in data) {
                        if (Object.prototype.hasOwnProperty.call(eventResult, prop)) {
                            data[prop] = eventResult[prop];
                        }
                    }
                    return data;
                }
            }
        }

        function setSpace(options, space) {
            // TODO: This seems wrong
            var ctx = space.id || space.key || space.name;
            return space.weavy.extendDefaults({ space: ctx }, options);
        }

        this.build = function () {
            weavy.authentication.whenAuthorized().then(function () {
                var root = app.root || app.space && app.space.root;

                if (app.options && app.data) {
                    if (!root && app.container) {
                        try {
                            app.root = root = weavy.createRoot(app.container, "app-" + app.id);
                            root.container.panels = weavy.panels.createContainer("app-container-" + app.id);
                            root.container.panels.eventParent = app;
                            root.container.append(root.container.panels);
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

                        // Move to panels?
                        weavy.one("signing-out", this.close.bind(app));

                        weavy.on("panel-open", bridgePanelEvent.bind(app, "open", panelId, { space: app.space, app: app, destination: null }));
                        weavy.on("panel-toggle", bridgePanelEvent.bind(app, "toggle", panelId, { space: app.space, app: app, destination: null }));
                        weavy.on("panel-close", bridgePanelEvent.bind(app, "close", panelId, { space: app.space, app: app }));

                        _whenBuilt.resolve();
                    }
                }

            })
        };

        weavy.on("build", app.build.bind(app));

        app.whenBuilt().then(function () {
            if (app.autoOpen) {
                app.open();
            }
        });

        weavy.on("signed-in", function () {
            if (app.autoOpen) {
                // Reopen on sign in
                app.open();
            }
        });

        app.configure();
    };


    WeavyApp.prototype.open = function (destination) {
        var app = this;
        return app.whenBuilt().then(function () {
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

    WeavyApp.prototype.close = function () {
        var app = this;
        app.autoOpen = false;
        return app.whenBuilt().then(function () {
            return app.panel.close();
        });
    }

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

    WeavyApp.prototype.clear = function () {
        var app = this;
        var root = app.root || app.space && app.space.root;

        root.container.panels.removePanel("app-" + app.id);
    }

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

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

        this.whenLoaded = new WeavyPromise();
        this.whenBuilt = new WeavyPromise();

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
                app.whenLoaded.resolve(app.data);

                if (!app.isBuilt && app.weavy.isLoaded) {
                    app.build();
                }
            }
        }

        this.fetchOrCreate = function (options, refresh) {

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

        this.build = function () {
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

                        weavy.on("panel-open", bridgePanelEvent.bind(app, "open", panelId, { space: app.space, app: app, destination: null }));
                        weavy.on("panel-toggle", bridgePanelEvent.bind(app, "toggle", panelId, { space: app.space, app: app, destination: null }));
                        weavy.on("panel-close", bridgePanelEvent.bind(app, "close", panelId, { space: app.space, app: app }));

                        app.whenBuilt.resolve();
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

        weavy.on("after:signed-in", function () {
            if (app.autoOpen) {
                // Reopen on sign in
                app.open();
            }
        });

        app.configure();
    };


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

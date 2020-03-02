/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', './panels'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'), require('./panels'));
    } else {
        // Browser globals (root is window)
        root.WeavyApp = factory(jQuery, root.WeavyPanels);
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyPanels) {
    console.debug("app.js");

    var WeavyApp = function (weavy, context, options, data) {

        if (weavy.__proto__.constructor.name !== "Weavy") {
            throw new Error("WeavyApp instance error: No valid Weavy instance provided.");
        }

        if (context.__proto__.constructor.name !== "WeavyContext") {
            throw new Error("WeavyApp instance error: No valid weavy context provided.");
        }

        weavy.log("new WeavyApp", options);

        /** 
         *  Reference to this instance
         *  @lends WeavyApp#
         */
        var app = this;

        Object.defineProperty(app, "isOpen", {
            get: function () {
                weavy.log("isOpen", app.panel, app.panel && app.panel.isOpen);
                return app.panel ? app.panel.isOpen : false;
            }
        })

        app.container = null;
        app.root = null;
        app.panel = null;
        app.url = null;

        app.id = null;
        app.name = null;
        app.key = null;
        app.guid = null;
        app.type = null;
        app.typeName = null;

        app.autoOpen = null;

        app.weavy = weavy;
        app.context = context;
        app.options = options;
        app.data = data;

        Object.defineProperty(app, "isInitialized", {
            get: function () {
                return app.options && typeof app.options === "object" || app.data && typeof app.data === "object";
            }
        });

        app.isBuilt = false;

        var _whenInitialized = $.Deferred();
        Object.defineProperty(app, "whenInitialized", {
            get: _whenInitialized.promise
        });

        var _whenBuilt = $.Deferred();
        Object.defineProperty(app, "whenBuilt", {
            get: _whenBuilt.promise
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
                    app.autoOpen = app.options && app.options.open !== undefined ? app.options.open : (context && context.options && context.options.open !== undefined ? context.options.open : (context && !context.toggled || false));
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

                if (!app.isBuilt && app.weavy.isLoaded) {
                    app.build();
                }
            }
        }

        this.init = function (options) {

            if (options && typeof options === "object") {
                app.options = options;
            }

            if (app.options && typeof app.options === "object") {

                weavy.connection.invoke("client", "initApp", setContext(app.options, app.context)).then(function (data) {
                    app.data = data;
                    app.configure.call(app);
                    _whenInitialized.resolve(data);
                }).catch(function (error) {
                    app.weavy.error("WeavyApp.init", error.message, error);
                    _whenInitialized.reject(error);
                });
            } else {
                _whenInitialized.reject(new Error("App init requires options"));
            }

            return app.whenInitialized;
        }

        function bridgePanelEvent(eventName, panelId, triggerData, e, data) {
            if (data.panelId === panelId) {
                for (const prop in triggerData) {
                    if (data.hasOwnProperty(prop)) {
                        triggerData[prop] = data[prop];
                    }
                }
                var eventResult = weavy.triggerEvent(eventName, triggerData);
                if (eventResult === false) {
                    return false;
                } else if (eventResult) {
                    for (const prop in data) {
                        if (eventResult.hasOwnProperty(prop)) {
                            data[prop] = eventResult[prop];
                        }
                    }
                    return data;
                }
            }
        }

        function setContext(options, context) {
            var ctx = context.id || context.key || context.name;
            return context.weavy.extendDefaults({ context: ctx }, options);
        }

        this.build = function () {
            if (weavy.isLoaded && weavy.isAuthenticated()) {
                var root = app.root || app.context && app.context.root;

                if (app.options && app.data) {
                    if (!root && app.container) {
                        try {
                            app.root = root = weavy.createRoot(app.container, "app-" + app.id);
                            root.container.panels = weavy.panels.createContainer("app-container-" + app.id);
                            root.container.append(root.container.panels);
                        } catch (e) {
                            weavy.log("could not create app in container");
                        }
                    }

                    if (!app.isBuilt && root) {
                        app.isBuilt = true;
                        weavy.debug("Building app", app.id);
                        var panelId = "app-" + app.id;
                        var controls = app.options && app.options.controls !== undefined ? app.options.controls : (app.context.options && app.context.options.controls !== undefined ? app.context.options.controls : false);
                        app.panel = root.container.panels.addPanel(panelId, app.url, { controls: controls });

                        // Move to panels?
                        weavy.one("signing-out", this.close.bind(app));

                        weavy.on("panel-open", bridgePanelEvent.bind(app, "open", panelId, { context: app.context, app: app, destination: null }));
                        weavy.on("panel-toggle", bridgePanelEvent.bind(app, "toggle", panelId, { context: app.context, app: app, destination: null }));
                        weavy.on("panel-close", bridgePanelEvent.bind(app, "close", panelId, { context: app.context, app: app }));

                    }

                    if (app.isBuilt && app.autoOpen) {
                        app.open();
                    }

                    _whenBuilt.resolve();
                }
            }
        };

        weavy.on("build", app.build.bind(app));

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
        return app.whenBuilt.then(function () {
            return app.panel.open(destination);
        });
    }

    WeavyApp.prototype.close = function () {
        var app = this;
        return app.whenBuilt.then(function () {
            return app.panel.close();
        });
    }

    WeavyApp.prototype.toggle = function (destination) {
        var app = this;
        return app.whenBuilt.then(function () {
            return app.panel.toggle(destination);
        });
    }

    WeavyApp.prototype.clear = function () {
        var app = this;
        var root = app.root || app.context && app.context.root;

        root.container.panels.removePanel("app-" + app.id);
    }

    function asArray(maybeArray) {
        return maybeArray && ($.isArray(maybeArray) ? maybeArray : [maybeArray]) || [];
    }

    function ciEq(str1, str2) {
        return typeof str1 === "string" && typeof str2 === "string" && str1.toUpperCase() === str2.toUpperCase();
    }

    WeavyApp.prototype.match = function (options) {
        if (options) {
            return matchDataToOptions(this, options);
        }

        return false;
    };

    // Finds an option set that is matching the provided app/appdata
    function matchDataToOptions(appData, appOptions) {
        if (appOptions.type || appOptions.guid || appOptions.name || appOptions.key || appOptions.id) {
            var matchId = appData.id && appData.id === appOptions.id;
            var matchKey = ciEq(appData.key, appOptions.key);
            var matchName = ciEq(appData.name, appOptions.name);
            var matchGuid = ciEq(appData.guid, appOptions.type);
            var matchFullTypeName = ciEq(appData.typeName, appOptions.type);
            var matchTypeName = appData.typeName && ciEq(appData.typeName.split(".").pop(), appOptions.type);
            var matchType = appData.typeName && ciEq(appData.typeName.split(".").pop().split("App").shift(), appOptions.type);

            var matchResult = (!appOptions.id || matchId)
                && (!appOptions.key || matchKey)
                && (!appOptions.name || matchName)
                && (!appOptions.type || matchGuid || matchFullTypeName || matchTypeName || matchType);

            return matchResult;
        }
        return false;
    }

    WeavyApp.getOptionsByData = function (appsOptions, appData) {
        var optionsList = asArray(appsOptions);

        if (!$.isPlainObject(appData)) {
            return null;
        }

        var results = optionsList.filter(function (appOptions) { return matchDataToOptions(appData, appOptions); });

        if (results.length > 1) {
            throw new Error("App data is matching multiple options, please specify apps more in detail.")
        }

        return results.length === 1 && results.shift() || null;
    };

    return WeavyApp;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

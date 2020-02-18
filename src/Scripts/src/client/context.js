/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', './app'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'), require('./app'));
    } else {
        // Browser globals (root is window)
        root.WeavyContext = factory(jQuery, root.WeavyApp);
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyApp) {
    console.debug("context.js");

    var WeavyContext = function (weavy, options, data) {
        /** 
         *  Reference to this instance
         *  @lends WeavyContext#
         */
        var context = this;

        context.id = null;
        context.name = null;
        context.key = null;

        context.weavy = weavy;

        /**
         * Options for the context
         * @member {Object} context.options
         * @property {} context.options.apps
         * @property {} context.options.container
         * @property {boolean} context.options.toggled
         */
        context.options = options;
        context.data = data;
        context.apps = [];


        Object.defineProperty(context, "isInitialized", {
            get: function () {
                return context.options && typeof context.options === "object" || context.data && typeof context.data === "object";
            }
        });

        // Use combine option or check for container otherwise false.
        context.toggled = options.toggled !== undefined ? options.toggled : (!!options.container || false);

        context.weavy.on("build", context.build.bind(context));

        context.configure();

    };

    function addApps(appsData) {
        var context = this;
        if (appsData && typeof appsData === "object") {
            for (var app in appsData) {
                var appOptions = WeavyApp.getOptionsByData(context.options.apps, appsData[app]);
                var existingApp = WeavyApp.getDataByOptions(this.apps, appOptions);
                if (!existingApp) {
                    context.apps.push(new WeavyApp(context.weavy, context, appOptions, appsData[app]));
                }
            }
        }
    }


    WeavyContext.prototype.init = function (options) {
        var context = this;

        if (options) {
            context.options = options;
        }

        return context.weavy.connection.invoke("client", "initContext", context.options).then(function (data) {
            context.data = data;

            context.configure.call(context);
        }).catch(function (error) {
            context.weavy.error("WeavyContext.init", error.message, error);
        });
    }

    WeavyContext.prototype.configure = function () {
        var context = this;

        if (context.options && typeof context.options === "object") {
            context.weavy.log("Context has options", context.options);
            context.container = context.options.container;

            if (context.id === null && context.options.id) {
                context.id = context.options.id;
            }

            if (context.key === null && context.options.key) {
                 context.key = context.options.key;
            }

            if (context.name === null && context.options.name) {
                context.name = context.options.name;
            }
        }

        if (context.data && typeof context.data === "object") {
            context.id = context.data.id;
            context.name = context.data.name;

            if (this.weavy.isLoaded) {
                this.build();
            }

            addApps.call(context, context.data.apps);
        }
    }

    WeavyContext.prototype.build = function (e, build) {
        var context = this;
        var weavy = this.weavy;
        if (weavy.isAuthenticated() && context.data && typeof context.data === "object") {
            weavy.log("Building context", context.id);

            if (!context.root && context.container) {
                context.root = weavy.createRoot(context.container, context.id);
                context.root.container.panels = weavy.panels.createContainer();
                context.root.container.append(context.root.container.panels);
            }
        }
    }

    WeavyContext.prototype.app = function (appOptions) {
        var context = this;
        var app = WeavyApp.getDataByOptions(this.apps, appOptions);

        if (!app) {
            context.weavy.log("Context app match not found, adding new app");
            context.options = context.options || {};
            context.options.apps = context.options.apps || [];
            context.options.apps.push(appOptions);
            app = new WeavyApp(context.weavy, context);
            context.apps.push(app);
        }

        if (!app.isInitialized) {
            app.init(appOptions);
        } else {
            app.configure(appOptions);
        }

        return app;
    } 

    WeavyContext.prototype.open = function (appOptions, destination) {
        return this.app(appOptions).open(destination);
    }

    WeavyContext.prototype.toggle = function (appOptions, destination) {
        return this.app(appOptions).toggle();    
    }

    WeavyContext.prototype.close = function (appOptions) {
        return this.app(appOptions).close();
    }

    WeavyContext.prototype.clear = function () {
        this.apps.forEach(function (app) {
            app.clear();
        });
    }

    function ciEq(str1, str2) {
        return typeof str1 === "string" && typeof str2 === "string" && str1.toUpperCase() === str2.toUpperCase();
    }

    WeavyContext.prototype.match = function (options) {
        if (options) {
            if (options.id && this.id) {
                return options.id === this.id
            }

            if (options.key && this.key) {
                return ciEq(options.key, this.key);
            }

            if (options.name && this.name) {
                return ciEq(options.name, this.name);
            }
        }

        return false;
    };

    return WeavyContext;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */


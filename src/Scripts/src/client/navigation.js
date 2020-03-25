/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.WeavyNavigation = factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("navigation.js");

    /**
     * Class for handling internal/external navigation
     * 
     * @module navigation
     * @returns {WeavyNavigation}
     */
    var WeavyNavigation = function (weavy, options) {

        var navigation = this;

        this.options = options = weavy.extendDefaults(WeavyNavigation.defaults, options);

        function openRequest(request) {
            var whenOpened = $.Deferred();

            if (request.space && request.app && (request.space.id || request.space.key) && (request.app.id || request.app.key)) {

                var appCount = weavy.spaces.reduce(function (sum, space) {
                    return sum + space.apps.length;
                }, 0);

                var rejectCount = 0;

                var reject = function () {
                    rejectCount++;
                    if (rejectCount >= appCount) {
                        weavy.info("navigation: app " + (request.app.key || request.app.id) + " not found");
                        whenOpened.reject();
                    }
                }

                weavy.spaces.forEach(function (space) {
                    space.whenLoaded.then(function () {
                        if (request.space.id && space.id === request.space.id || request.space.key && space.key === request.space.key) {
                            space.apps.forEach(function (app) {
                                app.whenLoaded.then(function () {
                                    if (request.app.id && app.id === request.app.id || request.app.key && app.key === request.app.key) {
                                        weavy.log("navigation: app " + (request.app.key || request.app.id) + " open " + request.url);
                                        app.open(request.url).then(function (open) {
                                            whenOpened.resolve(open);
                                        });
                                    } else {
                                        reject(app)
                                    }
                                });
                            });
                        } else {
                            space.apps.forEach(reject);
                        }
                    });
                });
            } else {
                weavy.warn("navigation: url was not resolved to an app");
                whenOpened.reject();
            }

            return whenOpened.promise();
        }
        /**
         * Try to open an url in the app where it belongs. Automaticalyy finds out where to open the url unless routing data is provided in a {NavigationRequest} object.
         * 
         * @param {string|NavigationRequest} request - String Url or a {NavigationRequest} object with route data.
         */
        this.open = function (request) {
            var isUrl = typeof request === "string";
            var isNavigationRequest = $.isPlainObject(request) && request.url;

            if (isUrl) {
                return weavy.ajax("/client/click?url=" + encodeURIComponent(request)).then(openRequest);
            } else if (isNavigationRequest) {
                return openRequest(request);
            }
        };

        weavy.on(wvy.postal, "navigation-open", weavy.getId(), function (e) {
            /**
             * Navigation event triggered when a page should be opened in another space or app.
             * 
             * @event navigate
             * @property {NavigationRequest} route - Data about the requested navigation
             * 
             */
            var eventResult = weavy.triggerEvent("before:navigate", e.data.route);
            if (eventResult !== false) {
                weavy.info("navigate: trying internal auto navigation");
                navigation.open(eventResult).catch(function () {
                    // Only trigger on: and after: if .open was unsuccessful
                    eventResult = weavy.triggerEvent("on:navigate", eventResult);
                    if (eventResult !== false) {
                        weavy.triggerEvent("after:navigate", eventResult);
                    }
                });
            }
        })

    };


    /**
     * Default class options
     * 
     * @example
     * WeavyNavigation.defaults = {
     *     sound: {
     *         preload: "none",
     *         src: "/media/notification.mp3"
     *     }
     * };
     * 
     * @name defaults
     * @memberof navigation
     * @type {Object}
     * @property {string} sound.preload=none - Preload setting for the {@link notifications#nodes#notificationSound}
     * @property {url} sound.src - Url to the notification sound
     */
    WeavyNavigation.defaults = {
        
    };

    return WeavyNavigation;
}));

/**
 * @typedef navigationRequest
 * @type Object
 * @property space
 * @property {int} space.id - The server generated id for the space
 * @property {string} space.key - The key identifier the space
 * @property app
 * @property {int} app.id - The server generated id for the app
 * @property {string} app.key - The key identifier for the app
 * @property {string} url - The url to open
 */ 


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

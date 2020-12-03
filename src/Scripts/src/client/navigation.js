/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            './promise'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('./promise')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyNavigation = factory(jQuery, root.WeavyPromise);
    }
}(typeof self !== 'undefined' ? self : this, function ($, WeavyPromise) {
    console.debug("navigation.js");

    /**
     * @class WeavyNavigation
     * @classdesc Class for handling internal/external navigation
     */

    /**
     * Class for handling internal/external navigation.
     * 
     * @constructor
     * @hideconstructor
     * @param {Weavy} weavy - Weavy instance
     */
    var WeavyNavigation = function (weavy) {
        /**
         *  Reference to this instance
         *  @lends WeavyNavigation#
         */
        var weavyNavigation = this;

        /**
         * Tries to open a navigation request.
         * @param {WeavyNavigation~navigationRequest} request - The navigation request object to open
         * @returns {external:Promise}
         * @resolved When the request successfully is opened
         * @rejected When the request can't be opened
         */
        function openRequest(request) {
            var whenOpened = new WeavyPromise();

            if (request.target === "overlay" && weavy.plugins.preview) {
                weavy.log("navigation: opening preview " + request.url);
                weavy.plugins.preview.open(request.url).then(function (open) {
                    whenOpened.resolve(open);
                });
            } else {
                if (weavy.plugins.preview) {
                    weavy.plugins.preview.closeAll();
                }

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
                        space.whenLoaded().then(function () {
                            if (request.space.id && space.id === request.space.id || request.space.key && space.key === request.space.key) {
                                space.apps.forEach(function (app) {
                                    app.whenLoaded().then(function () {
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
            }

            return whenOpened();
        }
        /**
         * Try to open an url in the app where it belongs. 
         * Automatically finds out where to open the url via a server call unless routing data is directly provided in a {@link WeavyNavigation~navigationRequest} object.
         * 
         * @param {string|WeavyNavigation~navigationRequest} request - String Url or a {@link WeavyNavigation~navigationRequest} object with route data.
         * @returns {external:Promise}
         * @resolved When the request successfully is opened
         * @rejected When the request can't be opened
         */
        weavyNavigation.open = function (request) {
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
             * @event WeavyNavigation#navigate
             * @property {WeavyNavigation~navigationRequest} route - Data about the requested navigation
             * 
             */
            var eventResult = weavy.triggerEvent("before:navigate", e.data.route);
            if (eventResult !== false) {
                weavy.info("navigate: trying internal auto navigation");
                weavyNavigation.open(eventResult).catch(function () {
                    // Only trigger on: and after: if .open was unsuccessful
                    eventResult = weavy.triggerEvent("on:navigate", eventResult);
                    if (eventResult !== false) {
                        weavy.triggerEvent("after:navigate", eventResult);
                    }
                });
            }
        })

    };

    return WeavyNavigation;
}));

/**
 * The data for a navigation request. Some of the data is provided from the server just as meta data. It's received through the {@link WeavyNavigation#event:navigate} event and can be passed into the {@link WeavyNavigation#open} method.
 * 
 * @example
 * var navigationRoute = {
 *   "entity": {
 *     "id": 203,
 *     "type": "content"
 *   },
 *   "app": {
 *     "id": 2149,
 *     "key": "files",
 *     "name": "Files"
 *   },
 *   "space": {
 *     "id": 1077,
 *     "key": "client-test-demo",
 *     "name": "Demo Space"
 *   },
 *   "target": "overlay",
 *   "url": "/e/content/203"
 * };
 * 
 * @typedef WeavyNavigation~navigationRequest
 * @type Object
 * @property {Object} space
 * @property {int} space.id - The server generated id for the space
 * @property {string} space.key - The key identifier the space
 * @property {string} [space.name] - The name of the space
 * @property {Object} app
 * @property {int} app.id - The server generated id for the app
 * @property {string} app.key - The key identifier for the app
 * @property {string} [app.name] - The name of the app
 * @property {Object} entity
 * @property {int} entity.id - The server generated id for the item 
 * @property {string} [entity.type] - The type of the item
 * @property {string} url - The url to open
 * @property {string} target - Recommended target to open the url in, for instance "overlay", which may oven the preview overlay.
 */ 


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

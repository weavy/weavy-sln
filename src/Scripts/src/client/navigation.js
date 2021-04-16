/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            '../promise',
            '../utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('../promise'),
            require('../utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyNavigation = factory(root.WeavyPromise, root.WeavyUtils);
    }
}(typeof self !== 'undefined' ? self : this, function (WeavyPromise, utils) {
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
         * 
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

                if (request.space && request.app && (request.space.id || request.space.key) && (request.app.id || request.app.key)) {

                    weavy.whenLoaded().then(function () {
                        var openSpace = weavy.space(request.space.id || request.space.key);

                        var openApp;
                        if (openSpace) {
                            openApp = openSpace.app(request.app.id || request.app.key);
                        }

                        if (openApp) {
                            if (weavy.plugins.preview) {
                                weavy.plugins.preview.closeAll(true);
                            }

                            openApp.open(request.url).then(function (open) {
                                whenOpened.resolve(open);
                            });
                        } else {
                            weavy.info("navigation: requested app was not found");
                            whenOpened.reject();
                        }
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
            var isNavigationRequest = utils.isPlainObject(request) && request.url;

            if (isUrl) {
                return weavy.ajax("/client/click?url=" + encodeURIComponent(request)).then(openRequest);
            } else if (isNavigationRequest) {
                return openRequest(request);
            }
            return WeavyPromise.reject();
        };


        weavy.on(wvy.postal, "navigation-open", weavy.getId(), function (e) {
            /**
             * Navigation event triggered when a page should be opened in another space or app.
             * 
             * @category events
             * @event WeavyNavigation#navigate
             * @property {WeavyNavigation~navigationRequest} route - Data about the requested navigation
             * 
             */
            var route = weavy.triggerEvent("before:navigate", e.data.route);
            if (route !== false) {
                weavy.info("navigate: trying internal auto navigation");
                weavyNavigation.open(route).catch(function () {
                    // Only trigger on: and after: if .open was unsuccessful
                    route = weavy.triggerEvent("on:navigate", route);
                    if (route !== false) {
                        weavy.triggerEvent("after:navigate", route);
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

/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.wvy = root.wvy || {};
        root.wvy.promise = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    //console.debug("promise.js", window.name);

    // This event is handled using same-origin script policy
    window.addEventListener("unhandledrejection", function (e) {
        if (e.promise.weavy) {
            //console.debug("Uncaught (in weavy promise)", e.reason);
            e.preventDefault();
        }
    });

    /**
     * Unifying wrapper for deferred promises. 
     * Works both as a traditional promise and a deferred promise.
     * Use promise.reset() to replace the promise with a new promise.
     * Use the promise as a function (or via .promise()) to return the actual promise.
     * 
     * @example
     * // Traditional style promise
     * new WeavyPromise(function(resolve, reject) {
     *     resolve()
     * }).then(function() {
     *     console.log("resolved");
     * })
     * 
     * @example
     * // jQuery deferred style promise
     * var myPromise = new WeavyPromise();
     * 
     * // as variable
     * myPromise.then(function() {
     *     console.log("resolved")
     * });
     * 
     * // or as function()
     * myPromise().then(function() {
     *     console.log("resolved")
     * });
     * 
     * myPromise.resolve();
     *
     * @class WeavyPromise
     * @classdesc Unified promises that can be reset
     * @param {function} executor - Function to be executed while constructing the promise
     * @returns {external:Promise} - A function that acts as the deferred or returns the promise when called
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises}
     **/
    var WeavyPromiseWrapper = function (executor) {
        var promise, state = "pending";
        var WeavyPromise = function WeavyPromise() { return promise };

        /**
         * Returns the native promise.
         * Equal to calling the WeavyPromise as a function.
         * Return the native promise in public methods to avoid unintended promise resolving or rejecting.
         * 
         * @example
         * var myPromise = new WeavyPromise();
         * 
         * myPromise() === mypromise.promise();
         * 
         **/
        WeavyPromise.promise = WeavyPromise.bind(WeavyPromise);

        /**
         * Gets the state of the promise
         * - "pending"
         * - "resolved"
         * - "rejected"
         * 
         * @name WeavyPromise#state
         * @function
         **/
        WeavyPromise.state = function () {
            return state;
        };

        /**
         * Resets the promise so that it can be resolved or rejected again.
         * 
         * @example
         * var myPromise = new WeavyPromise();
         * 
         * myPromise.resolve(123);
         * myPromise.reset();
         * 
         * myPromise.then(function(num) {
         *     console.log("the number is", num); // 456
         * });
         * myPromise.resolve(456);
         * 
         * @name WeavyPromise#reset
         * @function
         **/
        (WeavyPromise.reset = function () {
            var resolve, reject;

            state = "pending";

            promise = new Promise(function (_resolve, _reject) {
                resolve = function () { state = "resolved"; _resolve.apply(this, arguments); };
                reject = function () { state = "rejected"; _reject.apply(this, arguments); };
            });

            promise.weavy = true;

            WeavyPromise.resolve = function () {
                resolve.apply(promise, arguments);
                return WeavyPromise;
            };

            WeavyPromise.reject = function () {
                reject.apply(promise, arguments);
                return WeavyPromise;
            };

            if (typeof executor === "function") {
                executor(resolve, reject);
            }
            return WeavyPromise;
        })();

        /**
         * Wrapper for Promise.prototype.then 
         **/
        WeavyPromise.then = function () {
            promise = promise.then.apply(promise, arguments);
            promise.weavy = true;
            return WeavyPromise;
        };

        /**
         * Wrapper for Promise.prototype.catch
         **/
        WeavyPromise.catch = function () {
            promise = promise.catch.apply(promise, arguments);
            promise.weavy = true;
            return WeavyPromise;
        };

        /**
         * Wrapper for Promise.prototype.finally
         **/
        WeavyPromise.finally = function () {
            promise = promise.finally.apply(promise, arguments);
            promise.weavy = true;
            return WeavyPromise;
        };

        return WeavyPromise;
    }

    /**
     * Return an instantly resolved WeavyPromise
     * 
     * @example
     * function doSomething() {
     *    return WeavyPromise.resolve(1234);
     * }
     * 
     * @name WeavyPromise.resolve
     * @function
     * @param {any} value
     */
    WeavyPromiseWrapper.resolve = function (value) {
        var promise = WeavyPromiseWrapper();
        promise.resolve(value);
        return promise;
    }

    /**
     * Return an instantly rejected WeavyPromise
     * 
     * @example
     * function doSomething() {
     *    return WeavyPromise.reject({ errorcode: 404 });
     * }
     * 
     * @name WeavyPromise.reject
     * @function
     * @param {any} value
     */
    WeavyPromiseWrapper.reject = function (value) {
        var promise = WeavyPromiseWrapper();
        promise.reject(value);
        return promise;
    }

    return WeavyPromiseWrapper;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

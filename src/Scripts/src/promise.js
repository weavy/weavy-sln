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
        root.WeavyPromise = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    console.debug("promise.js");

    // This event is handled using same-origin script policy
    window.addEventListener("unhandledrejection", function (e) {
        if (e.promise.weavy) {
            console.warn("Uncaught (in weavy promise)", e.reason);
            e.preventDefault();
        }
    });

    /**
     * Unifying wrapper for deferred promises. 
     * Works both as a traditional promise and a deferred promise.
     * Use promise.reset() to replace the promise with a new promise.
     * Use the promise as a function to 
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
     * myPromise.then(function() {
     *     console.log("resolved")
     * });
     * 
     * // or function style
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
        var promise;
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

            promise = new Promise(function (_resolve, _reject) {
                resolve = _resolve;
                reject = _reject;
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
            return WeavyPromise;
        };

        /**
         * Wrapper for Promise.prototype.catch
         **/
        WeavyPromise.catch = function () {
            promise = promise.catch.apply(promise, arguments);
            return WeavyPromise;
        };

        /**
         * Wrapper for Promise.prototype.finally
         **/
        WeavyPromise.finally = function () {
            promise = promise.finally.apply(promise, arguments);
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

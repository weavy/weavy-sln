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
        root.WeavyPromise = factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("promise.js");

    /**
     * Unifying wrapper for jQuery $.Deferred() promise.
     * Use promise.reset() to replace the promise with a new promise.
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
        var deferred;
        var WeavyPromise = function () { return deferred.promise() };

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
            deferred = $.Deferred();

            for (var vProp in deferred) {
                if (typeof deferred[vProp] === "function") {
                    WeavyPromise[vProp] = deferred[vProp].bind(deferred);
                } else {
                    WeavyPromise[vProp] = deferred[vProp];
                }
            }

            if (typeof executor === "function") {
                executor(deferred.resolve, deferred.reject);
            }
        })();


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

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
     * Module for unified promises
     * 
     * @module promise
     * @returns {WeavyPromise}
     */


    /**
     * Wrapper for jQuery $.Deferred() promise.
     * Use promise.reset() to replace the promise with a new promise.
     * 
     * @param {function} executor - Function to be executed while constructing the promise
     * @returns {external:Promise} - A function that acts as the deferred or returns the promise when called
     * */
    var WeavyPromiseWrapper = function (executor) {
        var deferred;
        var WeavyPromise = function () { return deferred.promise() };

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
     * @param {any} value
     */
    WeavyPromiseWrapper.resolve = function (value) {
        var promise = WeavyPromiseWrapper();
        promise.resolve(value);
        return promise;
    }

    /**
     * Return an instantly rejected WeavyPromise
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

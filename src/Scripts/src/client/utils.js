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
        root.WeavyUtils = factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("utils.js");

    /**
     * Module for misc utils
     * 
     * @module utils
     * @returns {WeavyUtils}
     */

    var WeavyUtils = {};

    WeavyUtils.asArray = function (maybeArray) {
        return maybeArray && ($.isArray(maybeArray) ? maybeArray : [maybeArray]) || [];
    };

    WeavyUtils.S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    WeavyUtils.ciEq = function (str1, str2) {
        return typeof str1 === "string" && typeof str2 === "string" && str1.toUpperCase() === str2.toUpperCase();
    };

    WeavyUtils.eqObjects = function (a, b, skipLength) {
        if (!$.isPlainObject(a) || !$.isPlainObject(b)) {
            return false;
        }

        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        if (!skipLength && aProps.length !== bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        return true;
    };

    /**
     * Stores data for the current domain in the weavy namespace.
     * 
     * @category options
     * @param {string} key - The name of the data
     * @param {data} value - Data to store
     * @param {boolean} [asJson=false] - True if the data in value should be stored as JSON
     */
    WeavyUtils.storeItem = function (key, value, asJson) {
        localStorage.setItem('weavy_' + window.location.hostname + "_" + key, asJson ? JSON.stringify(value) : value);
    };

    /**
     * Retrieves data for the current domain from the weavy namespace.
     * 
     * @category options
     * @param {string} key - The name of the data to retrieve
     * @param {boolean} [isJson=false] - True if the data shoul be decoded from JSON
     */
    WeavyUtils.retrieveItem = function (key, isJson) {
        var value = localStorage.getItem('weavy_' + window.location.hostname + "_" + key);
        if (value && isJson) {
            return JSON.parse(value)
        }

        return value;
    };

    return WeavyUtils;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

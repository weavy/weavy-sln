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

    /**
     * Always returns an Array.
     * 
     * @example
     * WeavyUtils.asArray(1); // [1]
     * WeavyUtils.asArray([1]); // [1]
     * 
     * @param {any} maybeArray
     */
    WeavyUtils.asArray = function (maybeArray) {
        return maybeArray && ($.isArray(maybeArray) ? maybeArray : [maybeArray]) || [];
    };

    /**
     * Generate a S4 alphanumeric 4 character sequence suitable for non-sensitive GUID generation etc.
     */
    WeavyUtils.S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    /**
     * Case insensitive string comparison
     * 
     * @param {any} str1 - The first string to compare
     * @param {any} str2 - The second string to compare
     */
    WeavyUtils.ciEq = function (str1, str2) {
        return typeof str1 === "string" && typeof str2 === "string" && str1.toUpperCase() === str2.toUpperCase();
    };

    /**
     * Compares two plain objects. Compares all the properties in a to any properties in b.
     * 
     * @param {any} a - The plain object to compare with b
     * @param {any} b - The plain object to compare properties from a to
     * @param {any} skipLength - Do not compare the number of properties
     */
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
     * Makes a replaceable returning function of a variable.
     * 
     * @example
     * var myFunc = fn("hello");
     * myFunc() // returns "hello"
     * 
     * myFunc.set("world");
     * myFunc() // returns "world"
     * 
     * @param {any} variable
     * @returns {Function}
     */
    WeavyUtils.fn = function (variable) {
        var _variable = variable;

        var returnFn = function () { return _variable };

        returnFn.set = function (variable) {
            _variable = variable;
        }

        return returnFn;
    };

    // JSON HELPERS

    /**
     * Changes a string to camelCase from PascalCase, spinal-case and snake_case
     * @param {string} name - The string to change to camel case
     * @returns {string} - The processed string as camelCase
     */
    WeavyUtils.toCamel = function (name) {
        // from PascalCase
        name = name[0].toLowerCase() + name.substring(1);

        // from snake_case and spinal-case
        return name.replace(/([-_][a-z])/ig, function ($1) {
            return $1.toUpperCase()
                .replace('-', '')
                .replace('_', '');
        });
    };

    /**
     * Changes all object keys recursively to camelCase from PascalCase, spinal-case and snake_case
     * @param {Object} obj - The object containing keys to 
     * @returns {Object} - The processed object with any camelCase keys
     */
    WeavyUtils.keysToCamel = function (obj) {
        if ($.isPlainObject(obj)) {
            const n = {};

            Object.keys(obj)
                .forEach(function (k) {
                    n[WeavyUtils.toCamel(k)] = WeavyUtils.keysToCamel(obj[k]);
                });

            return n;
        } else if ($.isArray(obj)) {
            return obj.map(function (i) {
                return WeavyUtils.keysToCamel(i);
            });
        }

        return obj;
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

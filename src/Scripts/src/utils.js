/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.WeavyUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    console.debug("utils.js");

    /**
     * Module for misc utils
     * 
     * @module utils
     * @returns {WeavyUtils}
     */

    var WeavyUtils = {};

    /**
     * Parse any HTML string into a HTMLCollection. Use WeavyUtils.parseHTML(html)[0] to get the first HTMLElement.
     * 
     * @param {any} html
     * @returns {HTMLCollection} List of all parsed HTMLElements
     */
    WeavyUtils.parseHTML = function (html) {
        if ('content' in document.createElement('template')) {
            var template = document.createElement('template');
            template.innerHTML = html.trim();
            return template.content.children;
        } else {
            // IE etc
            var parseDoc = document.implementation.createHTMLDocument();
            parseDoc.body.innerHTML = html.trim();
            return parseDoc.body.children;
        }
    }

    /*!
     * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
     *
     * Copyright (c) 2014-2017, Jon Schlinkert.
     * Released under the MIT License.
     */

    /**
     * 
     * @param {any} maybeObject - The object to check
     * @returns {boolean} True if the object is an object
     */
    WeavyUtils.isObject = function(maybeObject) {
        return Object.prototype.toString.call(maybeObject) === '[object Object]';
    }

    /**
     * Checks if an object is a plain object {}, similar to jQuery.isPlainObject()
     * 
     * @param {any} maybePlainObject - The object to check
     * @returns {boolean} True if the object is plain
     */
    WeavyUtils.isPlainObject = function (maybePlainObject) {
        var ctor, prot;

        if (WeavyUtils.isObject(maybePlainObject) === false) return false;

        // If has modified constructor
        ctor = maybePlainObject.constructor;
        if (ctor === undefined) return true;

        // If has modified prototype
        prot = ctor.prototype;
        if (WeavyUtils.isObject(prot) === false) return false;

        // If constructor does not have an Object-specific method
        if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
            return false;
        }

        // Most likely a plain Object
        return true;
    };

    /**
     * Check if an object is a jquery collection containing at least one item
     * 
     * @param {any} maybeJQuery
     * @returns {boolean} True if object is jQuery containing at least one item
     */
    WeavyUtils.isJQuery = function (maybeJQuery) {
        return !!(maybeJQuery && maybeJQuery.jquery && maybeJQuery.length)
    }

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
        return maybeArray && (Array.isArray(maybeArray) ? maybeArray : [maybeArray]) || [];
    };

    /**
     * Returns an element from an HTMLElement, string query selector, html string or jquery element
     * 
     * @param {any} elementOrSelector
     * @returns {HTMLElement}
     */
    WeavyUtils.asElement = function (elementOrSelector) {
        if (elementOrSelector) {
            if (elementOrSelector instanceof HTMLElement) {
                return elementOrSelector;
            }

            if (typeof elementOrSelector === "string") {
                if (elementOrSelector.indexOf("<") === 0) {
                    return WeavyUtils.parseHTML(elementOrSelector)[0];
                } else {
                    return document.querySelector(elementOrSelector);
                }
            }

            if (WeavyUtils.isJQuery(elementOrSelector)) {
                console.warn("Weavy: providing jQuery elements is deprecated, please provide a HTMLElement or selector query instead.")
                return elementOrSelector[0];
            }
        }
    }

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
    WeavyUtils.eqString = function (str1, str2) {
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
        if (!WeavyUtils.isPlainObject(a) || !WeavyUtils.isPlainObject(b)) {
            return false;
        }

        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        if (!skipLength && aProps.length !== bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];
            var propA = a[propName];
            var propB = b[propName];

            if (propA !== propB && !WeavyUtils.eqJQuery(propA, propB) && !WeavyUtils.eqObjects(propA, propB)) {
                return false;
            }
        }

        return true;
    };

    /**
     * Compares two jQuery objects.
     *
     * @param {any} a - The first jQuery object to compare
     * @param {any} b - The second jQuery object to compare
     */
    WeavyUtils.eqJQuery = function (a, b) {
        return a && b && a.jquery && b.jquery && a.jquery === b.jquery && a.length === b.length && a.length === a.filter(b).length;
    }


    // JSON HELPERS

    /**
     * Removes HTMLElement and Node from object before serializing. Used with JSON.stringify().
     * 
     * @example
     * var jsonString = JSON.stringify(data, WeavyUtils.sanitizeJSON);
     * 
     * @param {string} key
     * @param {any} value
     * @returns {any} - Returns the value or undefined if removed.
     */
    WeavyUtils.sanitizeJSON = function (key, value) {
        // Filtering out DOM Elements and nodes
        if (value instanceof HTMLElement || value instanceof Node) {
            return undefined;
        }
        return value;
    };

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
        if (WeavyUtils.isPlainObject(obj)) {
            const n = {};

            Object.keys(obj)
                .forEach(function (k) {
                    n[WeavyUtils.toCamel(k)] = WeavyUtils.keysToCamel(obj[k]);
                });

            return n;
        } else if (Array.isArray(obj)) {
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

    WeavyUtils.URL = function (url) {
        var a;
        var link = new URL(url) || new window.URL(url) || (a = document.createElement("a")) && (a.href = url) && a;
        if (link && !link.searchParams) {
            link.searchParams = new URLSearchParams(link.search);
        }
        return link;
    };

    return WeavyUtils;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

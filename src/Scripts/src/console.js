/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            './utils'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('./utils')
        );
    } else {
        // Browser globals (root is window)
        root.WeavyConsole = factory(
            root.WeavyUtils
        );
    }
}(typeof self !== 'undefined' ? self : this, function (utils) {
    console.debug("console.js");

    // LOGGING FUNCTIONS

    /** Checks if the browser is IE */
    var isIE = /; MSIE|Trident\//.test(navigator.userAgent);

    /**
     * Wrapper for applying colors/styles to the log functions.
     * 
     * @function
     * @param {function} logMethod - Native logging function to wrap, such as console.log
     * @param {string} [id] - Optional id as prefix, needs a color if used
     * @param {string} [color] - The hex color of the prefix
     * @param {Array} logArguments - Any number of log arguments 
     */
    function colorLog(logMethod, id, color, logArguments) {
        // Binding needed to get proper line numbers/file reference in console
        // Binding needed for console.log.apply to work in IE

        if (isIE) {
            if (id) {
                return Function.prototype.bind.call(logMethod, console, "Weavy " + id);
            } else {
                return Function.prototype.bind.call(logMethod, console);
            }
        } else {
            if (id) {
                if (color) {
                    return Function.prototype.bind.call(logMethod, console, "%cWeavy %s", "color: " + color, id);
                } else {
                    return Function.prototype.bind.call(logMethod, console, "%cWeavy %s", "color: gray", id);
                }
            } else {
                return Function.prototype.bind.call(logMethod, console, "%cWeavy", "color: gray");
            }
        }
    }

    /**
     * @class WeavyConsole
     * @classdesc 
     * Class for wrapping native console logging.
     * - Options for turning on/off logging
     * - Optional prefix by id with color
     **/

    /**
     * @constructor
     * @hideconstrucor
     * @param {string} [id] - The unique id displayed by console logging.
     * @param {string} [color] - A hex color to use for id. A random color will be chosen if omitted.
     * @param {WeavyConsole#logging} [enableLogging] - Options for which logging to enable/disable
     */
    var WeavyConsole = function (id, color, enableLogging) {
        /** 
         *  Reference to this instance
         *  @lends WeavyConsole#
         */
        var weavyConsole = this;

        /**
        * Enable logging messages in console. Set the individual logging types to true/false or the entire property to true/false;
        *
        * @example
        * weavy.console.logging = {
        *     log: true,
        *     debug: true,
        *     info: true,
        *     warn: true,
        *     error: true
        * };
        *
        * @example
        * weavy.console.logging = false;
        *
        * @name logging
        * @memberof WeavyConsole#
        * @typedef
        * @type {Object|boolean}
        * @property {boolean} log=true - Enable log messages in console
        * @property {boolean} debug=true - Enable debug messages in console
        * @property {boolean} info=true - Enable info messages in console
        * @property {boolean} warn=true - Enable warn messages in console
        * @property {boolean} error=true - Enable error messages in console
        */


        /**
         * The unique id displayed by console logging.
         *
         * @category properties
         * @type {string}
         */
        this.id = id;

        /**
         * The unique instance color used by console logging.
         *
         * @category properties
         * @type {string}
         */
        this.color = color || "#" + (utils.S4() + utils.S4()).substr(-6).replace(/^([8-9a-f].).{2}/, "$100").replace(/^(.{2})[8-9a-f](.).{2}/, "$1a$200").replace(/.{2}([8-9a-f].)$/, "00$1");

        var _logging = enableLogging !== undefined ? enableLogging : WeavyConsole.defaults;

        var _debug = colorLog(console.debug, weavyConsole.id, weavyConsole.color);


        Object.defineProperty(weavyConsole, "logging", {
            get: function () {
                return _logging;
            },
            set: function (logging) {
                _logging = logging;

                if (logging === true || logging.debug) {
                    weavyConsole.debug = _debug;
                } else {
                    weavyConsole.debug = function () { };
                }

            }
        });

        weavyConsole.logging = enableLogging !== undefined ? enableLogging : WeavyConsole.defaults;


        /**
         * Wrapper for `console.debug()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using a unique prefix color. 
         * @category logging
         * @function WeavyConsole#debug
         * @extends {external:console.debug}
         */
        /*if (weavyConsole.logging === true || weavyConsole.logging.debug) {
            this.debug = colorLog(console.debug, weavyConsole.id, weavyConsole.color);
        } else {
            this.debug = function () { };
        }*/

        /**
         * Wrapper for `console.error()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using a unique prefix color. 
         * @category logging
         * @function WeavyConsole#error
         * @extends {external:console.error}
         */
        if (weavyConsole.logging === true || weavyConsole.logging.error) {
            this.error = colorLog(console.error, weavyConsole.id, weavyConsole.color);
        } else {
            this.error = function () { };
        }

        /**
         * Wrapper for `console.info()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using a unique prefix color. 
         * @category logging
         * @function WeavyConsole#info
         * @extends {external:console.info}
         */
        if (weavyConsole.logging === true || weavyConsole.logging.info) {
            this.info = colorLog(console.info, weavyConsole.id, weavyConsole.color);
        } else {
            this.info = function () {}
        }

        /**
         * Wrapper for `console.log()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using a unique prefix color. 
         * @category logging
         * @function WeavyConsole#log
         * @extends {external:console.log}
         */
        if (weavyConsole.logging === true || weavyConsole.logging.log) {
            this.log = colorLog(console.log, weavyConsole.id, weavyConsole.color);
        } else {
            this.log = function () {}
        }

        /**
         * Wrapper for `console.warn()` that adds the [instance id]{@link Weavy#getId} of weavy as prefix using a unique prefix color. 
         * @category logging
         * @function WeavyConsole#warn
         * @extends {external:console.warn}
         */
        if (weavyConsole.logging === true || weavyConsole.logging.warn) {
            this.warn = colorLog(console.warn, weavyConsole.id, weavyConsole.color);
        } else {
            this.warn = function () {}
        }

    };

    /**
     * Default class options, may be defined in weavy options.
     * 
     * @example
     * Weavy.defaults.console = {
     *     log: true,
     *     debug: true,
     *     info: true,
     *     warn: true,
     *     error: true
     * };
     * 
     * @name defaults
     * @memberof WeavyConsole
     * @type {Object}
     * @property {boolean} log=true - Enable log messages in console
     * @property {boolean} debug=true - Enable debug messages in console
     * @property {boolean} info=true - Enable info messages in console
     * @property {boolean} warn=true - Enable warn messages in console
     * @property {boolean} error=true - Enable error messages in console
     */
    WeavyConsole.defaults = {
        log: true,
        debug: true,
        info: true,
        warn: true,
        error: true
    };

    return WeavyConsole;
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

/**
 * @external "console.debug"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/debug
 */

/**
 * @external "console.error"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/error
 */

/**
 * @external "console.info"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/info
 */

/**
 * @external "console.log"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/log
 */

/**
 * @external "console.warn"
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/want
 */

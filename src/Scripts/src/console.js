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
        root.wvy = root.wvy || {};
        root.wvy.console = root.wvy.console || factory(
            root.wvy.utils
        );
    }
}(typeof self !== 'undefined' ? self : this, function (WeavyUtils) {
    //console.debug("console.js", self.name);

    // LOGGING FUNCTIONS

    // Weavy colors
    const colors = [
        "#36ace2", // LightBlue-500
        "#6599eb", // Blue-400
        "#646fed", // Indigo-400
        "#773bde", // DeepPurple-500
        "#bc4bce", // Purple-500
        "#d54487", // Pink-500
        "#de4b3b", // Red-500
        "#e17637", // DeepOrange-500
        "#e3a135", // Orange-500
        "#c9a018", // Amber-600
        "#a4c51b", // Lime-600
        "#cbbc15", // Yellow-600
        "#7cd345", // LightGreen-500
        "#53c657", // Green-500
        "#45d391", // Teal-500
        "#38dde0"  // Cyan-500
    ];

    const gray = "#8c8c8c";

    /**
     * Wrapper for applying colors/styles to the log functions.
     * 
     * @function
     * @param {function} logMethod - Native logging function to wrap, such as console.log
     * @param {string} [id] - Optional id as prefix, needs a color if used
     * @param {string} [color] - The hex color of the prefix
     * @param {Array} logArguments - Any number of log arguments 
     */
    function colorLog(logMethod, name, color) {
        // Binding needed to get proper line numbers/file reference in console
        // Binding needed for console.log.apply to work in IE

        if (name) {
            if (color) {
                return Function.prototype.bind.call(logMethod, console, "%c%s", "color: " + color, name);
            } else {
                return Function.prototype.bind.call(logMethod, console, "%c%s", "color: " + gray, name);
            }
        } else {
            return Function.prototype.bind.call(logMethod, console, "%cWeavy", "color: " + gray);
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
     * @param {string|Object} [context] - The unique id displayed by console logging.
     * @param {WeavyConsole#options} [options] - Options for which logging to enable/disable
     */
    var WeavyConsole = function (context, options) {
        /** 
         *  Reference to this instance
         *  @lends WeavyConsole#
         */
        var weavyConsole = this;

        var _nameSelf = self.name ? self.name + ":" : "";
        var _nameType = context.type || context.constructor && context.constructor.name || "";
        var _nameInstance = context && context.name ? (_nameType ? "." : "") + context.name : (context.id ? "#" + context.id : "");
        var _name = typeof context === "string" ? _nameSelf + context : _nameSelf + _nameType + _nameInstance;

        var _options = WeavyConsole.defaults;

        // Select a color based on _nameSelf
        var _selectedColor = Array.from(_nameSelf).reduce(function (sum, ch) { return sum + ch.charCodeAt(0); }, 0) % colors.length;
        var _uniqueColor = colors[_selectedColor];

        var _color = gray;

        var noop = function () { };

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
        * @name options
        * @memberof WeavyConsole#
        * @typedef
        * @type {Object|boolean}
        * @property {string} color - A hex color to use for id. A random color will be chosen if omitted.
        * @property {boolean} log=true - Enable log messages in console
        * @property {boolean} debug=true - Enable debug messages in console
        * @property {boolean} info=true - Enable info messages in console
        * @property {boolean} warn=true - Enable warn messages in console
        * @property {boolean} error=true - Enable error messages in console
        */
        Object.defineProperty(this, "options", {
            get: function () {
                return _options;
            },
            set: function (options) {
                // Merge default options, current options and new options
                _options = WeavyUtils.assign(WeavyUtils.assign(WeavyConsole.defaults, _options), options);

                // Set color
                if (_options === true) {
                    _color = _uniqueColor;
                } else if (_options.color === false) {
                    _color = gray;
                } else if (typeof _options.color === "string") {
                    _color = _options.color;
                } else {
                    _color = _uniqueColor;
                }

                // Turn on/off logging
                this.log   = _options === true || _options.log   ? colorLog(window.console.log, _name, _color)   : noop;
                this.debug = _options === true || _options.debug ? colorLog(window.console.debug, _name, _color) : noop;
                this.info  = _options === true || _options.info  ? colorLog(window.console.info, _name, _color)  : noop;
                this.warn  = _options === true || _options.warn  ? colorLog(window.console.warn, _name, _color)  : noop;
                this.error = _options === true || _options.error ? colorLog(window.console.error, _name, _color) : noop;
            }
        });

        // Set initial logging
        this.options = options;
    };

    /**
     * Default class options, may be defined in weavy options.
     * 
     * @example
     * Weavy.defaults.console = {
     *     color: true,
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
     * @property {boolean} debug=false - Enable debug messages in console
     * @property {boolean} info=true - Enable info messages in console
     * @property {boolean} warn=true - Enable warn messages in console
     * @property {boolean} error=true - Enable error messages in console
     */
    WeavyConsole.defaults = {
        color: true,
        log: true,
        debug: false,
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

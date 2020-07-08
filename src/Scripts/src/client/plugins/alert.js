/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            'weavy'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('weavy')
        );
    } else {
        // Browser globals (root is window)
        if (typeof Weavy === 'undefined' || !Weavy.plugins) {
            throw new Error("Weavy must be loaded before registering plugin");
        }

        factory(jQuery, Weavy);
    }
}(typeof self !== 'undefined' ? self : this, function ($, Weavy) {

    /**
     * Plugin for displaying alert messages.
     * 
     * @mixin AlertPlugin
     * @returns {Weavy.plugins.alert}
     * @property {AlertPlugin#alert} .alert()
     * @typicalname weavy
     */
    var AlertPlugin = function (options) {
        /** 
         * Reference to this instance
         * @lends AlertPlugin#
         */
        var weavy = this;
        var _addMessages = [];

        function displayMessage(message, sticky) {
            if (!sticky) {
                weavy.timeout(5000).then(function () {
                    message.classList.remove("in");
                });
                weavy.timeout(5200).then(function () {
                    $(message).remove();
                });
            }
            weavy.timeout(1).then(function () {
                message.classList.add("in");
            });
            weavy.nodes.overlay.appendChild(message)
        }

        /**
         * Displays an alert.
         * 
         * @example
         * weavy.alert("Weavy is awesome!", true);
         * 
         * @param {string} message - The message to display
         * @param {boolean} [sticky=false] - Should the alert be sticky and not dismissable?
         */
        weavy.alert = function (message, sticky) {
            var alertMessage = document.createElement("div");
            alertMessage.className = options.className;
            alertMessage.innerHTML = message;

            if (weavy.nodes.overlay) {
                displayMessage(alertMessage, sticky);
            } else {
                _addMessages.push([alertMessage, sticky]);
            }
            weavy.log("Alert\n" + alertMessage.innerText);
        }

        weavy.on("after:build", function () {
            _addMessages.forEach(function (alertMessage) {
                displayMessage.apply(weavy, alertMessage);
            });
            _addMessages = [];
        });

        // Exports
        return { alert: weavy.alert }
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.alert.defaults = {
     *     className: "weavy-alert-message fade in"
     * };
     * 
     * @name defaults
     * @memberof AlertPlugin
     * @type {Object}
     * @property {string} [className=weavy-alert-message fade in] - Default classes for the alerts
     */
    AlertPlugin.defaults = {
        className: "weavy-alert-message fade"
    };

    // Register and return plugin
    console.debug("Registering Weavy plugin: alert");
    return Weavy.plugins.alert = AlertPlugin;

}));

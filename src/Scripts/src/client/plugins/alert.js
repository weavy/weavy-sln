(function ($) {

    var PLUGIN_NAME = "alert";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for displaying alert messages.
     * 
     * @mixin alert
     * @returns {Weavy.plugins.alert}
     * @property {alert#alert} .alert()
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         * Reference to this instance
         * @lends alert#
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
     * @memberof alert
     * @type {Object}
     * @property {string} [className=weavy-alert-message fade in] - Default classes for the alerts
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        className: "weavy-alert-message fade in"
    };

})(jQuery);

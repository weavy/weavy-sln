(function ($) {

    var PLUGIN_NAME = "alert";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for displaying alert messages.
     * 
     * @mixin alert
     * @returns {WeavyWidget.plugins.alert}
     * @property {alert#alert} .alert()
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         * Reference to this instance
         * @lends alert#
         */
        var widget = this;
        var _addMessages = [];

        function displayMessage(message, sticky) {
            if (!sticky) {
                widget.timeout(5000).then(function () {
                    message.classList.remove("in");
                });
                widget.timeout(5200).then(function () {
                    $(message).remove();
                });
            }
            widget.nodes.overlay.appendChild(message)
        }

        /**
         * Displays an alert.
         * 
         * @example
         * widget.alert("Weavy is awesome!", true);
         * 
         * @param {string} message - The message to display
         * @param {boolean} [sticky=false] - Should the alert be sticky and not dismissable?
         */
        widget.alert = function (message, sticky) {
            var alertMessage = document.createElement("div");
            alertMessage.className = options.className;
            alertMessage.innerHTML = message;

            if (widget.nodes.overlay) {
                displayMessage(alertMessage, sticky);
            } else {
                _addMessages.push([alertMessage, sticky]);
            }
            widget.log("Alert\n" + alertMessage.innerText);
        }

        widget.on("after:build", function () {
            _addMessages.forEach(function (alertMessage) {
                displayMessage.apply(widget, alertMessage);
            });
            _addMessages = [];
        });

        // Exports
        return { alert: widget.alert }
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.alert.defaults = {
     *     className: "weavy-alert-message fade in"
     * };
     * 
     * @name defaults
     * @memberof alert
     * @type {Object}
     * @property {string} [className=weavy-alert-message fade in] - Default classes for the alerts
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        className: "weavy-alert-message fade in"
    };

})(jQuery);

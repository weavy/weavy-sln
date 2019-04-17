(function ($) {
    var PLUGIN_NAME = "upgrade";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Checks if widget needs to be upgraded on {@link WeavyWidget#event:options} event.
     * 
     * @mixin upgrade
     * @returns {WeavyWidget.plugins.upgrade}
     * @property {function} .check() - Trigger an upgrade check
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends upgrade#
         */
        var widget = this;

        // check version mismatch
        function checkVersion() {
            var options = widget.options.plugins[PLUGIN_NAME];

            if (options.shouldUpgrade || WeavyWidget.version !== widget.options.version) {
                widget.log("weavy version check: current " + WeavyWidget.version + ", new " + widget.options.version)

                try {
                    if (typeof (browser) !== "undefined" && browser.runtime) {
                        browser.runtime.sendMessage({ name: 'sync' });
                    } else if (typeof (chrome) !== "undefined" && chrome.runtime) {
                        chrome.runtime.sendMessage({ name: 'sync' });
                    }
                } catch (ex) {
                    widget.warn(ex);
                }

                if (options.showAlert && widget.plugins.alert) {
                    widget.alert('<strong>' + widget.options.installationName + ' has been upgraded</strong><br/>Reload page to get the latest version.', true);
                }

                /**
                 * Triggered when the widget need to be upgraded and reloaded to match the version on the server.
                 * 
                 * @example
                 * widget.on("upgrade", function(e, version) {
                 *     widget.info("Current widget version:", version.current);
                 *     widget.info("New widget version available:", version.available);
                 * });
                 * 
                 * @category events
                 * @event upgrade#upgrade
                 * @returns {Object}
                 * @property {string} current - The currently running script semver version
                 * @property {string} available - The semver version on the server
                 */
                widget.triggerEvent("upgrade", { current: WeavyWidget.version, available: widget.options.version });
            }
        }

        widget.on("options", checkVersion);

        // Exports
        return { check: checkVersion }
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.upgrade.defaults = {
     *     showAlert: true
     * };
     * 
     * @name defaults
     * @memberof upgrade
     * @type {Object}
     * @property {boolean} showAlert=true - Show an elert when the widget has been upgraded.
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        showAlert: true
    };

})(jQuery);

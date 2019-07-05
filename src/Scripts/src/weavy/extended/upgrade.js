(function ($) {
    var PLUGIN_NAME = "upgrade";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Checks if weavy needs to be upgraded on {@link Weavy#event:options} event.
     * 
     * @mixin upgrade
     * @returns {Weavy.plugins.upgrade}
     * @property {function} .check() - Trigger an upgrade check
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends upgrade#
         */
        var weavy = this;

        // check version mismatch
        function checkVersion() {
            var options = weavy.options.plugins[PLUGIN_NAME];

            if (options.shouldUpgrade || Weavy.version !== weavy.options.version) {
                weavy.log("weavy version check: current " + Weavy.version + ", new " + weavy.options.version)

                try {
                    if (typeof (browser) !== "undefined" && browser.runtime) {
                        browser.runtime.sendMessage({ name: 'sync' });
                    } else if (typeof (chrome) !== "undefined" && chrome.runtime) {
                        chrome.runtime.sendMessage({ name: 'sync' });
                    }
                } catch (ex) {
                    weavy.warn(ex);
                }

                if (options.showAlert && weavy.plugins.alert) {
                    weavy.alert('<strong>' + weavy.options.installationName + ' has been upgraded</strong><br/>Reload page to get the latest version.', true);
                }

                /**
                 * Triggered when weavy need to be upgraded and reloaded to match the version on the server.
                 * 
                 * @example
                 * weavy.on("upgrade", function(e, version) {
                 *     weavy.info("Current weavy version:", version.current);
                 *     weavy.info("New weavy version available:", version.available);
                 * });
                 * 
                 * @category events
                 * @event upgrade#upgrade
                 * @returns {Object}
                 * @property {string} current - The currently running script semver version
                 * @property {string} available - The semver version on the server
                 */
                weavy.triggerEvent("upgrade", { current: Weavy.version, available: weavy.options.version });
            }
        }

        weavy.on("options", checkVersion);

        // Exports
        return { check: checkVersion }
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.upgrade.defaults = {
     *     showAlert: true
     * };
     * 
     * @name defaults
     * @memberof upgrade
     * @type {Object}
     * @property {boolean} showAlert=true - Show an elert when weavy has been upgraded.
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        showAlert: true
    };

})(jQuery);

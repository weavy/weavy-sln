(function ($) {
    var PLUGIN_NAME = "badge";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for displaying badges/dots
     * 
     * @mixin badge
     * @returns {Weavy.plugins.badge}
     * @typicalname weavy
     * @emits badge
     * @property {badge#setBadge} .setBadge()
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends badge#
         */
        var weavy = this;

        /**
         * Method for adding a badge to a weavy element. If the count is changed a pulsating dot is displayed.
         * 
         * @param {Element} element - The element which badge classes and properties should be applied to.
         * @param {int} count - The count of the badge. The badge is removed if count is 0. 
         */
        weavy.setBadge = function (element, count) {
            count = parseInt(count, 10);

            var prev = $(element).attr("data-count");
            $(element).attr("data-count", count);

            if (count > 0) {
                $(element).addClass("weavy-dot");
                if (count > prev) {
                    // new notifications, animate dot
                    $(element).removeClass("weavy-pulse");
                    weavy.timeout(1).then(function () {
                        // we need a small delay here for the browser to notice that the weavy-pulse class was toggled
                        $(element).addClass("weavy-pulse");
                    });
                }
            } else {
                // no notifications, remove dot and animation class
                $(element).removeClass("weavy-dot");
                $(element).removeClass("weavy-pulse");
            }
        }

        return { setBadge: weavy.setBadge }
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.badge.defaults = {
     * };
     *
     * @ignore
     * @name defaults
     * @memberof badge
     * @type {Object}
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
    };

})(jQuery);

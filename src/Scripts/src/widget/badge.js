(function ($) {
    var PLUGIN_NAME = "badge";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for displaying badges/dots
     * 
     * @mixin badge
     * @returns {WeavyWidget.plugins.badge}
     * @typicalname widget
     * @emits badge
     * @property {badge#setBadge} .setBadge()
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends badge#
         */
        var widget = this;

        /**
         * Method for adding a badge to a widget element. If the count is changed a pulsating dot is displayed.
         * 
         * @param {Element} element - The element which badge classes and properties should be applied to.
         * @param {int} count - The count of the badge. The badge is removed if count is 0. 
         */
        widget.setBadge = function (element, count) {
            count = parseInt(count, 10);

            var prev = $(element).attr("data-count");
            $(element).attr("data-count", count);

            if (count > 0) {
                $(element).addClass("weavy-dot");
                if (count > prev) {
                    // new notifications, animate dot
                    $(element).removeClass("weavy-pulse");
                    widget.timeout(1).then(function () {
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

        widget.on(weavy.realtime, "badge.weavy", function (e, data) {
            /**
             * Triggers when the number of unread conversations or notifications change.
             * 
             * @example
             * widget.on("badge", function (e, data) {
             *     widget.log("New notifications count", data.notifications);
             *     widget.log("Unread conversations count", data.conversations);
             * });
             * 
             * @event badge#badge
             * @category events
             * @returns {Object}
             * @property {int} conversations - Number of unread conversations
             * @property {int} notifications - Number of unread notifications
             * @property {int} total - The total number of unread conversations and notifications.
             */
            widget.triggerEvent("badge", data);
        });

        widget.on("load", function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            widget.triggerEvent("badge", options);
        });

        return { setBadge: widget.setBadge }
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.badge.defaults = {
     * };
     *
     * @ignore
     * @name defaults
     * @memberof badge
     * @type {Object}
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
    };

})(jQuery);

(function ($) {
    var PLUGIN_NAME = "notifications";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Displays notifications in the context window. The notifications are placed in the {@link ./widget#WeavyWidget+nodes+overlay|widget.nodes.overlay}.
     * 
     * @module notifications
     * @returns {WeavyWidget.plugins.notifications}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in {@link external:widget.nodes|WeavyWidget}
         * @instance
         * @member nodes
         * @extends external:widget.nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends module:notifications#
         */
        var widget = this;

        /**
         * @typedef User
         * @memberof module:notifications~
         * @type {Object}
         * @property {int} id - The id of the user
         * @property {string} name - The name of the user
         * @property {url} thumbUrl - Url to the user avatar
         * @property {string} type - `"user"`
         * @property {url} url - Url to the user profile
         * @property {string} username - The username used for mentions etc.
         */

        /**
         * @typedef Notification
         * @memberof module:notifications~
         * @type {Object}
         * @property {int} id - The id of the notification
         * @property {string} type - `"notification"`
         * @property {string} text - The text for the notification
         * @property {html} html - The notification text as HTML
         * @property {boolean} isRead - Has the notification been read?
         * @property {external:ISODateTime} createdAt - The time the notification was created.
         * @property {module:notifications~User} createdBy - The user that created the notification, may be a system user.
         * @property {Object} icon - A {@link https://materialdesignicons.com/|Material Design Icon} that is suitable for display of the notification.
         * @property {string} icon.name - The name of the icon.
         * @property {string} icon.color - The icon color name.
         * @property {string} kind - `"notification"`
         * @property {url} url - The url to the notification. It will redirect to the origin of the notification.
         * @property {url} thumbUrl - The url to the avatar for the notification.
         * @property {string[]} permissions - List of permissions on the notification for the current user.
         */

        /**
         * Container for notifications
         * 
         * @alias module:notifications#nodes#notifications
         * @type {?Element}
         */
        widget.nodes.notifications = null;

        /**
         * The sound for notifications.
         * 
         * @alias module:notifications#nodes#notificationSound
         * @type {?external:HTMLAudioElement} 
         */
        widget.nodes.notificationSound = null;

        function showNotification(notification) {
            if (!$(".weavy-panel.weavy-open", widget.nodes.container).length) {
                var notificationFrame = document.createElement("iframe");
                notificationFrame = document.createElement("iframe");
                notificationFrame.className = "weavy-notification-frame";
                notificationFrame.id = widget.getId("weavy-notification-frame-" + notification.id);

                if ($(widget.nodes.notifications).children().length > 0) {
                    notificationFrame.setAttribute("style", "display:none");
                    notificationFrame.setAttribute("data-src", removeTrailingSlash(widget.options.url) + "/notifications/" + notification.id + "/preview");
                } else {
                    notificationFrame.src = removeTrailingSlash(widget.options.url) + "/notifications/" + notification.id + "/preview";
                }

                widget.on(notificationFrame, "load", function () {
                    widget.sendWindowId(notificationFrame.contentWindow, notificationFrame.id);
                });

                widget.nodes.notifications.appendChild(notificationFrame);
            }

            try {
                widget.nodes.notificationSound.play();
            } catch (e) { }
        }

        function closeNotification(id) {

            var $notification = $(widget.getId("#weavy-notification-frame-" + id), widget.nodes.container);

            if ($notification.length) {
                $notification.fadeOut("normal", function () {
                    var $next = $notification.next();
                    $(this).remove();

                    if ($next.length) {
                        $next.attr("src", $next.data("src"));
                        widget.on($next, "load", function () {
                            $notification.fadeIn("normal");
                        });
                    }
                });
            }
        }

        function removeTrailingSlash(url) {
            return url.replace(/\/$/, "");
        }

        // Realtime events
        widget.on(weavy.realtime, "notification-inserted.weavy", function (e, data) {
            showNotification.call(widget, data);

            /**
             * Triggered when a new notification is received from the server.
             * 
             * @event module:notifications#notification-inserted
             * @category events
             * @returns {module:notifications~Notification}
             */
            widget.triggerEvent("notification-inserted", data);
        });

        widget.on(weavy.realtime, "notification-updated.weavy", function (e, data) {
            /**
             * Triggered when a notification update is received from the server.
             * 
             * @event module:notifications#notification-updated
             * @category events
             * @returns {module:notifications~Notification}
             */
            widget.triggerEvent("notification-updated", data);
        });

        widget.on(weavy.realtime, "notifications-all-read.weavy", function (e, data) {
            /**
             * Triggered when all notifications have been read.
             * 
             * @event module:notifications#notifications-all-read
             * @category events
             * @returns {Object}
             * @property {int} userId - The id of the user
             */
            widget.triggerEvent("notifications-all-read", data);
        });

        // Widget events
        widget.on("build", function () {
            if (!widget.nodes.notifications) {
                widget.nodes.notifications = document.createElement("div");
                widget.nodes.notifications.className = "weavy-notifications";
                widget.nodes.overlay.appendChild(widget.nodes.notifications);
            }

            if (widget.isAuthenticated()) {
                if (options.sound && !widget.nodes.notificationSound) {
                    // notification sound                
                    widget.nodes.notificationSound = document.createElement("audio");
                    widget.nodes.notificationSound.className = "weavy-notification-sound";
                    widget.nodes.notificationSound.preload = options.sound.preload;
                    widget.nodes.notificationSound.src = removeTrailingSlash(widget.options.url) + options.sound.src;
                    widget.nodes.container.appendChild(widget.nodes.notificationSound);
                }
            }
        });

        widget.on("open", function () {
            $(".weavy-notification-frame", widget.nodes.notifications).remove();
        });

        widget.on("close", function () {
            $(".weavy-notification-frame", widget.nodes.container).remove();
        });

        // Message events
        widget.on("message", function (e, message) {
            switch (message.name) {
                case "notification-loaded":
                case "notification-layout-changed":
                    var notification = $(widget.getId("#weavy-notification-frame-" + message.id), widget.nodes.container);

                    notification.show();
                    notification.css("height", message.height + "px");
                    // show set height
                    break;
                case "notification-closed":
                    closeNotification.call(widget, message.id);
                    break;
            }
        });
        

    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.notifications.defaults = {
     *     sound: {
     *         preload: "none",
     *         src: "/media/notification.mp3"
     *     }
     * };
     * 
     * @name defaults
     * @memberof module:notifications
     * @type {Object}
     * @property {string} sound.preload=none - Preload setting for the {@link module:notifications#nodes#notificationSound}
     * @property {url} src - Url to the notification sound
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        sound: {
            preload: "none",
            src: "/media/notification.mp3"
        }
    };

})(jQuery);

/**
 * @external "widget.nodes"
 * @see {@link ./widget#WeavyWidget+nodes|WeavyWidget.nodes}
 */

/**
 * @external HTMLAudioElement
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement
 */

/**
 * @external ISODateTime
 * @see https://en.wikipedia.org/wiki/ISO_8601
 */

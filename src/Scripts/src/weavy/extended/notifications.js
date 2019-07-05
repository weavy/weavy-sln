(function ($) {
    var PLUGIN_NAME = "notifications";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Displays notifications in the context window. The notifications are placed in the [weavy.nodes.overlay]{@link Weavy#nodes#overlay}.
     * 
     * @mixin notifications
     * @returns {Weavy.plugins.notifications}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof notifications
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends notifications#
         */
        var weavy = this;

        /**
         * @typedef User
         * @memberof notifications~
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
         * @memberof notifications~
         * @type {Object}
         * @property {int} id - The id of the notification
         * @property {string} type - `"notification"`
         * @property {string} text - The text for the notification
         * @property {html} html - The notification text as HTML
         * @property {boolean} isRead - Has the notification been read?
         * @property {external:ISODateTime} createdAt - The time the notification was created.
         * @property {notifications~User} createdBy - The user that created the notification, may be a system user.
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
         * @alias notifications#nodes#notifications
         * @type {?Element}
         */
        weavy.nodes.notifications = null;

        /**
         * The sound for notifications.
         * 
         * @alias notifications#nodes#notificationSound
         * @type {?external:HTMLAudioElement} 
         */
        weavy.nodes.notificationSound = null;

        function showNotification(notification) {
            if (!$(".weavy-panel.weavy-open", weavy.nodes.container).length) {
                var notificationFrame = document.createElement("iframe");
                notificationFrame = document.createElement("iframe");
                notificationFrame.className = "weavy-notification-frame";
                notificationFrame.id = weavy.getId("weavy-notification-frame-" + notification.id);

                if ($(weavy.nodes.notifications).children().length > 0) {
                    notificationFrame.setAttribute("style", "display:none");
                    notificationFrame.setAttribute("data-src", removeTrailingSlash(weavy.options.url) + "/notifications/" + notification.id + "/preview");
                } else {
                    notificationFrame.src = removeTrailingSlash(weavy.options.url) + "/notifications/" + notification.id + "/preview";
                }

                weavy.on(notificationFrame, "load", function () {
                    weavy.sendWindowId(notificationFrame.contentWindow, notificationFrame.id);
                });

                weavy.nodes.notifications.appendChild(notificationFrame);
            }

            try {
                weavy.nodes.notificationSound.play();
            } catch (e) { }
        }

        function closeNotification(id) {

            var $notification = $(weavy.getId("#weavy-notification-frame-" + id), weavy.nodes.container);

            if ($notification.length) {
                $notification.fadeOut("normal", function () {
                    var $next = $notification.next();
                    $(this).remove();

                    if ($next.length) {
                        $next.attr("src", $next.data("src"));
                        weavy.on($next, "load", function () {
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
        weavy.on(wvy.realtime, "notification-inserted.weavy", function (e, data) {
            showNotification.call(weavy, data);

            /**
             * Triggered when a new notification is received from the server.
             * 
             * @event notifications#notification-inserted
             * @category events
             * @returns {notifications~Notification}
             */
            weavy.triggerEvent("notification-inserted", data);
        });

        weavy.on(wvy.realtime, "notification-updated.weavy", function (e, data) {
            /**
             * Triggered when a notification update is received from the server.
             * 
             * @event notifications#notification-updated
             * @category events
             * @returns {notifications~Notification}
             */
            weavy.triggerEvent("notification-updated", data);
        });

        weavy.on(wvy.realtime, "notifications-all-read.weavy", function (e, data) {
            /**
             * Triggered when all notifications have been read.
             * 
             * @event notifications#notifications-all-read
             * @category events
             * @returns {Object}
             * @property {int} userId - The id of the user
             */
            weavy.triggerEvent("notifications-all-read", data);
        });

        // Widget events
        weavy.on("build", function () {
            if (!weavy.nodes.notifications) {
                weavy.nodes.notifications = document.createElement("div");
                weavy.nodes.notifications.className = "weavy-notifications";
                weavy.nodes.overlay.appendChild(weavy.nodes.notifications);
            }

            if (weavy.isAuthenticated()) {
                if (options.sound && !weavy.nodes.notificationSound) {
                    // notification sound                
                    weavy.nodes.notificationSound = document.createElement("audio");
                    weavy.nodes.notificationSound.className = "weavy-notification-sound";
                    weavy.nodes.notificationSound.preload = options.sound.preload;
                    weavy.nodes.notificationSound.src = removeTrailingSlash(weavy.options.url) + options.sound.src;
                    weavy.nodes.container.appendChild(weavy.nodes.notificationSound);
                }
            }
        });

        weavy.on("open", function () {
            $(".weavy-notification-frame", weavy.nodes.notifications).remove();
        });

        weavy.on("close", function () {
            $(".weavy-notification-frame", weavy.nodes.container).remove();
        });

        // Message events
        weavy.on("message", function (e, message) {
            switch (message.name) {
                case "notification-loaded":
                case "notification-layout-changed":
                    var notification = $(weavy.getId("#weavy-notification-frame-" + message.id), weavy.nodes.container);

                    notification.show();
                    notification.css("height", message.height + "px");
                    // show set height
                    break;
                case "notification-closed":
                    closeNotification.call(weavy, message.id);
                    break;
            }
        });
        

    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.notifications.defaults = {
     *     sound: {
     *         preload: "none",
     *         src: "/media/notification.mp3"
     *     }
     * };
     * 
     * @name defaults
     * @memberof notifications
     * @type {Object}
     * @property {string} sound.preload=none - Preload setting for the {@link notifications#nodes#notificationSound}
     * @property {url} src - Url to the notification sound
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        sound: {
            preload: "none",
            src: "/media/notification.mp3"
        }
    };

})(jQuery);

/**
 * @external HTMLAudioElement
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement
 */

/**
 * @external ISODateTime
 * @see https://en.wikipedia.org/wiki/ISO_8601
 */

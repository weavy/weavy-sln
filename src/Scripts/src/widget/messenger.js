(function ($) {
    var PLUGIN_NAME = "messenger";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    function removeTrailingSlash(url) {
        return url.replace(/\/$/, "");
    }

    /**
     * Plugin for handling the Weavy Messenger. It also adds the messenger to the dock and displays unread conversations.
     * 
     * @example
     * if (widget.plugins.messenger) {
     *     widget.open("messenger");
     * }
     * 
     * @mixin messenger
     * @returns {WeavyWidget.plugins.messenger}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [WeavyWidget]{@link WeavyWidget#nodes}
         * @instance
         * @member nodes
         * @memberof messenger
         * @extends WeavyWidget#nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends messenger#
         */
        var widget = this;

        /**
         * @typedef User
         * @memberof messenger~
         * @type {Object}
         * @property {int} id - The id of the user
         * @property {string} name - The name of the user
         * @property {url} thumbUrl - Url to the user avatar
         * @property {string} type - `"user"`
         * @property {url} url - Url to the user profile
         * @property {string} username - The username used for mentions etc.
         */

        /** 
         * @typedef Conversation
         * @memberof messenger~
         * @type {Object}
         * @property {external:ISODateTime} createdAt - The time the conversation started
         * @property {messenger~User} createdBy - The user that created the conversation
         * @property {external:ISODateTime} deliveredAt - When the last message was delivered
         * @property {string} description - Snippet of the most recent message in the conversation
         * @property {int[]} followedBy - List of ids of the users that follow the conversation.
         * @property {Object} icon - A {@link https://materialdesignicons.com/|Material Design Icon} that is suitable for display of the conversation.
         * @property {string} icon.name - The name of the icon.
         * @property {string} icon.color - The icon color name.
         * @property {int} id - The id of the conversation
         * @property {boolean} isMember - Is the user a member in the converation 
         * @property {boolean} isRead - Is all messages read by the user
         * @property {boolean} isRoom - Is the conversation a room
         * @property {string} kind - `"conversation"`
         * @property {external:ISODateTime} lastMessageAt - The time the last message was sent
         * @property {messenger~User} lastMessageBy - The user that sent the last message
         * @property {messenger~User[]} members - All the uesers that is part of the conversation.
         * @property {string[]} permissions - List of permissions on the conversation for the current user.
         * @property {external:ISODateTime} readAt - The time the current user viewed the conversation.
         * @property {url} thumbUrl - The url to the avatar for the conversation.
         * @property {string} type - `"conversation"`
         * @property {url} url - The url to the conversation
         */

        /**
         * @typedef Message
         * @memberof messenger~
         * @type {Object}
         * @property {int} id - The id of the message
         * @property {string} type - `"message"`
         * @property {int} conversation - Id of the conversation the message belongs to.
         * @property {string} text - The message text.
         * @property {html} html - The message text as HTML.
         * @property {external:ISODateTime} createdAt - The time the message was created.
         * @property {messenger~User} createdBy - The user that created the message
         * @property {Object} icon - A {@link https://materialdesignicons.com/|Material Design Icon} that is suitable for display of the message.
         * @property {string} icon.name - The name of the icon.
         * @property {string} icon.color - The icon color name.
         * @property {string} kind - `"message"`
         * @property {url} url - The url to the message
         * @property {url} thumbUrl - The url to the avatar for the message.
         * @property {string[]} permissions - List of permissions on the message for the current user.
         */

        /**
         * The panel for messenger
         * 
         * @alias messenger#nodes#messengerPanel
         * @type {?Element}
         */
        widget.nodes.messengerPanel = null;

        /**
         * The frame used by {@link messenger#nodes#messengerPanel}
         * 
         * @alias messenger#nodes#messengerFrame
         * @type {?Element}
         */
        widget.nodes.messengerFrame = null;

        /**
         * The dock button container for messenger 
         * 
         * @alias messenger#nodes#messengerButtonContainer
         * @type {?Element}
         */
        widget.nodes.messengerButtonContainer = null;

        /**
         * The actual button in the {@link messenger#nodes#messengerButtonContainer} 
         * 
         * @alias messenger#nodes#messengerButton
         * @type {?Element}
         */
        widget.nodes.messengerButton = null;

        /**
         * Container for unread conversations. Appended to the {@link messenger#nodes#messengerButton} 
         * 
         * @alias messenger#nodes#conversations
         * @type {?Element}
         */
        widget.nodes.conversations = null;

        /**
         * List of unread conversations
         *
         * @catergory properties
         * @type {messenger~Conversation[]}
         */
        widget.unreadConversations = [];

        /**
         * Open a conversation
         * 
         * @param {int} conversationId - The id of the {@link messenger~Conversation} to open.
         * @param {Event} [event] - Optional event that will be prevented and propagation stopped
         */
        widget.openConversation = function (conversationId, event) {
            var options = widget.options.plugins[PLUGIN_NAME];

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            if (widget.nodes.messengerFrame) {
                widget.nodes.messengerFrame.contentWindow.postMessage({ "name": "open-conversation", "id": conversationId }, "*");
            }

            widget.open(options.panelId);
        };

        /**
         * Extends {@link context#openContextFrame} with messenger handling.
         * @param {Object} weavyContext
         * @param {int} weavyContext.spaceId - Should be -2 to open messenger
         * @param {url} weavyContext.url - The url in messenger
         */
        var superOpenContextFrame = widget.openContextFrame;
        widget.openContextFrame = function (weavyContext) {
            var options = widget.options.plugins[PLUGIN_NAME]
            if (weavyContext) {
                var contextData = JSON.parse(weavyContext);
                if (contextData.spaceId === -2) {
                    widget.open(options.panelId, contextData.url);
                } else {
                    superOpenContextFrame(weavyContext);
                }
            }
        };

        function updateConversations(conversations) {
            if (widget.plugins.dock) {
                $(widget.nodes.conversations).empty();

                for (var i = 0; i < conversations.length; i++) {
                    var conversation = document.createElement("a");
                    conversation.className = "weavy-conversation";
                    conversation.href = "javascript:;";
                    conversation.setAttribute("draggable", "false");
                    conversation.title = conversations[i].isRoom ? conversations[i].name : conversations[i].createdBy.name;
                    conversation.setAttribute("data-id", conversations[i].id);
                    widget.on(conversation, "click", widget.openConversation.bind(widget, conversations[i].id));

                    var avatar = document.createElement("img");
                    avatar.className = "weavy-avatar";
                    avatar.setAttribute("draggable", "false");

                    avatar.src = removeTrailingSlash(widget.options.url) + conversations[i].thumbUrl.replace("{options}", "96x96-crop");
                    conversation.appendChild(avatar);
                    widget.nodes.conversations.appendChild(conversation);

                    if (i === 2 && conversations.length > 3) {
                        var more = document.createElement("a");
                        more.className = "weavy-icon";
                        more.href = "javascript:;";
                        more.title = "More...";
                        widget.on(more, "click", widget.openConversation.bind(widget, null));
                        more.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/></svg>';
                        widget.nodes.conversations.appendChild(more);
                        break;
                    }
                }
            }
        }

        function conversationRead(id) {
            widget.unreadConversations = widget.unreadConversations.filter(function (unreadConversation) { return unreadConversation.id !== id });
            updateConversations.call(widget, widget.unreadConversations);
        }

        function appendConversation(conversation) {
            // remove if already in list - will be added again
            widget.unreadConversations = widget.unreadConversations.filter(function (unreadConversation) { return unreadConversation.id !== conversation.id });
            widget.unreadConversations.unshift(conversation);
            updateConversations.call(widget, widget.unreadConversations);
        }

        // Realtime events
        widget.on(weavy.realtime, "conversation-read.weavy", function (e, data) {
            if (data.user.id === widget.options.userId) {
                conversationRead.call(widget, data.conversation.id);

                /**
                 * Triggered when conversation read data is received from the server.
                 * 
                 * @event messenger#conversation-read
                 * @category events
                 * @returns {Object}
                 * @property {messenger~User} user
                 * @property {messenger~Conversation} conversation
                 */
                widget.triggerEvent("conversation-read", data);
            }
        });

        widget.on(weavy.realtime, "message-inserted.weavy", function (e, data) {
            var message = data;
            if (message.createdBy.id !== widget.options.userId && message.createdBy.id > 0) {
                weavy.realtime.invoke("widget", "getConversation", message.conversation);

                /**
                 * Triggered when a message is appended in a conversation.
                 * 
                 * @event messenger#message-inserted
                 * @category events
                 * @returns {messenger~Message}
                 */
                widget.triggerEvent("message-inserted", data);
            }
        });

        widget.on(weavy.realtime, "conversation-received.weavy", function (e, data) {
            appendConversation.call(widget, data);
        });

        // Message events
        // REVIEW: Is this message deprecated?
        widget.on("message", function (e, message) {
            var options = widget.options.plugins[PLUGIN_NAME];

            switch (message.name) {
                case "messenger":
                    widget.open(options.panelId, widget.options.url + message.url);
                    break;
            }
        });


        // Widget events
        widget.on("build", function (e) {
            var options = widget.options.plugins[PLUGIN_NAME];
            if (widget.isAuthenticated()) {
                if (!widget.nodes.messengerPanel) {
                    widget.nodes.messengerPanel = widget.addPanel(options.panelId, options);
                    widget.nodes.messengerFrame = widget.nodes.messengerPanel.querySelector(".weavy-panel-frame");

                    if (widget.plugins.dock) {
                        widget.nodes.messengerButtonContainer = widget.addButton(options.panelId, options)
                        widget.nodes.messengerButton = widget.nodes.messengerButtonContainer.querySelector(".weavy-button");

                        widget.nodes.conversations = document.createElement("div");
                        widget.nodes.conversations.className = "weavy-conversations";
                        widget.nodes.conversations.setAttribute("draggable", "false");
                        widget.nodes.messengerButton.appendChild(widget.nodes.conversations);

                        widget.one("after:build", function (e) {
                            widget.nodes.dock.insertBefore(widget.nodes.messengerButtonContainer, widget.nodes.bubblesGlobal);
                        });
                    }
                }

                // Update messenger conversations
                widget.unreadConversations = options.conversations || [];
                if (widget.unreadConversations) {
                    updateConversations.call(widget, widget.unreadConversations);
                }
            }
        });

        widget.on("options", function (e) {
            var options = widget.options.plugins[PLUGIN_NAME];
            if (widget.nodes.conversations && widget.isAuthenticated()) {
                // Update messenger conversations
                widget.unreadConversations = options.conversations || [];
                if (widget.unreadConversations) {
                    updateConversations.call(widget, widget.unreadConversations);
                }

            }
        });

        widget.on("badge", function (e, data) {
            widget.setBadge(widget.nodes.messengerButton, data.conversations);
        });

        widget.on("signing-out", function () {
            var options = widget.options.plugins[PLUGIN_NAME];

            widget.removePanel(options.panelId)

            if (widget.plugins.dock) {
                widget.removeButton(options.panelId);
            }

            widget.nodes.messengerPanel = null;
            widget.nodes.messengerFrame = null;
            widget.nodes.messengerButtonContainer = null;
            widget.nodes.messengerButton = null;
            widget.nodes.conversations = null;
        });

        widget.on("signed-out", function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            options.conversations = null;
            widget.unreadConversations = [];
        })
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.messenger.defaults = {
     *     icon: '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6m8 3H6v-2h8m4-4H6V6h12"></path></svg></div>',
     *     iconTransparent: true,
     *     panelId: "messenger"
     * };
     * 
     * @name defaults
     * @memberof messenger
     * @type {Object}
     * @property {html} icon - Icon for the messenger button
     * @property {bool} iconTransparent=true - Transparency setting for the messenger button
     * @property {string} panelId=messenger - Default name for the messenger panel
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        icon: '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6m8 3H6v-2h8m4-4H6V6h12"></path></svg></div>',
        iconTransparent: true,
        panelId: "messenger"
    };

    /**
     * Non-optional dependencies.
     * - {@link context}
     * - {@link panels}
     * 
     * @name dependencies
     * @memberof messenger
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = ["context", "panels"];

})(jQuery);

/**
 * @external ISODateTime
 * @see https://en.wikipedia.org/wiki/ISO_8601
 */

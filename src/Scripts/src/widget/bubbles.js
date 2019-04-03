(function ($) {
    var PLUGIN_NAME = "bubbles";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * State machine for bubbles.
     * 
     * @module bubbles
     * @returns {WeavyWidget.plugins.bubbles}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * @typedef Bubble
         * @type {Object}
         * @property {int} bubbleId - Bubble ID
         * @property {int} spaceId - The id of space which the bubble is representing
         * @property {string} name - Name of the space
         * @property {string} [teamname] - Optional name of the team used for mentions etc.
         * @property {url} url - The URL to the space
         * @property {url} icon - The url to the space icon. Size 32x32 (retina when needed)
         * @property {bool} isAdmin - True if the user is admin in the space
         * @property {bool} isStarred - True if the space is starred by the user
         * @property {url} connectedToUrl - Url which the space is connected to. Only available on global bubbles.
         * @property {string} type - The kind of bubble. <br> • **global** - connected to the current URL<br> • **personal** - Opened by the user<br> • **detached** - Currently open, but neither global nor personal.
         */

        /**
         *  Reference to this instance
         *  @lends module:bubbles#
         */
        var widget = this;

        var requestOpen = [];

        /**
         * List of all bubbles for the current context.
         * 
         * @category properties
         * @type module:bubbles~Bubble[]
         */
        widget.bubbles = [];

        /**
         * The currently open bubble if any, otherwise `null`.
         * 
         * @category properties
         * @type {?module:bubbles~Bubble}
         */
        widget.currentBubble = null;

        /**
         * Finds a bubble from provided data. At least `spaceId` or `bubbleId` is required.
         * 
         * @param {} data
         * @param {int} data.bubbleId - Match bubble against bubble
         * @param {int} data.spaceId - Match bubble against spaceId
         * @param {string} [data.type] - Match bubble against bubble type
         * @returns {module:bubbles~Bubble}
         */
        widget.getBubble = function (data) {
            if (data) {
                return [].filter.call(widget.bubbles, function (bubble) {
                    var match = false;
                    // spaceId or bubbleId required
                    if (!data.spaceId && !data.bubbleId) {
                        return false;
                    }
                    if (!data.spaceId || data.spaceId === bubble.spaceId) {
                        match = true;
                    }
                    if (!data.bubbleId || data.bubbleId === bubble.bubbleId) {
                        match = true;
                    }
                    if (!bubble.type || bubble.type === data.type) {
                        match = true;
                    }
                    return match;
                }).pop();
            }
        }

        function checkBubbleLimit() {
            var options = widget.options.plugins[PLUGIN_NAME];

            // Truncate the array; only 16 spaces allowed
            if (widget.bubbles.length >= options.bubbleLimit) {
                widget.bubbles.length = Math.min(widget.bubbles.length, options.bubbleLimit);
                if (widget.plugins.alert) {
                    widget.alert("<strong>You reached the bubble limit</strong><br/>Please close some bubbles before you open another.");
                }
            }
        }

        function cleanSpaceDuplicates(bubblesList) {
            if (!bubblesList && !$.isArray(bubblesList)) {
                return [];
            }

            var cleanedList = widget.bubbles || [];
            bubblesList.forEach(function (bubble) {
                var previousIndex;

                // Find a matching previous bubble
                var previous = cleanedList.filter(function (b, i) {
                    var isMatch = parseInt(b.spaceId) === parseInt(bubble.spaceId);
                    if (isMatch) { previousIndex = i; }
                    return isMatch;
                }).pop();

                bubble.url = widget.httpsUrl(bubble.url);

                // If there is a previous bubble that is personal
                if (previous && previous.type !== "global") {
                    // replace the previous bubble with the current
                    cleanedList[previousIndex] = bubble;
                } else if (!previous) {
                    cleanedList.push(bubble);
                }
            });
            return cleanedList;
        }

        function preserveOpenBubble(bubbles) {
            var preserved = false;

            // bubbles, global and user added
            // Check if current open bubble is global and make sure it's not removed
            if (widget.currentBubble) {
                if (bubbles.indexOf(widget.currentBubble) !== -1) {
                    widget.currentBubble.type = "detached";
                    preserved = true;
                }
  
            }
            return preserved;
        }

        /**
         * Add one or several bubbles. Checks for duplicates and replaces existing bubbles with new.
         * 
         * @param {module:bubbles~Bubble[]} newBubbles
         */
        widget.addBubble = function(newBubbles) {
            var options = widget.options.plugins[PLUGIN_NAME];

            if (newBubbles) {
                newBubbles = Array.isArray(newBubbles) ? newBubbles : [newBubbles];

                newBubbles.forEach(function (newBubble) {

                    newBubble.url = widget.httpsUrl(newBubble.url);

                    // If space already exists
                    if (widget.bubbles.some(function (b) { return b.spaceId === newBubble.spaceId })) {
                        widget.bubbles = widget.bubbles.map(function (bubble) {
                            // Replace exisiting bubble with new bubble
                            if (bubble.spaceId === newBubble.spaceId) {
                                return newBubble;
                            } else {
                                return bubble;
                            }
                        });
                    } else {
                        // Try adding the new bubble
                        if (widget.bubbles.length >= options.bubbleLimit) {
                            if (widget.plugins.alert) {
                                widget.alert("<strong>You reached the bubble limit</strong><br/>Please close some bubbles before you open another.");
                            }
                            return;
                        } else {
                            widget.bubbles.push(newBubble);
                        }
                    }
                });
            }
        }

        /**
         * Remove a bubble.
         * 
         * @param {string} bubbleId - The id of the bubble
         * @param {Event} [event] - If an event is provided it will be prevented and propagation will be stopped. Useful for binding.
         */
        widget.removeBubble = function (bubbleId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            return $.ajax({
                url: widget.options.url + "api/bubble/" + bubbleId,
                type: "DELETE",
                contentType: "application/json",
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true
            });
        }

        /**
         * Removes all bubbles
         */
        widget.clearBubbles = function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            options.bubbles = [];
            widget.bubbles = [];
            widget.currentBubble = null;
        };

        widget.on("open", function (e, open) {
            var openedBubble = [].filter.call(widget.bubbles, function (bubble) {
                return open.panelId === "bubble-" + bubble.spaceId;
            });

            if (openedBubble.length) {
                widget.currentBubble = openedBubble.pop();
            }
        });

        widget.on("close", function (e, close) {
            widget.currentBubble = null;
        });

        // real-time events
        widget.on(weavy.realtime, "bubble-added.weavy", function (e, data) {
            // TODO: move connectedURL check to context.js?
            if (data.type === "personal" || data.type === "global" && (!widget.plugins["context"] || widget.plugins["context"].connectedUrl(data.connectedToUrl))) {
                if (data.type === "personal" && [].some.call(widget.bubbles, function (b) { return parseInt(b.spaceId) === parseInt(data.spaceId) && b.type === "global"; })) {
                    data.type = "global";
                }

                widget.addBubble(data);

                /**
                 * Triggered when a new bubble is received from the server. The new bubble is available as event data. 
                 * 
                 * @event module:bubbles#bubble-added
                 * @category events
                 * @returns {Bubble}
                 */
                widget.triggerEvent("bubble-added", data);

                // Is the space requested to open?
                var shouldOpen = data.spaceId && requestOpen.indexOf(data.spaceId) !== -1;
                if (shouldOpen) {
                    requestOpen.splice(requestOpen.indexOf(data.spaceId), 1);
                    widget.open("bubble-" + data.spaceId);
                }
            }
        });

        widget.on(weavy.realtime, "bubble-removed.weavy", function (e, data) {
            var bubbleIsRemoved = false;
            // remove from array of added bubbles
            widget.bubbles = [].filter.call(widget.bubbles, function (bubble) {
                if (data.spaceId === bubble.spaceId && data.bubbleId === bubble.bubbleId && bubble.type === data.type) {
                    var isPreserved = preserveOpenBubble([data]);
                    if (!isPreserved) {
                        bubbleIsRemoved = true
                        return false;
                    }
                }
                return true;
            });

            if (bubbleIsRemoved) {
               /**
                 * Triggered when a bubble is removed from the server. The removed bubble is available as event data. 
                 * 
                 * @event module:bubbles#bubble-removed
                 * @category events
                 * @returns {Bubble}
                 */
                widget.triggerEvent("bubble-removed", data);
            }
        });

        widget.on(weavy.realtime, "space-trashed.weavy", function (e, data) {
            // remove from array of added bubbles
            widget.bubbles = [].filter.call(widget.bubbles, function (bubble) {
                if (data.id === bubble.spaceId) {
                    /**
                     * Triggered when a space is trashed on the server. The new bubble is available as event data. 
                     * 
                     * @event module:bubbles#space-trashed
                     * @category events
                     * @returns {Object}
                     * @property {int} id - The id of the trashed space
                     */
                    widget.triggerEvent("space-trashed", data);
                    return false;
                }
                return true;
            });
        })

        widget.on("before:options", function (e, options) {
            if (options.plugins.bubbles && $.isArray(options.plugins.bubbles.bubbles)) {
                var bubbleOptions = options.plugins.bubbles;
                bubbleOptions.bubbles = cleanSpaceDuplicates(bubbleOptions.bubbles);
                if (widget.plugins.context) {
                    bubbleOptions.bubbles = bubbleOptions.bubbles.filter(function (bubble) {
                        return !bubble.connectedToUrl || widget.plugins.context.connectedUrl(bubble.connectedToUrl);
                    });
                }
                widget.bubbles = bubbleOptions.bubbles;
                checkBubbleLimit();
            }

            return options;
        });

        widget.on("signing-out", function () {
            var removedBubble;
            while (removedBubble = widget.bubbles.pop()) {
                widget.triggerEvent("bubble-removed", removedBubble);
            }
        });

        widget.on("signed-out", widget.clearBubbles);

        // Message events
        widget.on("message", function (e, message) {
            var spaceId, destination, bubble;

            switch (message.name) {
                case "request:open":

                    spaceId = message.spaceId;
                    destination = message.destination;
                    bubble = widget.bubbles.filter(function (b) { return parseInt(b.spaceId) === parseInt(spaceId) });
                    if (bubble.length) {
                        widget.open("bubble-" + spaceId, destination);
                    } else {
                        widget.close();
                        requestOpen.push(spaceId);
                    }
                    break;
                case "request:close":
                    // get the requesting space
                    bubble = widget.getBubble({ spaceId: message.spaceId });

                    if (bubble.type !== "detached") {
                        widget.removeBubble(bubble.bubbleId);
                    } else {
                        widget.triggerEvent("bubble-removed", bubble);
                    }
                    break;
            }
        });

        // Exports
        return {}
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.bubbles.defaults = {
     *     bubbleLimit: 16
     * };
     * 
     * @name defaults
     * @memberof module:bubbles
     * @type {Object}
     * @property {int} [bubbleLimit=16] - Maximum number of bubbles. Any bubbles exceeding this number will be truncated.
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        bubbleLimit: 16
    };

})(jQuery);

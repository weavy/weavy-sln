(function ($) {
    var PLUGIN_NAME = "context";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Handles location changes and context features.
     * Adds connect and disconnect buttons to bubble icons in the {@link dock}.
     * 
     * @mixin context
     * @returns {Weavy.plugins.context}
     * @typicalname weavy
     * @property {context~connectedUrl} .connectedUrl()
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends context#
         */
        var weavy = this;

        // appends a string after the text if it does not already exist.
        function addTrailing(text, trailing) {
            return text.lastIndexOf(trailing) === text.length - trailing.length ? text : text + trailing;
        }

        /**
         * Checks if the url matches the current context url `document.location.href`. A star may be provided in the end of the url to use wildcard matching.
         * 
         * @example
         * var isConnected = weavy.plugins.context.connectedUrl("http://www.weavy.com/");
         * var isWildcardConnected = weavy.plugins.context.connectedUrl("http://www.weavy.com/*");
         * 
         * @inner
         * @memberof context
         * @param {url} url - The url to match against current location. The url may end with a wildcard `*`.
         */
        function connectedUrl(url) {
            if (!url) {
                return false;
            }
            if (document.location.href === url) { return true; }
            if (url.lastIndexOf("/") === url.length && addTrailing(document.location.href, "/") === url) { return true; }
            if (url.substr(-1) === "*") {
                if (document.location.href.indexOf(url.substr(0, url.length - 1)) !== -1) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Opens a bubble from the given context data. Initiated from a frame when the page is loaded.
         * 
         * @param {Object} weavyContext
         * @param {int} weavyContext.spaceId - The id of the space to open
         * @param {url} weavyContext.url - The url in the space
         */
        weavy.openContextFrame = function (weavyContext) {
            if (weavyContext) {                                
                var contextData = JSON.parse(weavyContext);                                                
                weavy.open(contextData.panelId, contextData.url);
            }
        }


        /**
         * Shows the connect space modal in a bubble panel
         * 
         * @param {int} id - spaceId or bubbleId for the space where the modal should be shown
         * @param {string} type - "space" or "bubble". Indicates which type of id that is used.
         * @param {Event} [event] - Optional event that will be prevented and have propagation stopped.
         */
        weavy.connectBubble = function (spaceId, type, event) {

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            var activeFrame = $(".weavy-panel.weavy-open iframe.weavy-panel-frame", weavy.nodes.container);

            if (activeFrame.length) {
                activeFrame[0].contentWindow.postMessage({ "name": "connect", url: document.location.href, id: spaceId, type: type }, "*");
            }
        }

        weavy.on("location-changed", function (objEvent, objData) {
            $("iframe.weavy-panel-frame", weavy.nodes.container).each(function () {
                if ($(this)[0].contentWindow !== null) {
                    $(this)[0].contentWindow.postMessage({ "name": "context-url", "value": objData.currentHref, 'title': document.title, 'origin': document.location.origin }, "*");
                }
            });
            weavy.reload();
        });

        // Message events
        weavy.on("message", function (e, message) {
            e = e.originalEvent || e;
            var spaceId, bubble, type;

            switch (message.name) {
                case "request:connect":
                    weavy.connectBubble.call(weavy, message.spaceId, "space");
                    break;
                case "request:disconnect":
                    // get the requesting space
                    spaceId = message.spaceId;
                    bubble = [].filter.call(weavy.bubbles, function (b) { return b.spaceId === spaceId }).pop();

                    type = bubble ? bubble.type : "personal";

                    if (type === "global") {
                        weavy.removeBubble.call(weavy, bubble.bubbleId);
                    }
                    break;
                case "request:url":
                    // get the requesting space                    
                    type = "";

                    if (weavy.plugins.bubbles) {
                        bubble = [].filter.call(weavy.bubbles, function (b) { return b.spaceId === message.spaceId }).pop();
                        type = bubble ? bubble.type : "personal";
                    }
                    
                    e.source.postMessage({ name: 'context-url', 'value': window.location.href, 'title': document.title, 'origin': document.location.origin, 'type': type }, "*");
                    break;
                case "set:context-url":
                    window.location.href = e.data.context;
                    break;
            }
        });

        // Widget events
        weavy.on("ready", function (e, ready) {            
            if (ready.context) {                
                weavy.openContextFrame(ready.context);
            }
        });

        weavy.on("bubble-init", function (ev, data) {
            var options = weavy.options.plugins[PLUGIN_NAME];

            var bubble = data.bubble;
            var panel = data.panel;
            var buttonContainer = data.container;

            if (data.isAdded) {
                if (bubble.isAdmin) {
                    var disconnect = document.createElement("a");
                    disconnect.className = "weavy-bubble-action weavy-bubble-disconnect";
                    disconnect.title = options.disconnect.title;
                    disconnect.innerHTML = options.disconnect.icon;
                    weavy.on(disconnect, "click", function (e) { weavy.removeBubble.call(weavy, buttonContainer.dataset["bubbleId"], e); });
                    buttonContainer.appendChild(disconnect);

                    var connect = document.createElement("a");
                    connect.className = "weavy-bubble-action weavy-bubble-connect";
                    connect.title = options.connect.title;
                    connect.innerHTML = options.connect.icon;
                    weavy.on(connect, "click", function (e) {
                        var thisBubble = weavy.getBubble(bubble);
                        if (thisBubble.type === "detached") {
                            weavy.connectBubble.call(weavy, bubble.spaceId, "space", e);
                        } else {
                            weavy.connectBubble.call(weavy, buttonContainer.dataset["bubbleId"], "bubble", e);
                        }
                    });
                    buttonContainer.appendChild(connect);
                }
            } else {
                var frame = panel.querySelector("iframe");
                if (frame.src) {
                    frame.contentWindow.postMessage({ name: 'context-url', 'value': window.location.href, 'title': document.title, 'origin': document.location.origin, 'type': bubble.type }, "*");
                }
            }
        });

        // Location listener

        // default to the current location.
        var strLocation = window.location.href;
        var strHash = window.location.hash;
        var strPrevLocation = "";
        var strPrevHash = "";
        var intIntervalTime = 100;
        var _checkInterval = null;

        // removes the pound from the hash.
        var fnCleanHash = function (strHash) {
            return (
                strHash.substring(1, strHash.length)
            );
        }

        // check for changes in the window location.
        var fnCheckLocation = function () {

            if (strLocation !== window.location.href) {

                // store the new and previous locations.
                strPrevLocation = strLocation;
                strPrevHash = strHash;
                strLocation = window.location.href;
                strHash = window.location.hash;


                // trigger event
                weavy.triggerEvent("location-changed", {
                    currentHref: strLocation,
                    currentHash: fnCleanHash(strHash),
                    previousHref: strPrevLocation,
                    previousHash: fnCleanHash(strPrevHash)
                });

            }
        }

        // set an interval to check the location changes.
        _checkInterval = setInterval(fnCheckLocation, intIntervalTime);

        weavy.on("destroy", function () {
            clearInterval(_checkInterval);
        });

        // Exports
        return { connectedUrl: connectedUrl }
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.context.defaults = {
     *     connect: {
     *         icon: '<svg viewBox="0 0 24 24"><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"></path></svg>',
     *         title: "Connect to url"
     *     },
     *     disconnect: {
     *         icon: '<svg viewBox="0 0 24 24"><path d="M2 5.27L3.28 4 20 20.72 18.73 22l-4.83-4.83-2.61 2.61a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l2.62-2.6-1.62-1.61c-.01.24-.11.49-.29.68-.39.39-1.03.39-1.42 0A4.973 4.973 0 0 1 7.72 11L2 5.27m10.71-1.05a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.33 3.33-1.41-1.42 3.33-3.33m.7 4.95c.39-.39 1.03-.39 1.42 0a4.999 4.999 0 0 1 1.23 5.06l-1.78-1.77c-.05-.68-.34-1.35-.87-1.87a.973.973 0 0 1 0-1.42z"></path></svg>',
     *         title: "Disconnect from url"
     *     }
     * };
     * 
     * @name defaults
     * @memberof context
     * @type {Object}
     * @property {Object} connect
     * @property {html} connect.icon - `<svg/>` Icon for the connect button. Provided as HTML string.
     * @property {string} connect.title - Title of the connect button.
     * @property {Object} disconnect
     * @property {html} disconnect.icon - `<svg/>` Icon for the disconnect button. Provided as HTML string.
     * @property {string} disconnect.title - Title of the disconnect button.
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        connect: {
            icon: '<svg viewBox="0 0 24 24"><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"></path></svg>',
            title: "Connect to url"
        },
        disconnect: {
            icon: '<svg viewBox="0 0 24 24"><path d="M2 5.27L3.28 4 20 20.72 18.73 22l-4.83-4.83-2.61 2.61a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l2.62-2.6-1.62-1.61c-.01.24-.11.49-.29.68-.39.39-1.03.39-1.42 0A4.973 4.973 0 0 1 7.72 11L2 5.27m10.71-1.05a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.33 3.33-1.41-1.42 3.33-3.33m.7 4.95c.39-.39 1.03-.39 1.42 0a4.999 4.999 0 0 1 1.23 5.06l-1.78-1.77c-.05-.68-.34-1.35-.87-1.87a.973.973 0 0 1 0-1.42z"></path></svg>',
            title: "Disconnect from url" 
        }
    };

    /**
     * Non-optional dependencies.
     * 
     * @ignore
     * @name dependencies
     * @memberof context
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = [];

})(jQuery);

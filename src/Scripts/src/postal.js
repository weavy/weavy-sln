/* eslint-env commonjs, amd, jquery */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.wvy = root.wvy || {};
        root.wvy.postal = root.wvy.postal || new factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {

    //console.debug("postal.js", window.name);

    function eqObjects(a, b, skipLength) {
        if (!$.isPlainObject(a) || !$.isPlainObject(b)) {
            return false;
        }

        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        if (!skipLength && aProps.length !== bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        return true;
    }

    var WeavyPostal = function () {
        /**
         *  Reference to this instance
         *  @lends WeavyPostal#
         */
        var postal = this;

        var inQueue = [];
        var parentQueue = [];
        var messageListeners = [];
        var contentWindows = new Set();
        var contentWindowsByWeavyId = new Map();
        var contentWindowOrigins = new WeakMap();
        var contentWindowNames = new WeakMap();
        var contentWindowWeavyIds = new WeakMap();

        var _whenLeader = $.Deferred();
        var _isLeader = null;

        var _parentWeavyId = null;
        var _parentWindow = null;
        var _parentOrigin = null;
        var _parentName = null;
        var _origin = extractOrigin(window.location.href);

        function extractOrigin(url) {
            var extractOrigin = null;
            try {
                extractOrigin = /^((?:https?:\/\/[^/]+)|(?:file:\/\/))\/?/.exec(url)[1]
            } catch (e) {
                console.error("wvy.postal: Unable to resolve location origin. Make sure you are using http, https or file protocol and have a valid location URL.");
            }
            return extractOrigin;
        }

        function distributeMessage(e) {
            var fromSelf = e.source === window && e.origin === _origin;
            var fromParent = e.source === _parentWindow && e.origin === _parentOrigin;
            var fromFrame = contentWindowOrigins.has(e.source) && e.origin === contentWindowOrigins.get(e.source);

            if (fromSelf || fromParent || fromFrame) {

                var genericDistribution = !e.data.weavyId || e.data.weavyId === true;

                if (fromFrame && !e.data.windowName) {
                    e.data.windowName = contentWindowNames.get(e.source);
                }

                var messageName = e.data.name;
                if (messageName === "distribute") {
                    if (_isLeader) {
                        return;
                    }
                    e.data.name = e.data.distributeName;
                }

                //console.debug("wvy.postal:" + (window.name ? " " + window.name : "") + " message from", fromSelf && "self" || fromParent && "parent" || fromFrame && "frame " + e.data.windowName, e.data.name);

                messageListeners.forEach(function (listener) {
                    var matchingName = listener.name === messageName || listener.name === "message";
                    var genericListener = listener.selector === null;
                    var matchingWeavyId = listener.selector === e.data.weavyId;
                    var matchingDataSelector = $.isPlainObject(listener.selector) && eqObjects(listener.selector, e.data, true);

                    if (matchingName && (genericDistribution || genericListener || matchingWeavyId || matchingDataSelector)) {

                        listener.handler(e, e.data);

                        if (listener.once) {
                            off(listener.name, listener.selector, listener.handler);
                        }
                    }
                });
            }
        }

        window.addEventListener("message", function (e) {
            if (e.data.name && e.data.weavyId !== undefined) {
                switch (e.data.name) {
                    case "register-child":
                        if (!_parentWindow) {
                            if (!contentWindowWeavyIds.has(e.source)) {
                                console.debug("wvy.postal: child contentwindow not found, registering frame");
                                // get the real frame window
                                var frameWindow = Array.from(window.frames).filter(function (frame) {
                                    return frame === e.source;
                                }).pop();

                                if (frameWindow) {
                                    // get the frame element
                                    var frameElement, frameName;

                                    try {
                                        // get iframe by name, name may be blocked by cors
                                        frameElement = frameWindow.parent.document.getElementsByName(frameWindow.name)[0];
                                        frameName = frameWindow.name;
                                    } catch (e) {
                                        // get iframe by comparison
                                        frameElement = Array.from(frameWindow.parent.document.getElementsByTagName("iframe")).filter(function (iframe) {
                                            return iframe.contentWindow === frameWindow;
                                        }).pop();

                                        if (frameElement) {
                                            frameWindow = frameElement.contentWindow;

                                            if (frameElement.hasAttribute("name")) {
                                                frameName = frameElement.getAttribute("name");
                                            } else {
                                                frameName = null;
                                                console.warn("could not get name attribute of the iframe", frameElement)
                                            }
                                        }
                                    }

                                    if (frameElement && frameName) {
                                        var frameWeavyId = frameElement.dataset.weavyId;
                                        registerContentWindow(frameWindow, frameName, frameWeavyId);
                                    } else {
                                        var msg = "wvy.postal: did not register frame"
                                        if (!frameName) {
                                            msg += "; name attribute is missing";
                                        }
                                        if (!frameElement) {
                                            msg += "; frame not accessible";
                                        }
                                        console.warn(msg);
                                    }
                                }
                            }

                            try {
                                var weavyId = contentWindowWeavyIds.get(e.source);
                                var contentWindowName = contentWindowNames.get(e.source);

                                if (contentWindowName) {
                                    e.source.postMessage({
                                        name: "register-window",
                                        windowName: contentWindowName,
                                        weavyId: weavyId || true,
                                    }, "*");
                                }
                            } catch (e) {
                                console.error("wvy.postal: Could not register frame window", weavyId, contentWindowName, e);
                            }
                        }
                        break;
                    case "register-window":
                        if (!_parentWindow) {
                            console.debug("wvy.postal: registering frame window", e.data.windowName);
                            _parentOrigin = e.origin;
                            _parentWindow = e.source;
                            _parentName = e.data.windowName;
                            _parentWeavyId = e.data.weavyId;
                        }

                        console.debug("wvy.postal: is not leader", window.name);
                        _isLeader = false;
                        _whenLeader.reject({ parentName: _parentName, parentWeavyId: _parentWeavyId, parentOrigin: _parentOrigin });

                        try {
                            e.source.postMessage({ name: "ready", windowName: e.data.windowName, weavyId: e.data.weavyId, location: window.location.href }, e.origin);
                        } catch (e) {
                            console.error("wvy.postal: register-window could not post back ready-message to source");
                        }

                        if (wvy.whenLoaded) {
                            wvy.whenLoaded.then(function () {
                                e.source.postMessage({ name: "load", windowName: e.data.windowName, weavyId: e.data.weavyId }, e.origin);
                            });
                        }

                        if (parentQueue.length) {
                            parentQueue.forEach(function (message) {
                                console.debug("wvy.postal: sending queued to parent:", message.name);

                                postToParent(message)
                            });
                            parentQueue = [];
                        }

                        if (inQueue.length) {
                            inQueue.forEach(function (messageEvent) {
                                distributeMessage(messageEvent)
                            });
                            inQueue = [];
                        }

                        break;
                    case "ready":
                        if (contentWindowsByWeavyId.has(e.data.weavyId) && contentWindowNames.has(e.source) && contentWindowsByWeavyId.get(e.data.weavyId).get(contentWindowNames.get(e.source))) {
                            contentWindowOrigins.set(e.source, e.origin);
                            distributeMessage(e);
                        }

                        break;
                    case "reload":
                        window.location.reload();
                        break;
                    default:
                        if (e.source === window || _parentWindow || contentWindowsByWeavyId.size) {
                            distributeMessage(e);
                        } else {
                            inQueue.push(e);
                        }

                        break;
                }
            }
        });

        function on(name, selector, handler) {
            if (typeof arguments[1] === "function") {
                // omit weavyId argument
                handler = arguments[1];
                selector = null;
            }
            messageListeners.push({ name: name, handler: handler, selector: selector });
        }

        function one(name, selector, handler) {
            if (typeof arguments[1] === "function") {
                // omit weavyId argument
                handler = arguments[1];
                selector = null;
            }
            messageListeners.push({ name: name, handler: handler, selector: selector, once: true });
        }

        function off(name, selector, handler) {
            if (typeof arguments[1] === "function") {
                // omit weavyId argument
                handler = arguments[1];
                selector = null;
            }
            messageListeners = messageListeners.filter(function (listener) {
                var nameMatch = name === listener.name;
                var handlerMatch = handler === listener.handler;
                var stringSelectorMatch = typeof selector === "string" && selector === listener.selector;
                var plainObjectMatch = $.isPlainObject(selector) && eqObjects(selector, listener.selector);
                var offMatch = nameMatch && handlerMatch && (stringSelectorMatch || plainObjectMatch);
                return !(offMatch);
            });
        }

        /**
         * Sends the id of a frame to the frame content scripts, so that the frame gets aware of which id it has.
         * The frame needs to have a unique name attribute.
         *
         * @category panels
         * @param {string} weavyId - The id of the group or entity which the contentWindow belongs to.
         * @param {Window} contentWindow - The frame window to send the data to.
         */
        function registerContentWindow(contentWindow, contentWindowName, weavyId) {
            try {
                if (!contentWindowName) {
                    console.error("wvy.postal: registerContentWindow() No valid contentWindow to register, must be a window and have a name.");
                    return;
                }
            } catch (e) {
                console.error("wvy.postal: registerContentWindow() cannot access contentWindowName")
            }

            if (!weavyId || weavyId === "true") {
                weavyId = true;
            }

            if (!contentWindowsByWeavyId.has(weavyId)) {
                contentWindowsByWeavyId.set(weavyId, new Map());
            }

            contentWindowsByWeavyId.get(weavyId).set(contentWindowName, contentWindow);
            contentWindows.add(contentWindow);
            contentWindowNames.set(contentWindow, contentWindowName);
            contentWindowWeavyIds.set(contentWindow, weavyId);
        }

        function unregisterWeavyId(weavyId) {
            if (contentWindowsByWeavyId.has(weavyId)) {
                contentWindowsByWeavyId.get(weavyId).forEach(function (contentWindow, contentWindowName) {
                    unregisterContentWindow(contentWindowName, weavyId);
                });
                contentWindowsByWeavyId.get(weavyId)
                contentWindowsByWeavyId.delete(weavyId);
            }
        }

        function unregisterContentWindow(windowName, weavyId) {
            if (contentWindowsByWeavyId.has(weavyId)) {
                if (contentWindowsByWeavyId.get(weavyId).has(windowName)) {
                    var contentWindow = contentWindowsByWeavyId.get(weavyId).get(windowName);
                    try {
                        contentWindows.delete(contentWindow);
                        contentWindowNames.delete(contentWindow);
                        contentWindowWeavyIds.delete(contentWindow);
                    } catch (e) {}
                }
                contentWindowsByWeavyId.get(weavyId).delete(windowName);
                if (contentWindowsByWeavyId.get(weavyId).size === 0) {
                    try {
                        contentWindowsByWeavyId.delete(weavyId);
                    } catch (e) {}
                }
            }
        }

        function postToChildren(message, transfer) {
            if (typeof message !== "object" || !message.name) {
                console.error("wvy.postal: postToChildren() Invalid message format", message);
                return;
            }

            if (transfer === null) {
                // Chrome does not allow transfer to be null
                transfer = undefined;
            }

            message.distributeName = message.name;
            message.name = "distribute";
            message.weavyId = message.weavyId || true;

            contentWindows.forEach(function (contentWindow) {
                try {
                    contentWindow.postMessage(message, "*", transfer);
                } catch (e) {
                    console.warn("wvy.postal: postToChildren() could not distribute message to " + contentWindowNames.get(contentWindow))
                }
            })

        }

        function postToFrame(windowName, weavyId, message, transfer) {
            if (typeof message !== "object" || !message.name) {
                console.error("wvy.postal: postToFrame() Invalid message format", message);
                return;
            }

            if (transfer === null) {
                // Chrome does not allow transfer to be null
                transfer = undefined;
            }

            var contentWindow;
            try {
                contentWindow = contentWindowsByWeavyId.get(weavyId).get(windowName);
            } catch (e) {
                console.error("wvy.postal: postToFrame() Window not registered", weavyId, windowName);
            }

            if (contentWindow) {
                message.weavyId = weavyId;
                try {
                    contentWindow.postMessage(message, "*", transfer);
                } catch (e) {
                    console.error("wvy.postal: postToFrame() Could not post message to frame", windowName)
                }
            }
        }

        function postToSelf(message, transfer) {
            if (typeof message !== "object" || !message.name) {
                console.error("wvy.postal: postToSelf() Invalid message format", message);
                return;
            }

            if (transfer === null) {
                // Chrome does not allow transfer to be null
                transfer = undefined;
            }

            message.weavyId = _parentWeavyId || true;

            try {
                window.postMessage(message, extractOrigin(window.location.href) || "*", transfer);
            } catch (e) {
                console.error("wvy.postal: postToSelf() Could not post message to self");
            }
        }

        function postToParent(message, transfer, allowInsecure) {
            if (typeof message !== "object" || !message.name) {
                console.error("wvy.postal: postToParent() Invalid message format", message);
                return;
            }

            if (message.weavyId === undefined) {
                message.weavyId = _parentWeavyId;
            }

            if (transfer === null) {
                // Chrome does not allow transfer to be null
                transfer = undefined;
            }

            if (_parentWindow) {
                try {
                    if (_parentWindow && _parentWindow !== window) {
                        _parentWindow.postMessage(message, _parentOrigin || "*", transfer);
                    }
                } catch (e) {
                    console.error("wvy.postal: postToParent() Error posting message", message.name, e);
                }
            } else if (allowInsecure) {
                var parents = [];

                // Find all parent windows
                var nextWindow = window;
                while (nextWindow.top !== nextWindow) {
                    nextWindow = nextWindow.opener || nextWindow.parent;
                    parents.push(nextWindow);
                }

                parents.forEach(function (parent) {
                    try {
                        parent.postMessage(message, "*", transfer);
                        console.debug("wvy.postal: postToParent() Posted insecure message", message.name)
                    } catch (e) {
                        console.error("wvy.postal: postToParent() Error posting insecure message", message.name, e);
                    }
                });

            } else {
                console.debug("wvy.postal: postToParent() queueing to parent", message.name);
                parentQueue.push(message);
            }

        }

        function postToSource(e, message, transfer) {
            if (e.source && e.data.weavyId !== undefined) {
                var fromSelf = e.source === window.self && e.origin === _origin;
                var fromParent = e.source === _parentWindow && e.origin === _parentOrigin;
                var fromFrame = contentWindowOrigins.has(e.source) && e.origin === contentWindowOrigins.get(e.source);

                if (transfer === null) {
                    // Chrome does not allow transfer to be null
                    transfer = undefined;
                }

                if (fromSelf || fromParent || fromFrame) {
                    message.weavyId = e.data.weavyId;

                    try {
                        e.source.postMessage(message, e.origin, transfer);
                    } catch (e) {
                        console.error("wvy.postal: postToSource() Could not post message back to source");
                    }
                }
            }
        }

        function checkForParent() {
            var parents = [];

            // Find all parent windows
            var nextWindow = window.self;
            while (nextWindow.top !== nextWindow) {
                nextWindow = nextWindow.opener || nextWindow.parent;
                parents.unshift(nextWindow);
            }

            parents.forEach(function (parent) {
                try {
                    parent.postMessage({ name: "register-child", weavyId: true }, "*");
                    console.debug("wvy.postal: checking for parent")
                } catch (e) {
                    console.error("wvy.postal: Error checking for parent", e);
                }
            });

            requestAnimationFrame(function () {
                window.setTimeout(function () {
                    if (_whenLeader.state() === "pending") {
                        console.debug("wvy.postal: is leader");
                        _isLeader = true;
                        _whenLeader.resolve();
                    }
                }, parents.length ? 2000 : 100);
            });
        }

        $(document).on("click", "[data-weavy-event]", function (e) {
            e.preventDefault();

            var name = $(this).data("weavy-name");

            postToParent.call(postal, { name: name });
        });

        $(document).on("submit", "[data-weavy-event-notify]", function (e) {
            var name = $(this).data("weavyEventNotify");
            postToParent.call(postal, { name: name });
        });

        this.on = on;
        this.one = one;
        this.off = off;
        this.registerContentWindow = registerContentWindow;
        this.unregisterContentWindow = unregisterContentWindow;
        this.unregisterAll = unregisterWeavyId;
        this.postToFrame = postToFrame;
        this.postToParent = postToParent;
        this.postToSelf = postToSelf;
        this.postToSource = postToSource;
        this.postToChildren = postToChildren;
        this.extractOrigin = extractOrigin;
        this.whenLeader = _whenLeader.promise();

        Object.defineProperty(this, "messageListeners", {
            get: function () { return messageListeners; }
        });

        Object.defineProperty(this, "contentWindows", {
            get: function () {
                return {
                    contentWindowsByWeavyId,
                    contentWindows,
                    contentWindowNames,
                    contentWindowWeavyIds
                };
            }
        });


        Object.defineProperty(this, "isLeader", {
            get: function () { return _isLeader; }
        });
        Object.defineProperty(this, "parentWeavyId", {
            get: function () { return _parentWeavyId; }
        });
        Object.defineProperty(this, "parentName", {
            get: function () { return _parentName; }
        });
        Object.defineProperty(this, "parentOrigin", {
            get: function () { return _parentOrigin; }
        });

        checkForParent();
    };


    return new WeavyPostal();
}));


/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

/**
 * @external jqXHR
 * @see http://api.jquery.com/jQuery.ajax/#jqXHR
 */

/**
 * @external jqAjaxSettings
 * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
 */



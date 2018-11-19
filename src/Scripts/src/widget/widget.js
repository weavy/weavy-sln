(function ($) {
    console.debug("widget.js");

    // POLYFILLS

    // appends a string after the text if it does not already exist.
    String.prototype.addTrailing = function (trailing) {
        return this.endsWith(trailing) ? this : this + trailing;
    }

    // polyfill for ie
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function (search, this_len) {
            if (this_len === undefined || this_len > this.length) {
                this_len = this.length;
            }
            return this.substring(this_len - search.length, this_len) === search;
        };
    }

    // WEAVY PROTOTYPE

    this.WeavyWidget = function () {
        var widget = this;

        if (WeavyWidget.version) {
            console.log("WeavyWidget", WeavyWidget.version);
        }

        // public methods
        WeavyWidget.prototype.init = function () {
            connectAndLoad();
            widget.triggerEvent("init", null);
        }

        // sign in using external authentication provider
        WeavyWidget.prototype.signIn = function (username, password) {
            var dfd = $.Deferred();

            // listen to signedIn message
            window.addEventListener("message", function (e) {
                switch (e.data.name) {
                    case "signedIn":
                        dfd.resolve(true);
                        break;
                    case "authenticationError":
                        dfd.resolve(false);
                        break;
                }
            }, false);

            // post message to sign in user
            loadInTarget("personal", widget.options.url + "sign-in?path=/notify", "username=" + username + "&password=" + password, "POST");

            // return promise
            return dfd.promise();

        }

        // sign out using external authentication provider
        WeavyWidget.prototype.signOut = function () {
            var dfd = $.Deferred();

            // sign out user in Weavy
            loadInTarget("personal", widget.options.url + "sign-out?path=/notify", "", "GET");

            // listen to signedOut message
            window.addEventListener("message", function (e) {
                switch (e.data.name) {
                    case "signedOut":
                        dfd.resolve(true);
                        break;
                }
            }, false);

            return dfd.promise();
        }

        // open a conversation
        WeavyWidget.prototype.openConversation = function (conversationId, event) {
            event.preventDefault();
            event.cancelBubble = true;
            widget.messengerFrame.contentWindow.postMessage({ "name": "openConversation", "id": conversationId }, "*");
            widget.open("messenger");
        }

        // close open strip
        WeavyWidget.prototype.close = function () {
            var $openFrame = $(".weavy-strip.weavy-open iframe", widget.strips);

            $(widget.container).removeClass("weavy-open");
            $(".weavy-strip", widget.strips).removeClass("weavy-open");
            $(".weavy-button", widget.buttons).removeClass("weavy-open");
            $(".weavy-notification-frame", widget.container).remove();
            widget.triggerEvent("close", null);
            try {
                $openFrame[0].contentWindow.postMessage({ name: 'hide' }, "*");
            } catch (e) {
                console.debug("Could not postMessage:hide to frame");
            }
        }

        // open specified strip (personal, messenger or bubble)
        WeavyWidget.prototype.open = function (strip, destination) {
            // Treat strip numbers as bubbles
            if (strip === parseInt(strip, 10)) {
                strip = "bubble-" + strip;
            }
            if (widget.isBlocked) {
                fallback(strip, destination);
            } else {
                $(widget.container).addClass("weavy-open");

                var $strip = $("#weavy-strip-" + strip, widget.strips);
                if (!$strip.hasClass("weavy-open")) {
                    $(".weavy-strip", widget.strips).removeClass("weavy-open");
                    $(".weavy-button", widget.buttons).removeClass("weavy-open");
                    $(".weavy-button.weavy-" + strip, widget.buttons).addClass("weavy-open");
                    $("#weavy-strip-" + strip, widget.strips).addClass("weavy-open");
                    $(".weavy-notification-frame", widget.notifications).remove();

                    var $frame = $("iframe", $strip);

                    if (destination) {
                        // load destination
                        loadInTarget(strip, destination);
                        loading.call(widget, "weavy-strip-" + strip, true, true);
                    } else if (!$frame.attr("src") && $frame[0].dataset && $frame[0].dataset.src) {
                        // start predefined loading
                        $frame.attr("src", $frame[0].dataset.src);
                        loading.call(widget, "weavy-strip-" + strip, true);
                    } else {
                        // already loaded
                        try {
                            $frame[0].contentWindow.postMessage({ name: 'show' }, "*");
                        } catch (e) {
                            console.debug("Could not postMessage:show to frame");
                        }
                    }

                    widget.triggerEvent("open", { target: strip });
                }
            }
        }

        WeavyWidget.prototype.openContextFrame = function (weavyContext) {
            if (weavyContext) {
                var contextData = JSON.parse(weavyContext);
                if (contextData.space === -2) {
                    widget.open("messenger", contextData.url);
                } else {
                    widget.open("bubble-" + contextData.space, contextData.url);
                }
            }
        }

        // toggle (open/close) specified strip (personal, messenger or bubble)
        WeavyWidget.prototype.toggle = function (strip, event, force) {
            if (widget.isBlocked) {
                // NOTE: prevent incorrect fallback when result from pong has not yet been recieved. 
                // If blocked: wait 100ms and call the method again to allow the test to be concluded before opening a fallback window
                if (force) {
                    fallback(strip, null);
                } else {
                    // call toggle after 100ms with force = true
                    setTimeout(widget.toggle.bind(this, strip, null, true), 100);
                }
            } else {
                $(".weavy-button.weavy-" + strip, widget.container).hasClass("weavy-open") ? widget.close() : widget.open(strip);
            }
        }

        // remove a bubble
        WeavyWidget.prototype.removeBubble = function (id, event) {

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            return $.ajax({
                url: widget.options.url + "api/bubble/" + id,
                type: "DELETE",
                contentType: "application/json",
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true
            });
        }

        // show bubble modal
        WeavyWidget.prototype.connectBubble = function (id, type, event) {

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            var activeFrame = $(".weavy-strip.weavy-open iframe.weavy-strip-frame", widget.container);

            if (activeFrame.length) {
                activeFrame[0].contentWindow.postMessage({ "name": "connect", url: document.location.href, id: id, type: type }, "*");
            }
        }

        // resize the panel
        WeavyWidget.prototype.resize = function () {
            $(this.container).toggleClass("weavy-wide");
            widget.triggerEvent("resize", null);
        }

        // maximize the panel
        WeavyWidget.prototype.maximize = function () {
            $(this.container).addClass("weavy-wide");
            widget.triggerEvent("maximize", null);
        }

        // toggle preview window
        WeavyWidget.prototype.togglePreview = function () {
            $(this.container).toggleClass("weavy-preview");
            widget.triggerEvent("resize", null);
        }


        // reload the page
        WeavyWidget.prototype.reload = function (options) {
            this.options = widget.extendDefaults(this.options, options);
            connectAndLoad();

            widget.triggerEvent("reload", this.options);
        }

        WeavyWidget.prototype.destroy = function () {
            weavy.connection.disconnect();
            $(widget.container).remove();
            widget.container = null;

            $(widget.root).remove();
            widget.root = null;

            widget.triggerEvent("destroyed", null);
        }

        // refresh a panel
        WeavyWidget.prototype.refresh = function (strip) {

            loading.call(this, strip, true);

            var $strip = $("#" + strip, this.container);

            var frame = $strip.find("iframe");

            frame[0].contentWindow.postMessage({ "name": "reload" }, "*");
            widget.triggerEvent("refresh", { 'strip': strip });
        }

        // resets a panel to its original src
        WeavyWidget.prototype.reset = function (strip) {
            loading.call(this, strip, true);
            var $strip = $("#" + strip, this.container);
            var frame = $strip.find("iframe");
            frame[0].src = frame[0].dataset.src || frame[0].src || "about:blank";
        }

        WeavyWidget.prototype.preloadFrame = function (frameElement, callback) {
            var strip = $(frameElement).closest(".weavy-strip").get(0);
            var bubbleTarget = strip && strip.id;
            var delayedFrameLoad = function () {
                if (!frameElement.src && frameElement.dataset.src) {
                    if (bubbleTarget) {
                        loading(bubbleTarget, true);
                    }
                    if (typeof callback === "function") {
                        $(frameElement).one("load", callback);
                    }
                    frameElement.src = frameElement.dataset.src;
                }
            };
            // Wait for idle
            if (window.requestIdleCallback) {
                window.requestIdleCallback(delayedFrameLoad);
            } else {
                if (document.readyState === "complete") {
                    delayedFrameLoad();
                } else {
                    $(document).one("load", delayedFrameLoad);
                }
            }

        }

        WeavyWidget.prototype.preloadFrames = function (force) {
            if (widget.options.is_mobile) {
                return;
            }

            if (!preloading) {
                console.debug("starting frames preloading");
                var $currentlyLoadingFrames = $(widget.strips).find("iframe[src][data-src]");
                if ($currentlyLoadingFrames.length) {
                    // Wait until user loaded frames has loaded
                    $currentlyLoadingFrames.first().one("load", function () { widget.preloadFrames(force); });
                    return;
                }
            }
            if (!preloading || force) {
                preloading = true;

                var $systemFrames = $(widget.strips).find("iframe[data-src]:not([data-type]):not([src])");
                if ($systemFrames.length) {
                    $systemFrames.each(function () { widget.preloadFrame(this, function () { widget.preloadFrames(force) }) });
                } else if (force && !$(widget.strips).find("iframe[src][data-src]:not([data-type])").length) {
                    // After preloading system frames is done
                    var $strips = $(widget.strips).find("iframe[data-type]:not([src])");
                    if ($strips.length) {
                        widget.preloadFrame($strips[0]);
                        setTimeout(widget.preloadFrames, 1500, "all");
                    }
                }
            }
        }

        WeavyWidget.prototype.extendDefaults = function (source, properties) {
            source = source || {};
            properties = properties || {};

            var property;
            var https = properties.https || source.https || widget.options.https || true;

            // Make a copy
            var copy = {};
            for (property in source) {
                if (source.hasOwnProperty(property)) {
                    copy[property] = source[property];
                }
            }

            // Apply properties to copy
            for (property in properties) {
                if (properties.hasOwnProperty(property)) {
                    copy[property] = this.httpsUrl(properties[property], https);
                }
            }
            return copy;
        };

        WeavyWidget.prototype.httpsUrl = function (url, https) {
            https = https || widget.options.https;
            if (typeof url === "string") {
                if (https === "force") {
                    return url.replace(/^http:/, "https:");
                } else if (https === "adaptive") {
                    return url.replace(/^http:/, window.location.protocol);
                }
            }
            return url;
        };

        this.supportsShadowDOM = !!HTMLElement.prototype.attachShadow;
        this.root = null;

        var previewingFullscreen = false;
        var disconnected = false;
        var preloading = false;
        var requestOpen = [];

        // dom elements
        this.container = null;
        this.strips = null;
        this.spaces = null;
        this.buttons = null;
        this.draggable = null;
        this.notifications = null;

        this.personalStrip = null;
        this.personalFrame = null;
        this.personalButton = null;

        this.bubblesGlobal = null;
        this.bubblesPersonal = null;
        this.bubblesCache = null;
        this.addContainer = null;

        this.addStrip = null;
        this.addFrame = null;
        this.addButton = null

        this.messengerStrip = null;
        this.messengerFrame = null;
        this.messengerButton = null;

        this.toolTipTimout = null;
        this.toolTip = null;

        this.notificationSound = null;

        this.buttonCacheList = [];
        this.stripCacheList = [];

        this.bubbles = [];

        this.unreadConversations = [];

        this.dragData = null;

        this.isBlocked = false;

        this.options = WeavyWidget.defaults;

        // extend default options with the passed in arugments
        if (arguments[0] && typeof arguments[0] === "object") {
            this.options = widget.extendDefaults(WeavyWidget.defaults, arguments[0]);
        }

        // Run plugins
        // Disable all plugins by setting plugin option to false
        if (this.options.plugins !== false) {
            this.options.plugins = this.options.plugins || {};

            for (plugin in WeavyWidget.plugins) {
                if (typeof WeavyWidget.plugins[plugin] === "function") {

                    // Disable plugins by setting plugin options to false
                    if (this.options.plugins[plugin] !== false) {
                        console.debug("Running WeavyWidget plugin:", plugin);
                        this.options.plugins[plugin] = widget.extendDefaults(WeavyWidget.plugins[plugin].defaults, typeof this.options.plugins[plugin] === "object" && this.options.plugins[plugin] || {});
                        WeavyWidget.plugins[plugin].call(this, this.options.plugins[plugin]);
                    }
                }
            }
        }


        $(document).on("locationchanged.event.weavy", function (objEvent, objData) {
            $("iframe.weavy-strip-frame", widget.container).each(function () {
                if ($(this)[0].contentWindow !== null) {
                    $(this)[0].contentWindow.postMessage({ "name": "context-url", "value": objData.currentHref, 'title': document.title, 'origin': document.location.origin }, "*");
                }
            });
            connectAndLoad();
        });

        function connectAndLoad() {
            connect.call(widget).then(function () {
                widget.options.conversations = null;
                widget.options.is_loaded = false;
                widget.options.href = window.location.href;
                weavy.realtime.invoke("widget", "load", widget.options);
            });
        }

        function showAlert(message, sticky) {
            var alertMessage = document.createElement("div");
            alertMessage.className = "weavy-alert-message fade in";
            alertMessage.innerHTML = message;
            if (!sticky) {
                setTimeout(function () {
                    alertMessage.classList.remove("in");
                }, 5000);
                setTimeout(function () {
                    $(alertMessage).remove();
                }, 5200);
            }
            widget.container.appendChild(alertMessage);
        }

        function removeBubbleItems(bubbleId, noCache, keepOpen) {
            var strip = widget.container.querySelector("#weavy-strip-bubble-" + bubbleId);
            if (strip) {
                var frame = strip.querySelector(".weavy-strip-frame");
                var buttonContainer = widget.container.querySelector("#weavy-bubble-" + bubbleId);

                var duplicateButton = function (buttonContainer) {
                    var buttonContainerCopy = buttonContainer.cloneNode(true);
                    buttonContainerCopy.id = buttonContainer.id + "duplicate";

                    var button = buttonContainerCopy.querySelector(".weavy-button");
                    buttonContainerCopy.classList.add("weavy-bubble-item-duplicate", "weavy-disabled");

                    if (!keepOpen && button.classList.contains("weavy-open")) {
                        requestAnimationFrame(function () {
                            button.classList.remove("weavy-open");
                            setTimeout(function () { buttonContainerCopy.classList.add("weavy-removed"); }, 250);
                            setTimeout(function () { $(buttonContainerCopy).remove() }, 450);
                        });
                    } else {
                        requestAnimationFrame(function () {
                            buttonContainerCopy.classList.add("weavy-removed");
                            setTimeout(function () { $(buttonContainerCopy).remove() }, 200);
                        });
                    }

                    buttonContainer.parentNode.insertBefore(buttonContainerCopy, buttonContainer);

                    return buttonContainerCopy;
                };

                var removeBubbleElements = function () {
                    if (noCache) {
                        // remove from signalR connections
                        weavy.connection.removeWindow(frame.contentWindow);
                        removeBubbleCache(bubbleId);
                    } else {
                        strip.classList.add("weavy-cache-hidden");
                    }
                };

                if (buttonContainer.parentNode && buttonContainer.parentNode.classList.contains("weavy-cache")) {
                    removeBubbleElements();
                    return;
                }

                duplicateButton(buttonContainer);
                widget.bubblesCache.appendChild(buttonContainer);
                buttonContainer.classList.add("weavy-disabled", "weavy-removed");

                if (!keepOpen) {
                    buttonContainer.querySelector(".weavy-button").classList.remove("weavy-open");

                    if (strip.classList.contains("weavy-open")) {
                        widget.container.classList.remove("weavy-open");
                        strip.classList.remove("weavy-open");
                        setTimeout(removeBubbleElements, 250);
                    } else {
                        setTimeout(removeBubbleElements, 0);
                    }
                }

            }
        }

        function removeBubbleCache(bubbleId) {
            var $strip = $("#weavy-strip-bubble-" + bubbleId, widget.container);
            var $button = $("#weavy-bubble-" + bubbleId, widget.container);
            if ($strip.length) {
                widget.stripCacheList.splice(widget.stripCacheList.indexOf($strip[0]), 1);
                $strip.remove();
            }
            if ($button.length) {
                widget.buttonCacheList.splice(widget.buttonCacheList.indexOf($button[0]), 1);
                $button.remove();
            }
        }

        function truncateCache(limit) {
            var overload = Math.max(widget.buttonCacheList.length, limit) - limit;
            var unusedStrips = widget.buttonCacheList.filter(function (button, index) {
                return !button.parentNode || button.parentNode.classList.contains("weavy-cache");
            });
            for (var i = unusedStrips.length; i > unusedStrips.length - overload; i--) {
                removeBubbleCache(unusedStrips[i].id.replace(/^weavy-bubble-/, ''), true);
            }
        }


        function buildOutput() {
            // add container
            if (!this.container) {
                this.container = document.createElement("div");
                this.strips = document.createElement("div");
                this.spaces = document.createElement("div");
                this.draggable = document.createElement("div");
                this.statusFrame = document.createElement("iframe");
                this.weavyButtonContainer = document.createElement("div");
                this.weavyButton = document.createElement("div");
                this.personalStrip = document.createElement("div");
                this.personalFrame = document.createElement("iframe");
                this.personalButtonContainer = document.createElement("div");
                this.personalButton = document.createElement("div");
                this.personalTooltip = document.createElement("div");
                this.personalTooltipText = document.createElement("span");
                this.buttons = document.createElement("div");
                this.notifications = document.createElement("div");

                this.weavyButton.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + this.options.logo + '" />';
                this.personalButton.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg>'
                this.personalTooltipText.innerHTML = this.options.personal_title;

                this.statusFrame.addEventListener("load", function (a, b, c) {
                    // start testing for blocked iframe             
                    widget.isBlocked = true;
                    try {
                        this.contentWindow.postMessage({ "name": "ping" }, "*");
                    } catch (e) { console.warn("Frame postMessage is blocked", e); }

                }, false);

                this.container.appendChild(this.statusFrame);
                this.strips.appendChild(this.spaces);
                this.draggable.appendChild(this.weavyButtonContainer);
                this.weavyButtonContainer.appendChild(this.weavyButton);
                this.personalStrip.appendChild(renderControls.call(this, "weavy-strip-personal"));
                this.strips.appendChild(this.personalStrip);
                this.personalStrip.appendChild(this.personalFrame);
                this.draggable.appendChild(this.personalButtonContainer);
                this.personalButtonContainer.appendChild(this.personalButton);
                this.personalTooltip.appendChild(this.personalTooltipText);
                this.personalButtonContainer.appendChild(this.personalTooltip);
                this.buttons.appendChild(this.draggable);
                this.container.appendChild(this.buttons);
                this.container.appendChild(this.strips);
                this.container.appendChild(this.notifications);

                this.personalButton.addEventListener("click", this.toggle.bind(this, "personal"));

                if (this.options.user_id) {
                    this.messengerStrip = document.createElement("div");
                    this.messengerFrame = document.createElement("iframe");
                    this.messengerButtonContainer = document.createElement("div");
                    this.messengerButton = document.createElement("div");
                    this.conversations = document.createElement("div");
                    this.messengerTooltip = document.createElement("div");
                    this.messengerTooltipText = document.createElement("span");
                    this.bubblesCache = document.createElement("div");
                    this.bubblesGlobal = document.createElement("div");
                    this.bubblesPersonal = document.createElement("div");
                    this.addContainer = document.createElement("div");
                    this.addStrip = document.createElement("div");
                    this.addFrame = document.createElement("iframe");
                    this.addButtonContainer = document.createElement("div");
                    this.addButton = document.createElement("div");
                    this.addTooltip = document.createElement("div");
                    this.addTooltipText = document.createElement("span");
                    this.notificationSound = document.createElement("audio");

                    this.messengerButton.innerHTML = '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6m8 3H6v-2h8m4-4H6V6h12"></path></svg></div>';
                    this.messengerTooltipText.innerHTML = this.options.messenger_title;
                    this.addButton.innerHTML = '<div class="weavy-icon"><svg style="transform: rotate(45deg);" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></div>';
                    this.addTooltipText.innerHTML = this.options.add_title;

                    this.strips.appendChild(this.messengerStrip);
                    this.messengerStrip.appendChild(renderControls.call(this, "weavy-strip-messenger"));
                    this.messengerStrip.appendChild(this.messengerFrame);
                    this.draggable.appendChild(this.messengerButtonContainer);
                    this.messengerButtonContainer.appendChild(this.messengerButton);
                    this.messengerButton.appendChild(this.conversations);
                    this.messengerTooltip.appendChild(this.messengerTooltipText);
                    this.messengerButtonContainer.appendChild(this.messengerTooltip);
                    this.draggable.appendChild(this.bubblesCache);
                    this.draggable.appendChild(this.bubblesGlobal);
                    this.draggable.appendChild(this.bubblesPersonal);
                    this.strips.appendChild(this.addStrip);
                    this.draggable.appendChild(this.addContainer);
                    this.addStrip.appendChild(renderControls.call(this, "weavy-strip-add"));
                    this.addStrip.appendChild(this.addFrame);
                    this.addContainer.appendChild(this.addButtonContainer);
                    this.addButtonContainer.appendChild(this.addButton);
                    this.addTooltip.appendChild(this.addTooltipText);
                    this.addButtonContainer.appendChild(this.addTooltip);
                    this.container.appendChild(this.notificationSound);


                    this.messengerButton.addEventListener("click", this.toggle.bind(this, "messenger"));
                    this.addButton.addEventListener("click", this.toggle.bind(this, "add"));


                    // personal button
                    this.personalButton.className = "weavy-button weavy-personal weavy-button-transparent" + (this.options.notifications_count === 0 ? "" : " weavy-dot");
                    this.personalButton.setAttribute("data-count", this.options.notifications_count);

                    // messenger strip
                    this.messengerStrip.className = "weavy-strip" + (this.options.is_open ? " weavy-open" : "");
                    this.messengerStrip.id = "weavy-strip-messenger";

                    // messenger frame
                    this.messengerFrame.className = "weavy-strip-frame";
                    this.messengerFrame.id = "weavy-strip-frame-messenger";
                    this.messengerFrame.name = "weavy-strip-frame-messenger";
                    this.messengerFrame.allowFullscreen = 1;
                    this.messengerFrame.dataset.src = this.options.messenger_url;

                    // Messenger button container
                    this.messengerButtonContainer.className = "weavy-bubble-item weavy-bubble-messenger";
                    this.messengerButtonContainer.id = "weavy-bubble-messenger";

                    // messenger button
                    this.messengerButton.className = "weavy-button weavy-messenger weavy-button-transparent" + (this.options.conversations_count === 0 ? "" : " weavy-dot");
                    this.messengerButton.setAttribute("data-count", this.options.conversations_count);

                    this.conversations.className = "weavy-conversations";
                    this.conversations.setAttribute("draggable", "false");

                    // tooltip
                    this.messengerTooltip.id = "weavy-bubble-tooltip-messenger";
                    this.messengerTooltip.className = "weavy-bubble-tooltip";

                    this.messengerTooltipText.className = "weavy-bubble-tooltip-text";

                    // global bubbles container
                    this.bubblesGlobal.id = "weavy-bubbles-global";
                    this.bubblesGlobal.className = "weavy-bubbles-global weavy-bubbles";

                    // personal bubbles container
                    this.bubblesPersonal.id = "weavy-bubbles-personal";
                    this.bubblesPersonal.className = "weavy-bubbles-personal weavy-bubbles";

                    // bubbles cache container
                    this.bubblesCache.id = "weavy-bubbles-cache";
                    this.bubblesCache.className = "weavy-cache weavy-bubbles-cache weavy-bubbles";

                    // add bubble container
                    this.addContainer.id = "weavy-add-container";

                    // add strip
                    this.addStrip.className = "weavy-strip" + (this.options.is_open ? " weavy-open" : "");
                    this.addStrip.id = "weavy-strip-add";

                    // add frame
                    this.addFrame.className = "weavy-strip-frame";
                    this.addFrame.id = "weavy-strip-frame-add";
                    this.addFrame.name = "weavy-strip-frame-add";
                    this.addFrame.allowFullscreen = 1;
                    this.addFrame.dataset.src = this.options.add_url;

                    // add button container
                    this.addButtonContainer.className = "weavy-bubble-item weavy-bubble-add";
                    this.addButtonContainer.id = "weavy-bubble-add";

                    // add button
                    this.addButton.className = "weavy-button weavy-add weavy-button-transparent";

                    // tooltip
                    this.addTooltip.id = "weavy-bubble-tooltip-personal";
                    this.addTooltip.className = "weavy-bubble-tooltip";

                    this.addTooltipText.className = "weavy-bubble-tooltip-text";

                    // notification sound                
                    this.notificationSound.className = "weavy-notification-sound";
                    this.notificationSound.preload = "none";
                    this.notificationSound.src = this.options.url + "/media/notification.mp3";

                }

                // append strips
                this.container.className = "weavy-widget " + this.options.class_name + ' ' + (this.options.el ? 'weavy-custom' : 'weavy-default');
                this.container.id = "weavy-widget";
                this.container.setAttribute("data-version", this.options.version);

                //Set Classes

                // strips
                this.strips.className = "weavy-strips";
                this.spaces.className = "weavy-spaces";

                // draggable
                this.draggable.className = "weavy-draggable" + (this.options.is_open ? " weavy-open" : "");

                // frame status checking
                this.statusFrame.className = "weavy-status-check";
                this.statusFrame.id = "weavy-status-check";
                this.statusFrame.src = this.options.status_url;

                // weavy button container
                this.weavyButtonContainer.className = "weavy-bubble-item weavy-bubble-weavy";
                this.weavyButtonContainer.id = "weavy-bubble-weavy";

                // weavy button
                this.weavyButton.className = "weavy-button weavy-logo weavy-button-transparent";

                // personal strip
                this.personalStrip.className = "weavy-strip" + (this.options.is_open ? " weavy-open" : "");
                this.personalStrip.id = "weavy-strip-personal";

                // personal frame
                this.personalFrame.className = "weavy-strip-frame";
                this.personalFrame.id = "weavy-strip-frame-personal";
                this.personalFrame.name = "weavy-strip-frame-personal";
                this.personalFrame.allowFullscreen = 1;
                this.personalFrame.dataset.src = this.options.personal_url;


                // personal button container
                this.personalButtonContainer.className = "weavy-bubble-item weavy-bubble-personal";
                this.personalButtonContainer.id = "weavy-bubble-personal";

                // tooltip
                this.personalTooltip.id = "weavy-bubble-tooltip-personal";
                this.personalTooltip.className = "weavy-bubble-tooltip";

                this.personalTooltipText.className = "weavy-bubble-tooltip-text";

                // append buttons
                this.buttons.className = "weavy-buttons";

                // append notifications
                this.notifications.className = "weavy-notifications";

                // add styles
                var style = document.getElementById("weavy-styles");
                if (style) {
                    if (style.styleSheet) {
                        style.styleSheet.cssText = this.options.widget_css;
                    } else {
                        style.removeChild(style.firstChild);
                        style.appendChild(document.createTextNode(this.options.widget_css));
                    }
                } else {
                    style = document.createElement("style");
                    style.type = "text/css";
                    style.id = "weavy-styles";
                    style.styleSheet ? style.styleSheet.cssText = this.options.widget_css : style.appendChild(document.createTextNode(this.options.widget_css));

                    if (this.supportsShadowDOM) {
                        this.container.appendChild(style);
                    } else {
                        document.getElementsByTagName("head")[0].appendChild(style);
                    }
                }

                // append container to target element || html
                if (!this.root) {
                    var target = this.options.el || document.documentElement.appendChild(document.createElement("section"));
                    target.classList.add("weavy-root");

                    if (this.supportsShadowDOM) {
                        target.classList.add("weavy-shadow");
                        target = target.attachShadow({ mode: "open" });
                    }
                    this.root = target;
                }

                this.root.appendChild(this.container);
            }

            if (this.options.user_id) {
                // Update messenger conversations
                this.unreadConversations = this.options.conversations || [];
                if (this.unreadConversations) {
                    updateConversations.call(this, this.unreadConversations);
                }

                // bubbles, global and user added
                // Check if current open bubble is global and make sure it's not removed
                widget.options.bubbles = widget.options.bubbles || [];
                var preservedBubble = [];
                var currentOpenGlobal = $(widget.spaces).children("[data-type='global'].weavy-open");


                if (currentOpenGlobal.length) {
                    preservedBubble = widget.bubbles.filter(function (bubble) {
                        var isMatch = currentOpenGlobal[0].id === "weavy-strip-bubble-" + bubble.space_id;
                        if (isMatch) {
                            bubble.type = "personal";
                            isMatch = widget.options.bubbles.filter(function (newBubble) { return newBubble.space_id === bubble.space_id }).length === 0;
                            $(widget.draggable).find("#weavy-bubble-" + bubble.space_id).addClass("weavy-bubble-detached");
                        }
                        return isMatch;
                    }).pop();

                    if (preservedBubble) {
                        widget.options.bubbles.unshift(preservedBubble);
                    }
                }

                widget.bubbles = widget.options.bubbles;

                // Truncate the array; only 16 spaces allowed
                if (widget.bubbles.length >= widget.options.bubble_limit) {
                    widget.bubbles.length = Math.min(widget.bubbles.length, widget.options.bubble_limit);
                    showAlert.call(widget, "<strong>You reached the bubble limit</strong><br/>Please close some bubbles before you open another.");
                }

                addAndRemoveBubbles();

            } else {

                // personal button
                this.personalButton.className = "weavy-button weavy-personal weavy-button-transparent";
                this.personalButton.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + this.options.personal_avatar + '" />';
            }

            // version mismatch
            if (widget.options.should_update) {
                try {
                    if (typeof (browser) !== "undefined" && browser.runtime) {
                        browser.runtime.sendMessage({ name: 'sync' });
                    } else if (typeof (chrome) !== "undefined" && chrome.runtime) {
                        chrome.runtime.sendMessage({ name: 'sync' });
                    }
                } catch (ex) {
                    console.error(ex);
                }
                showAlert.call(this, "<strong>" + widget.options.installation_name + " has been upgraded</strong><br/>Reload page to get the latest version.", true);
            }
        }

        function cleanBubblesList(bubblesList) {
            if (!bubblesList && !Array.isArray(bubblesList)) {
                return [];
            }

            var cleanedList = [];
            bubblesList.forEach(function (bubble) {
                var previousIndex;
                var previous = cleanedList.filter(function (b, i) {
                    var isMatch = b.space_id == bubble.space_id;
                    if (isMatch) { previousIndex = i; }
                    return isMatch;
                }).pop();

                bubble.url = widget.httpsUrl(bubble.url);

                if (previous && previous.type !== "global") {
                    cleanedList[previousIndex] = bubble;
                } else if (!previous) {
                    cleanedList.push(bubble);
                }
            });
            return cleanedList;
        }

        function addAndRemoveBubbles(newBubbles) {
            if (newBubbles) {
                newBubbles = Array.isArray(newBubbles) ? newBubbles : [newBubbles];

                newBubbles.forEach(function (newBubble) {
                    newBubble.url = widget.httpsUrl(newBubble.url);
  
                    if ([].some.call(widget.bubbles, function (b) { return b.space_id == newBubble.space_id })) {
                        widget.bubbles = widget.bubbles.map(function (bubble) {
                            if (bubble.space_id === newBubble.space_id) {
                                return newBubble;
                            } else {
                                return bubble;
                            }
                        });
                    } else {
                        if (widget.bubbles.length >= widget.options.bubble_limit) {
                            showAlert.call(widget, "<strong>You reached the bubble limit</strong><br/>Please close some bubbles before you open another.");
                            return;
                        } else {
                            widget.bubbles.push(newBubble);
                        }
                    }
                });
            }

            $(widget.spaces).children().addClass("weavy-cache-hidden");

            [].forEach.call(widget.bubbles, function (bubble) {

                var strip = widget.stripCacheList.filter(function (item) { return item.id === "weavy-strip-bubble-" + bubble.space_id; }).pop();
                var buttonContainer = widget.buttonCacheList.filter(function (item) { return item.id === "weavy-bubble-" + bubble.space_id; }).pop();

                // add new bubble if not already added
                if (!strip) {

                    // strip
                    strip = document.createElement("div");
                    strip.setAttribute("data-type", bubble.type);
                    strip.className = "weavy-strip";
                    strip.id = "weavy-strip-bubble-" + bubble.space_id;

                    widget.spaces.appendChild(strip);

                    // frame
                    var frame = document.createElement("iframe");
                    frame.className = "weavy-strip-frame";
                    frame.id = "weavy-strip-bubble-frame-" + bubble.space_id
                    frame.name = "weavy-strip-bubble-frame-" + bubble.space_id
                    frame.allowFullscreen = 1;
                    frame.dataset.src = bubble.url;
                    frame.setAttribute('data-type', bubble.type);

                    strip.appendChild(renderControls.call(widget, "weavy-strip-bubble-" + bubble.space_id));
                    strip.appendChild(frame);

                    // button container
                    buttonContainer = document.createElement("div");
                    buttonContainer.className = "weavy-bubble-item weavy-removed weavy-bubble-" + bubble.space_id;
                    buttonContainer.id = "weavy-bubble-" + bubble.space_id;
                    buttonContainer.setAttribute('data-bubble-id', bubble.bubble_id);
                    buttonContainer.setAttribute('data-type', bubble.type);
                    buttonContainer.setAttribute('data-id', bubble.space_id);

                    // button
                    var button = document.createElement("div");
                    button.setAttribute('data-name', bubble.name);
                    button.className = "weavy-button weavy-bubble-" + bubble.space_id;

                    button.style.backgroundImage = "url(" + trimUrl(widget.options.url) + bubble.icon + ")";
                    //button.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + widget.options.url + bubble.icon + '" />';
                    buttonContainer.appendChild(button);

                    // tooltip
                    var tooltip = document.createElement("div");
                    tooltip.id = "weavy-bubble-tooltip-" + bubble.space_id;
                    tooltip.className = "weavy-bubble-tooltip";

                    var text = document.createElement("span");
                    text.className = "weavy-bubble-tooltip-text";
                    text.innerHTML = bubble.name;

                    tooltip.appendChild(text);

                    if (bubble.is_admin) {
                        var disconnect = document.createElement("a");
                        disconnect.className = "weavy-bubble-action weavy-bubble-disconnect";
                        disconnect.title = "Disconnect from url";
                        //link: disconnect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L14.73,18H13V16.27L9.73,13H8V11.27L5.5,8.76C4.5,9.5 3.9,10.68 3.9,12C3.9,14.26 5.74,16.1 8,16.1H11V18H8A6,6 0 0,1 2,12C2,10.16 2.83,8.5 4.14,7.41L2,5.27M16,6A6,6 0 0,1 22,12C22,14.21 20.8,16.15 19,17.19L17.6,15.77C19.07,15.15 20.1,13.7 20.1,12C20.1,9.73 18.26,7.9 16,7.9H13V6H16M8,6H11V7.9H9.72L7.82,6H8M16,11V13H14.82L12.82,11H16Z" /></svg>'
                        disconnect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 5.27L3.28 4 20 20.72 18.73 22l-4.83-4.83-2.61 2.61a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l2.62-2.6-1.62-1.61c-.01.24-.11.49-.29.68-.39.39-1.03.39-1.42 0A4.973 4.973 0 0 1 7.72 11L2 5.27m10.71-1.05a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.33 3.33-1.41-1.42 3.33-3.33m.7 4.95c.39-.39 1.03-.39 1.42 0a4.999 4.999 0 0 1 1.23 5.06l-1.78-1.77c-.05-.68-.34-1.35-.87-1.87a.973.973 0 0 1 0-1.42z"></path></svg>';
                        disconnect.addEventListener("click", function (e) { widget.removeBubble.call(widget, buttonContainer.dataset["bubbleId"], e); });
                        buttonContainer.appendChild(disconnect);

                        var connect = document.createElement("a");
                        connect.className = "weavy-bubble-action weavy-bubble-connect";
                        connect.title = "Connect to url";
                        connect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"></path></svg>';
                        //link: connect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16,6H13V7.9H16C18.26,7.9 20.1,9.73 20.1,12A4.1,4.1 0 0,1 16,16.1H13V18H16A6,6 0 0,0 22,12C22,8.68 19.31,6 16,6M3.9,12C3.9,9.73 5.74,7.9 8,7.9H11V6H8A6,6 0 0,0 2,12A6,6 0 0,0 8,18H11V16.1H8C5.74,16.1 3.9,14.26 3.9,12M8,13H16V11H8V13Z" /></svg>';
                        connect.addEventListener("click", function (e) {
                            if (buttonContainer.classList.contains("weavy-bubble-detached")) {
                                widget.connectBubble.call(widget, bubble.space_id, "space", e);
                            } else {
                                widget.connectBubble.call(widget, buttonContainer.dataset["bubbleId"], "bubble", e);
                            }
                        });
                        buttonContainer.appendChild(connect);
                    }

                    var close = document.createElement("a");
                    close.className = "weavy-bubble-action weavy-bubble-close";
                    close.title = "Close";
                    close.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" /></svg>';

                    close.addEventListener("click", function (e) {
                        if (buttonContainer.classList.contains("weavy-bubble-detached")) {
                            removeBubbleItems.call(widget, bubble.space_id);
                        } else {
                            widget.removeBubble.call(widget, buttonContainer.dataset["bubbleId"], e);
                        }
                    });

                    buttonContainer.appendChild(close);

                    buttonContainer.appendChild(tooltip);

                    button.addEventListener("click", widget.toggle.bind(widget, "bubble-" + bubble.space_id));
                    //button.addEventListener("mouseenter", showTooltip);

                    widget.stripCacheList.unshift(strip);
                    widget.buttonCacheList.unshift(buttonContainer);
                } else {
                    var frame = strip.querySelector("iframe");
                    if (frame.src) {
                        frame.contentWindow.postMessage({ name: 'context-url', 'value': window.location.href, 'title': document.title, 'origin': document.location.origin, 'type': bubble.type }, "*");
                    }
                }

                strip.setAttribute("data-type", bubble.type);
                strip.querySelector(".weavy-strip-frame").setAttribute('data-type', bubble.type);
                strip.classList.remove("weavy-cache-hidden");

                buttonContainer.setAttribute('data-type', bubble.type);
                buttonContainer.querySelector(".weavy-button").setAttribute('data-type', bubble.type);

                if (parseInt(buttonContainer.getAttribute("data-bubble-id")) !== bubble.bubble_id) {
                    buttonContainer.setAttribute("data-bubble-id", bubble.bubble_id);
                    buttonContainer.classList.remove("weavy-bubble-detached");
                }

                try {
                    if (bubble.type === "personal") {
                        if (buttonContainer.parentNode === widget.bubblesGlobal) {
                            // Bubble is moved from global to personal
                            removeBubbleItems(bubble.space_id, false, true);
                            buttonContainer.classList.add("weavy-disable-transition", "weavy-removed", "weavy-disabled");
                            widget.bubblesPersonal.appendChild(buttonContainer);
                        } else if (buttonContainer.parentNode !== widget.bubblesPersonal) {
                            widget.bubblesPersonal.appendChild(buttonContainer);
                        }
                    } else {
                        if (buttonContainer.parentNode === widget.bubblesPersonal) {
                            // Bubble is moved from personal to global
                            removeBubbleItems(bubble.space_id, false, true);
                            buttonContainer.classList.add("weavy-disable-transition", "weavy-removed", "weavy-disabled");
                            widget.bubblesGlobal.appendChild(buttonContainer);
                        } else if (buttonContainer.parentNode !== widget.bubblesGlobal) {
                            widget.bubblesGlobal.appendChild(buttonContainer);
                        }
                    }
                } catch (e) { console.warn("Could not attach bubble", bubble.space_id); }

                setTimeout(function () {
                    requestAnimationFrame(function () {
                        buttonContainer.classList.remove("weavy-disable-transition", "weavy-removed", "weavy-disabled");

                        // if the bubble should be opened up
                        if (bubble.force_open) {
                            setTimeout(function () {
                                bubble.force_open = false;
                                widget.open("bubble-" + bubble.space_id, bubble.destination || bubble.url);
                            }, 100);
                        }
                    });
                }, 0);

            });


            // Close remaining spaces
            $(widget.spaces).children(".weavy-cache-hidden").each(function (index, strip) {
                if (widget.bubbles.filter(function (bubble) {
                    return strip.id === "weavy-bubble-" + bubble.space_id;
                }).length === 0) {
                    if (strip.classList.contains("weavy-open")) {
                        strip.classList.remove("weavy-cache-hidden");
                    } else {
                        removeBubbleItems(strip.id.replace(/^weavy-strip-bubble-/, ''));
                    }
                }
            });

            setTimeout(function () { truncateCache(widget.options.bubble_limit); }, 450);
        }

        function renderControls(strip) {
            var controls = document.createElement("div");
            controls.className = "weavy-controls";

            var expand = document.createElement("div");
            expand.className = "weavy-icon weavy-expand";
            expand.title = "Expand";
            expand.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12.199 4.8008v2h3.5898l-4.4883 4.4883-0.01172 0.01172-4.4883 4.4883v-3.5898h-2v7h7v-2h-3.5898l4.4883-4.4883 0.01172-0.01172 4.4883-4.4883v3.5898h2v-7h-7z"/></svg>';
            expand.addEventListener("click", this.resize.bind(this));
            controls.appendChild(expand);

            var collapse = document.createElement("div");
            collapse.className = "weavy-icon weavy-collapse";
            collapse.title = "Collapse";
            collapse.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m18.5 4.0898l-4.5 4.5v-3.5898h-2v7h7v-2h-3.59l4.5-4.5-1.41-1.4102zm-6.5 7.9102h-7v2h3.5898l-4.5 4.5 1.4102 1.41 4.5-4.5v3.59h2v-7z"/></svg>';
            collapse.addEventListener("click", this.resize.bind(this));
            controls.appendChild(collapse);

            var close = document.createElement("div");
            close.className = "weavy-icon";
            close.title = "Close";
            close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
            close.addEventListener("click", this.close.bind(this));
            controls.appendChild(close);

            return controls;
        }

        var lastStrip;

        // open in a normal window when iframes are not allowed
        function fallback(strip, destination) {
            // fallback to windows via extension
            widget.close();

            var url = destination;

            if (!url) {
                if (strip.startsWith("bubble-")) {
                    // get url for bubble
                    var bubbleFrame = $(widget.strips).find("#weavy-strip-" + strip).find("iframe")[0];
                    url = bubbleFrame.src ? bubbleFrame.src : bubbleFrame.dataset.src;
                } else {
                    // NOTE: remove strip param to trigger standalone bahaviour
                    url = removeParameter(widget.options[strip + "_url"], "strip");
                }

                // fix for referrer not being set
                if (url.endsWith("/widget/connect")) {
                    url += "?referrer=" + encodeURIComponent(window.location.origin);
                }
            }

            // use the button container to get measurments
            var measure = $(widget.buttons);

            // NOTE: update if width of strip changes
            var stripWidth = 384;
            var nudge = $(widget.container).hasClass("weavy-left") ? -65 : (stripWidth);
            var offset = measure.offset();

            message = {
                "name": "fallback",
                "url": url,
                "key": "fallback", //strip,
                "left": Math.round(offset.left + (window.screenLeft || window.screenX) - nudge),
                "height": Math.round(measure.height() - 20),
                "top": Math.round((window.screenTop || window.screenY) + 96 - 8), // NOTE: adding 96 to account for chrome address bar
                "width": Math.round(stripWidth),
                "force": destination || strip !== lastStrip ? true : false
            };

            var windowFeatures = "menubar=no,location=no,resizable=yes,scrollbars=yes,status=no";
            var windowPosition = "left=" + message.left + ",top=" + (message.top - 96 + 24) + ",height=" + message.height + ",width=" + message.width;


            // Todo: Add some window handling
            try {
                if (chrome !== undefined && chrome.runtime !== undefined) {
                    chrome.runtime.sendMessage(null, message, function (response) { });
                } else {
                    window.open(message.url, "weavy-" + message.name + "-" + message.key, windowFeatures + "," + windowPosition);
                }
            } catch (e) {
                window.open(message.url, "weavy-" + message.name + "-" + message.key, windowFeatures + "," + windowPosition);
            }

            lastStrip = strip;
        }

        function connectedUrl(url) {
            if (!url) {
                return false;
            }
            if (document.location.href === url) { return true; }
            if (url.lastIndexOf("/") === url.length && document.location.href.addTrailing("/") === url) { return true; }
            if (url.substr(-1) === "*") {
                if (document.location.href.indexOf(url.substr(0, url.length - 1)) !== -1) {
                    return true;
                }
            }
            return false;
        }

        function trimUrl(url) {
            return url.replace(/\/$/, "");
        }

        function removeParameter(url, parameter) {
            var urlparts = url.split("?");
            if (urlparts.length >= 2) {

                var prefix = encodeURIComponent(parameter) + "=";
                var pars = urlparts[1].split(/[&;]/g);

                for (var i = pars.length; i-- > 0;) {
                    if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                        pars.splice(i, 1);
                    }
                }
                url = urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
                return url;
            } else {
                return url;
            }
        }

        function connect() {
            return weavy.connection.init(widget.options.url, null, true);
        }

        function updateConversations(conversations) {
            $(".weavy-conversations", this.container).empty();

            for (var i = 0; i < conversations.length; i++) {
                var conversation = document.createElement("a");
                conversation.className = "weavy-conversation";
                conversation.href = "javascript:;";
                conversation.setAttribute("draggable", "false");
                conversation.title = conversations[i].is_room ? conversations[i].name : conversations[i].created_by.name;
                conversation.setAttribute("data-id", conversations[i].id);
                conversation.addEventListener("click", this.openConversation.bind(this, conversations[i].id));

                var avatar = document.createElement("img");
                avatar.className = "weavy-avatar";
                avatar.setAttribute("draggable", "false");

                avatar.src = trimUrl(widget.options.url) + conversations[i].thumb_url.replace("{options}", "96x96-crop");
                conversation.appendChild(avatar);
                this.conversations.appendChild(conversation);

                if (i === 2 && conversations.length > 3) {
                    var more = document.createElement("a");
                    more.className = "weavy-icon";
                    more.href = "javascript:;";
                    more.title = "More...";
                    more.addEventListener("click", this.openConversation.bind(this, null));
                    more.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/></svg>';
                    this.conversations.appendChild(more);
                    break;
                }
            }
        }

        function conversationRead(id) {
            this.unreadConversations = this.unreadConversations.filter(function (unreadConversation) { return unreadConversation.id !== id });
            updateConversations.call(this, this.unreadConversations);
        }

        function appendConversation(conversation) {
            // remove if already in list - will be added again
            this.unreadConversations = this.unreadConversations.filter(function (unreadConversation) { return unreadConversation.id !== conversation.id });
            this.unreadConversations.unshift(conversation);
            updateConversations.call(this, this.unreadConversations);
        }

        function showNotification(notification) {
            if (!$(".weavy-strip.weavy-open", widget.container).length) {
                var notificationFrame = document.createElement("iframe");
                notificationFrame = document.createElement("iframe");
                notificationFrame.className = "weavy-notification-frame";
                notificationFrame.id = "weavy-notification-frame-" + notification.id;

                if ($(this.notifications).children().length > 0) {
                    notificationFrame.setAttribute("style", "display:none");
                    notificationFrame.setAttribute("data-src", trimUrl(widget.options.url) + "/notifications/" + notification.id + "/preview");
                } else {
                    notificationFrame.src = trimUrl(widget.options.url) + "/notifications/" + notification.id + "/preview";
                }

                this.notifications.appendChild(notificationFrame);
            }

            try {
                $(".weavy-notification-sound", widget.container)[0].play();;
            } catch (e) { }
        }

        function closeNotification(id) {

            var $notification = $("#weavy-notification-frame-" + id, widget.container);

            if ($notification.length) {
                $notification.fadeOut("normal", function () {
                    var $next = $notification.next();
                    $(this).remove();

                    if ($next.length) {
                        $next.attr("src", $next.data("src"));
                        $next.addEventListener("load", function () {
                            $notification.fadeIn("normal");
                        }, false);
                    }
                });
            }
        }

        function registerLoading(stripId) {
            var frame = $("#" + stripId, widget.container).find("iframe").get(0);
            if (frame && !frame.registered) {
                var onload = function () {
                    sendWindowId(frame.contentWindow, frame.id, stripId);
                    loading.call(widget, stripId, false);
                    delete frame.dataset.src;
                    // add window to connections
                    weavy.connection.addWindow(frame.contentWindow)
                };
                frame.addEventListener("load", onload, false);
                frame.registered = true;
            }
        }

        function loading(stripId, isLoading, fill) {

            var $strip = $("#" + stripId, widget.container);
            var $bubble = $("#" + stripId.replace(/-strip(-bubble)*-/, '-bubble-'), widget.container);

            if (isLoading) {
                registerLoading(stripId);
                $strip.addClass(fill ? "weavy-loading weavy-loading-fill" : "weavy-loading");
                $bubble.addClass(fill ? "weavy-loading weavy-loading-fill" : "weavy-loading");
                $strip.loadingTimeout = setTimeout(loading.bind(widget, stripId, false), 15000);
            } else {
                $strip.removeClass("weavy-loading weavy-loading-fill");
                $bubble.removeClass("weavy-loading weavy-loading-fill");
                if ($strip.loadingTimeout) {
                    clearTimeout($strip.loadingTimeout);
                    delete $strip.loadingTimeout;
                }
            }

        }

        function sendWindowId(contentWindow, windowName, stripId) {
            try {
                contentWindow.postMessage({
                    name: "context-id",
                    windowName: windowName,
                    stripId: stripId
                }, "*");
            } catch (e) {
                console.error("could not send window id", windowName, e);
            }
        }

        function badgeChanged(badge) {
            var prev = $(widget.personalButton).attr("data-count");
            $(widget.personalButton).attr("data-count", badge.notifications);
            if (badge.notifications === 0) {
                // no notifications, remove dot and animation class
                $(widget.personalButton).removeClass("weavy-dot");
            } else if (badge.notifications > prev) {
                // new notifications, animate dot
                $(widget.personalButton).removeClass("weavy-pulse");
                setTimeout(function () {
                    // we need a small delay here for the browser to notice that the weavy-pulse class was toggled
                    $(widget.personalButton).addClass("weavy-dot weavy-pulse");
                }, 100);
            }

            prev = $(widget.messengerButton).attr("data-count");
            $(widget.messengerButton).attr("data-count", badge.conversations);
            if (badge.conversations === 0) {
                // no conversations, remove dot and animation class
                $(widget.messengerButton).removeClass("weavy-dot");
            } else if (badge.conversations > prev) {
                // new conversations, animate dot
                $(widget.messengerButton).removeClass("weavy-pulse");
                setTimeout(function () {
                    // we need a small delay here for the browser to notice that the weavy-pulse class was toggled
                    $(widget.messengerButton).addClass("weavy-dot weavy-pulse");
                }, 100);
            }

        }

        function onMessageReceived(e) {
            if (typeof (e.data.name) === "undefined") {
                return;
            }

            switch (e.data.name) {
                case "requestOrigin":
                    if (e.source !== undefined) {
                        e.source.postMessage({ name: 'origin', url: window.location.origin }, "*");
                    }
                    break;
                case "request-connect":
                    if (e.source !== undefined) {
                        widget.connectBubble.call(widget, e.data.space, "space");
                    }
                    break;
                case "request-disconnect":
                    if (e.source !== undefined) {
                        // get the requesting space
                        var spaceId = e.data.space;
                        var bubble = [].filter.call(widget.bubbles, function (b) { return b.space_id == spaceId }).pop();

                        var type = bubble ? bubble.type : "personal";

                        if (type === "global") {
                            widget.removeBubble.call(widget, bubble.bubble_id);
                        }
                    }
                    break;
                case "request-open":
                    if (e.source !== undefined) {
                        var spaceId = e.data.spaceId;
                        var destination = e.data.destination;
                        var bubble = widget.bubbles.filter(function (b) { return b.space_id == spaceId });
                        if (bubble.length) {
                            widget.open("bubble-" + spaceId, destination);
                        } else {
                            requestOpen.push(spaceId);
                        }
                    }
                    break;
                case "request-close":
                    if (e.source !== undefined) {
                        // get the requesting space
                        var spaceId = e.data.space;
                        var bubble = [].filter.call(widget.bubbles, function (b) { return b.space_id == spaceId }).pop();
                        var buttonContainer = widget.buttonCacheList.filter(function (item) { return item.id === "weavy-bubble-" + bubble.space_id; }).pop();

                        if (buttonContainer.classList.contains("weavy-bubble-detached")) {
                            removeBubbleItems.call(widget, bubble.space_id);
                        } else {
                            widget.removeBubble.call(widget, bubble.bubble_id);
                        }
                    }
                    break;
                case "request-url":
                    if (e.source !== undefined) {
                        // get the requesting space
                        var spaceId = e.data.space;
                        var bubble = [].filter.call(widget.bubbles, function (b) { return b.space_id == spaceId }).pop();

                        var type = bubble ? bubble.type : "personal";

                        e.source.postMessage({ name: 'context-url', 'value': window.location.href, 'title': document.title, 'origin': document.location.origin, 'type': type }, "*");
                    }
                    break;
                case "set-context-url":
                    window.location.href = e.data.context;
                    break;
                case "pong":
                    widget.isBlocked = false;
                    widget.openContextFrame(e.data.context);
                    break;
                case "invoke":
                    if (weavy.connection.connection.state === $.signalR.connectionState.connected) {
                        var proxy = weavy.connection.proxies[e.data.hub];
                        proxy.invoke.apply(proxy, e.data.args).fail(function (error) {
                            console.error(error)
                        });
                    }
                    break;
                case "ready":
                    // page loaded
                    if (e.data.sourceStripId) {
                        loading.call(widget, e.data.sourceStripId, false);
                    }
                    break;
                case "reload":
                    // reload and re-init all widgets
                    connectAndLoad();
                    break;
                case "reset":
                    var active = $(".weavy-strip.weavy-open", widget.container);
                    if (active.length) {
                        widget.reset(active.attr("id"));
                    }
                    break;
                case "signingOut":
                    // disconnect from signalr
                    widget.options.user_id = null;
                    weavy.connection.disconnect();
                    widget.close();
                    break;
                case "signedIn":
                case "signedOut":
                    // force gui refresh                    
                    widget.options.user_id = null;
                    connectAndLoad();
                    break;
                case "close":
                    widget.close();
                    break;
                case "maximize":
                    widget.maximize();
                    break;
                case "close-preview":
                    if (previewingFullscreen && $(widget.container).hasClass("weavy-preview")) {
                        previewingFullscreen = false;
                        widget.togglePreview();
                    }
                    break;
                case "open-preview":
                    if (!$(widget.container).hasClass("weavy-preview")) {
                        previewingFullscreen = true;
                        widget.togglePreview();
                    }
                    break;
                case "personal":
                    widget.personalFrame.src = widget.options.url + e.data.url;
                    loading.call(widget, "weavy-strip-personal", true);
                    widget.open("personal");
                    break;
                case "messenger":
                    widget.messengerFrame.src = widget.options.url + e.data.url;
                    loading.call(widget, "weavy-strip-messenger", true);
                    widget.open("messenger");
                    break;
                case "send":
                    loadInTarget(e.data.bubbleTarget, e.data.url, e.data.data, e.data.method);
                    loading.call(widget, "weavy-strip-" + e.data.bubbleTarget, true, true);
                    widget.open(e.data.bubbleTarget);
                    break;
                case "notificationLoaded":
                case "notificationLayoutChanged":
                    var notification = $("#weavy-notification-frame-" + e.data.id, widget.container);

                    notification.show();
                    notification.css("height", e.data.height + "px");
                    // show set height
                    break;
                case "notificationClosed":
                    closeNotification.call(widget, e.data.id);
                    break;
            }
        }

        function loadInTarget(target, url, data, method, fill) {
            var frameTarget = $(widget.strips).find("#weavy-strip-" + target + " .weavy-strip-frame").get(0);
            if (frameTarget) {
                if (frameTarget.dataset && frameTarget.dataset.src) {
                    // Not yet fully loaded
                    sendToFrame(frameTarget.name, widget.httpsUrl(url), data, method);
                } else {
                    // Fully loaded, send using turbolinks
                    frameTarget.contentWindow.postMessage({ name: 'send', url: widget.httpsUrl(url), data: data, method: method }, "*");
                }
            }
        }

        function sendToFrame(frameName, url, data, method) {
            method = String(method || "get").toLowerCase();

            // Ensure target exists
            var frame = $("iframe[name='" + frameName + "']", widget.container).get(0);

            if (frame) {
                var frameUrl = url;
                if (method === "get") {
                    if (data) {
                        // Append data to URL
                        if (frameUrl.indexOf('?') === -1) {
                            frameUrl = frameUrl + "?" + data;
                        } else {
                            frameUrl = frameUrl + "&" + data;
                        }
                    }
                }

                if (!frame.src) {
                    // If no url is set yet, set a url
                    frame.src = frameUrl;
                    if (method === "get") {
                        // No need to send a form since data is appended to the url
                        return;
                    }
                }

                // Create a form to send to the frame
                var $form = $("<form>", {
                    action: url,
                    method: method,
                    target: frameName
                });

                data = data.replace(/\+/g, '%20');
                var dataArray = data.split("&");

                // Add all data as hidden fields
                $form.append(dataArray.map(function (pair) {
                    var nameValue = pair.split("=");
                    var name = decodeURIComponent(nameValue[0]);
                    var value = decodeURIComponent(nameValue[1]);
                    // Find one or more fields
                    return $('<input>', {
                        type: 'hidden',
                        name: name,
                        value: value
                    });
                }));

                // Send the form and forget it
                $form.appendTo(widget.container).submit().remove();
            }
        }

        // listen for dispatched messages from weavy (close/resize etc.)
        window.addEventListener("message", onMessageReceived, false);

        // signalR connection state has changed
        weavy.connection.on("statechanged", function (e, data) {

            if (disconnected && data.state.newState === 1 && widget.options.user_id) {
                disconnected = false;

                // reload widget                
                weavy.connection.reload();
            }
        });

        // signalR connection disconnected
        weavy.connection.on("disconnected", function (e, data) {
            disconnected = true;
        });

        // real-time events
        weavy.realtime.on("bubbleopened", function (e, data) {

            if (data.isMessenger) {
                widget.messengerFrame.src = widget.httpsUrl(data.url);
                loading.call(widget, "weavy-strip-messenger", true);
                widget.open("messenger");
            } else if (data.type === "personal" || data.type === "global" && connectedUrl(data.connected_to_url)) {
                if (data.type === "personal" && [].some.call(widget.bubbles, function (b) { return b.space_id == data.space_id && b.type === "global"; })) {
                    data.type = "global";
                }

                // Is the space requested to open?
                var shouldOpen = data.space_id && requestOpen.indexOf(data.space_id) !== -1;
                if (shouldOpen) {
                    requestOpen.splice(requestOpen.indexOf(data.space_id), 1);
                    data.force_open = shouldOpen;
                }

                // update ui
                addAndRemoveBubbles(data);
            }
        });

        weavy.realtime.on("bubbleremoved", function (e, data) {
            // remove from array of added bubbles
            widget.bubbles = [].filter.call(widget.bubbles, function (bubble) {
                if (data.space_id === bubble.space_id && data.bubble_id === bubble.bubble_id && bubble.type === data.type) {
                    removeBubbleItems(data.space_id);
                    return false;
                }
                return true;
            });
        })

        weavy.realtime.on("trashedspace", function (e, data) {
            // remove from array of added bubbles
            widget.bubbles = _.filter(widget.bubbles, function (bubble) {
                if (data.id === bubble.space_id) {
                    removeBubbleItems(data.id, true);
                    return false;
                }
                return true;
            });
        })

        weavy.realtime.on("conversationread", function (e, data) {
            if (data.user.id === widget.options.user_id) {
                conversationRead.call(widget, data.conversation.id);
                widget.triggerEvent("conversationread", data);
            }
        });

        weavy.realtime.on("message", function (e, data) {
            var message = data;
            if (message.created_by.id !== widget.options.user_id && message.created_by.id > 0) {
                weavy.realtime.invoke("widget", "getConversation", message.conversation);
                widget.triggerEvent("message", data);
            }
        });

        weavy.realtime.on("badge", function (e, data) {
            badgeChanged.call(widget, data);
            widget.triggerEvent("badge", data);
        });

        weavy.realtime.on("notification", function (e, data) {
            showNotification.call(widget, data);
        });

        weavy.realtime.on("notificationupdated", function (e, data) {
            widget.triggerEvent("notificationupdated", data);
        });

        weavy.realtime.on("notificationreadall", function (e, data) {
            widget.triggerEvent("notificationreadall", data);
        });

        weavy.realtime.on("loaded", function (e, data) {
            if (!data.user_id) {
                // NOTE: stop/disconnect directly if we are not authenticated 
                // signalr does not allow the user identity to change in an active connection
                setTimeout(weavy.connection.disconnect, 0);
            }

            data.bubbles = cleanBubblesList(data.bubbles);

            if (!data.user_id || data.user_id !== widget.options.user_id) {
                if (widget.container) {
                    widget.buttonCacheList = [];
                    widget.stripCacheList = [];
                    $(widget.container).remove();
                    widget.container = null;
                }
            }

            widget.options = widget.extendDefaults(widget.options, data);

            if (widget.options.is_loaded === false) {
                buildOutput.call(widget);
                widget.options.is_loaded = true;

                widget.triggerEvent("load", null);

            }

        }, "rtmwidget");

        weavy.realtime.on("conversationReceived", function (e, data) {
            appendConversation.call(widget, data);
        }, "rtmwidget");


        widget.one("restore", function () {
            setTimeout(widget.preloadFrames, 2000, "all");
        });

        // init component
        if (this.options.init === true) {

            this.init();
        }
    }

    WeavyWidget.defaults = {
        init: true,
        button: true,
        close_button: true,
        resize_button: true,
        el: null,
        is_loaded: false,
        https: "adaptive", // force, adaptive or default 
        add_title: 'Open',
        class_name: "weavy-middle",
        bubble_limit: 16,
        ext_auth_provider: false,
        is_mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    };

    WeavyWidget.plugins = {};

    WeavyWidget.prototype.on = function (event, cb) {
        $(document).on(event + ".event.weavy", null, null, cb);
    };

    WeavyWidget.prototype.one = function (event, cb) {
        $(document).one(event + ".event.weavy", null, null, cb);
    };

    WeavyWidget.prototype.triggerEvent = function (name, json) {
        name = name + ".event.weavy";
        var event = $.Event(name);
        var isObject = json && typeof json === "object";
        var data = isObject ? json : JSON.parse(json);

        console.debug("widget.js triggering:", name);
        $(document).triggerHandler(event, data);
    };

    WeavyWidget.prototype.storeItem = function (key, value, isJson) {
        localStorage.setItem('weavy_' + window.location.hostname + "_" + key, isJson ? JSON.stringify(value) : value);
    };

    WeavyWidget.prototype.retrieveItem = function (key, isJson) {
        var value = localStorage.getItem('weavy_' + window.location.hostname + "_" + key);
        if (value && isJson) {
            return JSON.parse(value)
        }

        return value;
    };

    // Shim deprecated name, remove this in next version
    this.Weavy = function () {
        console.warn("Using new Weavy() is deprecated. Use new WeavyWidget() instead.");

        for (var p in Weavy) {
            if (p && Weavy.hasOwnProperty(p)) {
                WeavyWidget[p] = Weavy[p];
            }
        }

        return WeavyWidget.apply(this, arguments);
    };

    Weavy.prototype = Object.create(WeavyWidget.prototype);

    for (var p in WeavyWidget) {
        if (p && WeavyWidget.hasOwnProperty(p)) {
            Weavy[p] = WeavyWidget[p];
        }
    }

})(jQuery);

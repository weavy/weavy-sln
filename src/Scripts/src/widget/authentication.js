(function ($) {
    var PLUGIN_NAME = "authentication";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for signing in and out
     * 
     * @mixin authentication
     * @returns {WeavyWidget.plugins.authentication}
     * @typicalname widget
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [WeavyWidget]{@link WeavyWidget#nodes}
         * @instance
         * @member nodes
         * @memberof authentication
         * @extends WeavyWidget#nodes
         * @typicalname widget.nodes
         */

        /**
         *  Reference to this instance
         *  @lends authentication#
         */
        var widget = this;

        /**
         * Current authentication state of the user
         * 
         * - **"signing-in"** - The user is trying to sign in. See Widget event: {@link WeavyWidget#event:signing-in}
         * - **"signed-in"** - The user is signed in. See Widget event: {@link WeavyWidget#event:signed-in}
         * - **"signing-out"** - The user has started the sign-out process. See Widget event: {@link WeavyWidget#event:signing-out}
         * - **"signed-out"** - The user is not authenticated. See Widget event: {@link WeavyWidget#event:signed-out} and {@link WeavyWidget#event:authentication-error}
         * 
         * @category properties
         * @type {string}
         * @default signed-out
         */
        widget.userState = "signed-out";

        /**
         * The url to the sign in page
         * 
         * @category properties
         * @type {url}
         */
        widget.signInUrl = widget.options.url + "sign-in?path=" + options.redirect

        /**
         * The url to the sign out page
         * 
         * @category properties
         * @type {url}
         */
        widget.signOutUrl = widget.options.url + "sign-out?path=" + options.redirect

        /**
         * Panel displaying the authentication page
         * 
         * @alias authentication#nodes#authenticationPanel
         * @type {?Element}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.authenticationPanel = null;

        /**
         * Frame for the {@link authentication#nodes#authenticationPanel}
         * 
         * @alias authentication#nodes#authenticationFrame
         * @type {?FrameElement}
         * @created Widget event: {@link WeavyWidget#event:build}
         */
        widget.nodes.authenticationFrame = null;

        /**
         * Open the sign-in page. An authentication attempt is started if credentials are provided.
         * 
         * @example
         * // Open the sign in panel and wait for the user to complete authentication
         * widget.signIn().then(function(signedIn) {
         *     if (signedIn) {
         *         widget.log("User has signed in");
         *     } else {
         *         widget.warn("User sign-in failed");
         *     }
         * });
         * @param {string} [username]
         * @param {string} [password]
         * @returns {external:Promise}
         * @resolves {true} - On successful sign-in
         * @resolves {false} - On authentication error
         * @fires WeavyWidget#signed-in
         * @fires WeavyWidget#authentication-error
         */
        widget.signIn = function (username, password) {
            var options = widget.options.plugins[PLUGIN_NAME];
            var dfd = $.Deferred();

            var doSignIn = username && password;

            function onMessage(e, message) {
                switch (message.name) {
                    case "signed-in":
                        dfd.resolve(true);
                        widget.off("message", onMessage);
                        break;
                    case "authentication-error":
                        dfd.resolve(false);
                        widget.off("message", onMessage);
                        break;
                }
            }

            // listen to signed-in message
            widget.on("message", onMessage);

            // post message to sign in user
            var url = widget.signInUrl;
            var data = doSignIn ? "username=" + username + "&password=" + password : null;
            var method = doSignIn ? "POST" : "GET";

            if (widget.plugins.panels) {
                widget.panelLoading.call(widget, options.frameName, true, true);
                widget.loadInTarget.call(widget, options.frameName, widget.httpsUrl(url), data, method);
            } else {
                widget.sendToFrame.call(widget, widget.getId(options.frameName), widget.httpsUrl(url), data, method);
            }

            // return promise
            return dfd.promise();

        }

        /** 
         * Sign out from Weavy regardless of authentication provider
         *  
         * @example
         * // Sign out the active user
         * widget.signOut().then(function() {
         *     // Open the sign in page
         *     widget.signIn();
         * });
         * 
         * @returns {external:Promise}
         * @resolves When sign-out is completed
         * @fires WeavyWidget#signed-out
         */
        widget.signOut = function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            var dfd = $.Deferred();

            // sign out user in Weavy
            var url = widget.signOutUrl;
            var data = "";

            if (widget.plugins.panels) {
                widget.panelLoading.call(widget, options.frameName, true, true);
                widget.loadInTarget.call(widget, options.frameName, widget.httpsUrl(url), data, "GET");
            } else {
                widget.sendToFrame.call(widget, widget.getId(options.frameName), widget.httpsUrl(url), data, "GET");
            }

            function onMessage(e, message) {
                switch (message.name) {
                    case "signed-out":
                        dfd.resolve(true);
                        widget.off("message", onMessage);
                        break;
                }
            }

            // listen to signed-out message
            widget.on("message", onMessage);

            return dfd.promise();
        }

        widget.on("options", function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            widget.signInUrl = widget.options.url + "sign-in?path=" + options.redirect
            widget.signOutUrl = widget.options.url + "sign-out?path=" + options.redirect
        });

        widget.on("build", function () {
            var options = widget.options.plugins[PLUGIN_NAME];            
            if (!widget.nodes.authenticationFrame) {
                if (widget.plugins.panels) {
                    widget.nodes.authenticationPanel = widget.addPanel(options.frameName, { persistent: true });
                    widget.nodes.authenticationFrame = widget.nodes.authenticationPanel.querySelector("iframe");
                } else {
                    widget.nodes.authenticationPanel = document.createElement("div");
                    widget.nodes.authenticationPanel.className = "widget-panel";
                    widget.nodes.authenticationPanel.id = widget.getId("widget-panel-" + options.frameName);
                    widget.nodes.authenticationPanel.dataset.id = options.frameName;
                    widget.nodes.authenticationPanel.dataset.persistent = true;

                    widget.nodes.authenticationFrame = document.createElement("iframe");
                    widget.nodes.authenticationFrame.className = "weavy-frame-" + options.frameClassName;
                    widget.nodes.authenticationFrame.id = widget.getId(options.frameName);
                    widget.nodes.authenticationFrame.name = widget.getId(options.frameName);

                    widget.on(widget.nodes.authenticationFrame, "load", function () {
                        widget.sendWindowId(widget.nodes.authenticationFrame.contentWindow, widget.nodes.authenticationFrame.id, options.frameName);
                    });

                    widget.nodes.authenticationPanel.appendChild(widget.nodes.authenticationFrame);
                    widget.nodes.container.appendChild(widget.nodes.authenticationPanel);                    
                }
            }
        });

        widget.on("before:open", function (e, open) {
            if (widget.plugins.authentication && !widget.isAuthenticated() && open.panelId !== "authentication") {
                widget.one("after:signed-in", function () {
                    $.when(widget.awaitClosed).then(function () {
                        widget.open(widget.openPanelId, open.destination);
                    });
                });
                open.panelId = "authentication";
            }
            return open;
        });

        widget.on("open", function (e, open) {
            var options = widget.options.plugins[PLUGIN_NAME];
            if (!widget.isBlocked) {
                if (open.panelId === "authentication" || !widget.isAuthenticated()) {
                    widget.log("override: opening authentication panel");
                    if (!widget.nodes.authenticationPanel.classList.contains("weavy-open")) {
                        widget.signIn();
                    }
                    if (!widget.plugins.panels) {
                        widget.nodes.authenticationPanel.classList.add("weavy-open");
                    }
                } else {
                    if (!widget.plugins.panels) {
                        widget.nodes.authenticationPanel.classList.remove("weavy-open");
                    }
                }
            }
        });

        widget.on("signing-in", function () {
            var options = widget.options.plugins[PLUGIN_NAME];
            var wasOpen = $(widget.nodes.container).hasClass("weavy-open");

            widget.close();

            function onMessage(e, message) {
                e = e.originalEvent || e;
                message = message || e.data;

                switch (message.name) {
                    case "signed-in":
                        widget.off(window, "message", onMessage);
                        break;
                    case "authentication-error":
                        if (wasOpen) {
                            widget.open(options.frameName)
                        }
                        widget.off(window, "message", onMessage);
                        break;
                }
                
            }

            // listen to signed-in message
            widget.on(window, "message", onMessage);
        });

        widget.on("before:signed-in", function () {
            if (widget.openPanelId === "authentication") {
                widget.close();
            }
        });

        widget.on("after:signing-out", function (e, signingOut) {
            if (signingOut.isLocal) {
                widget.awaitClosed.then(function () {
                    widget.timeout(250).then(widget.signOut.bind(widget));
                });
            }
        });

        widget.on("signing-in signed-in signing-out signed-out", function (e) {
            widget.userState = e.type;
        });

        // Exports
        return {}
    };


    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.authentication.defaults = {
     *     redirect: '/notify',
     *     frameClassName: "",
     *     frameName: "authentication"
     * };
     * 
     * @name defaults
     * @memberof authentication
     * @type {Object}
     * @property {string} redirect=/notify - URL to redirect to after signing in or out
     * @property {string} frameClassName - Classes added to the class-property of {@link authentication#nodes#authenticationFrame}
     * @property {string} frameName=authentication - Name used for the authentication panel
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        redirect: '/notify',
        frameClassName: "",
        frameName: "authentication"
    };

})(jQuery);

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

(function ($) {
    var PLUGIN_NAME = "authentication";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for signing in and out
     * 
     * @mixin authentication
     * @returns {Weavy.plugins.authentication}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof authentication
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends authentication#
         */
        var weavy = this;

        /**
         * Current authentication state of the user
         * 
         * - **"signing-in"** - The user is trying to sign in. See Widget event: {@link Weavy#event:signing-in}
         * - **"signed-in"** - The user is signed in. See Widget event: {@link Weavy#event:signed-in}
         * - **"signing-out"** - The user has started the sign-out process. See Widget event: {@link Weavy#event:signing-out}
         * - **"signed-out"** - The user is not authenticated. See Widget event: {@link Weavy#event:signed-out} and {@link Weavy#event:authentication-error}
         * 
         * @category properties
         * @type {string}
         * @default signed-out
         */
        weavy.userState = "signed-out";

        /**
         * The url to the sign in page
         * 
         * @category properties
         * @type {url}
         */
        weavy.signInUrl = weavy.httpsUrl("sign-in?path=" + options.redirect, weavy.options.url);

        /**
         * The url to the sign out page
         * 
         * @category properties
         * @type {url}
         */
        weavy.signOutUrl = weavy.httpsUrl("sign-out?path=" + options.redirect, weavy.options.url);

        /**
         * Panel displaying the authentication page
         * 
         * @alias authentication#nodes#authenticationPanel
         * @type {?Element}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.authenticationPanel = null;

        /**
         * Frame for the {@link authentication#nodes#authenticationPanel}
         * 
         * @alias authentication#nodes#authenticationFrame
         * @type {?FrameElement}
         * @created Widget event: {@link Weavy#event:build}
         */
        weavy.nodes.authenticationFrame = null;

        /**
         * Open the sign-in page. An authentication attempt is started if credentials are provided.
         * 
         * @example
         * // Open the sign in panel and wait for the user to complete authentication
         * weavy.signIn().then(function(signedIn) {
         *     if (signedIn) {
         *         weavy.log("User has signed in");
         *     } else {
         *         weavy.warn("User sign-in failed");
         *     }
         * });
         * @param {string} [username]
         * @param {string} [password]
         * @returns {external:Promise}
         * @resolves {true} - On successful sign-in
         * @resolves {false} - On authentication error
         * @fires Weavy#signed-in
         * @fires Weavy#authentication-error
         */
        weavy.signIn = function (username, password) {
            var options = weavy.options.plugins[PLUGIN_NAME];
            var dfd = $.Deferred();

            var doSignIn = username && password;

            function onMessage(e, message) {
                switch (message.name) {
                    case "signed-in":
                        dfd.resolve(true);
                        weavy.off("message", onMessage);
                        break;
                    case "authentication-error":
                        dfd.resolve(false);
                        weavy.off("message", onMessage);
                        break;
                }
            }

            // listen to signed-in message
            weavy.on("message", onMessage);

            // post message to sign in user
            var url = weavy.signInUrl;
            var data = doSignIn ? "username=" + username + "&password=" + password : null;
            var method = doSignIn ? "POST" : "GET";

            if (weavy.plugins.panels) {
                weavy.load.call(weavy, options.frameName, url, data, method, true);
            } else {
                weavy.sendToFrame.call(weavy, weavy.getId(options.frameName), url, data, method);
            }

            // return promise
            return dfd.promise();

        }

        /** 
         * Sign out from Weavy regardless of authentication provider
         *  
         * @example
         * // Sign out the active user
         * weavy.signOut().then(function() {
         *     // Open the sign in page
         *     weavy.signIn();
         * });
         * 
         * @returns {external:Promise}
         * @resolves When sign-out is completed
         * @fires Weavy#signed-out
         */
        weavy.signOut = function () {
            var options = weavy.options.plugins[PLUGIN_NAME];
            var dfd = $.Deferred();

            // sign out user in Weavy
            var url = weavy.signOutUrl;
            var data = "";

            if (weavy.plugins.panels) {
                weavy.load.call(weavy, options.frameName, url, data, "GET", true);
            } else {
                weavy.sendToFrame.call(weavy, weavy.getId(options.frameName), url, data, "GET");
            }

            function onMessage(e, message) {
                switch (message.name) {
                    case "signed-out":
                        dfd.resolve(true);
                        weavy.off("message", onMessage);
                        break;
                }
            }

            // listen to signed-out message
            weavy.on("message", onMessage);

            return dfd.promise();
        }

        weavy.on("options", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];
            weavy.signInUrl = weavy.options.url + "sign-in?path=" + options.redirect
            weavy.signOutUrl = weavy.options.url + "sign-out?path=" + options.redirect
        });

        weavy.on("build", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];            
            if (!weavy.nodes.authenticationFrame) {
                if (weavy.plugins.panels) {
                    weavy.nodes.authenticationPanel = weavy.addPanel(options.frameName, { persistent: true });
                    weavy.nodes.authenticationFrame = weavy.nodes.authenticationPanel.querySelector("iframe");
                } else {
                    weavy.nodes.authenticationPanel = document.createElement("div");
                    weavy.nodes.authenticationPanel.className = "weavy-panel";
                    weavy.nodes.authenticationPanel.id = weavy.getId("weavy-panel-" + options.frameName);
                    weavy.nodes.authenticationPanel.dataset.id = options.frameName;
                    weavy.nodes.authenticationPanel.dataset.persistent = true;

                    weavy.nodes.authenticationFrame = document.createElement("iframe");
                    weavy.nodes.authenticationFrame.className = "weavy-frame-" + options.frameClassName;
                    weavy.nodes.authenticationFrame.id = weavy.getId(options.frameName);
                    weavy.nodes.authenticationFrame.name = weavy.getId(options.frameName);

                    weavy.on(weavy.nodes.authenticationFrame, "load", function () {
                        weavy.sendWindowId(weavy.nodes.authenticationFrame.contentWindow, weavy.nodes.authenticationFrame.id, options.frameName);
                    });

                    weavy.nodes.authenticationPanel.appendChild(weavy.nodes.authenticationFrame);
                    weavy.nodes.container.appendChild(weavy.nodes.authenticationPanel);                    
                }
            }
        });

        weavy.on("before:open", function (e, open) {
            if (weavy.plugins.authentication && !weavy.isAuthenticated() && open.panelId !== "authentication") {
                weavy.one("after:signed-in", function () {
                    $.when(weavy.whenClosed).then(function () {
                        weavy.open(weavy.openPanelId, open.destination);
                    });
                });
                open.panelId = "authentication";
            }
            return open;
        });

        weavy.on("open", function (e, open) {
            var options = weavy.options.plugins[PLUGIN_NAME];
            if (!weavy.isBlocked) {
                if (open.panelId === "authentication" || !weavy.isAuthenticated()) {
                    weavy.log("override: opening authentication panel");
                    if (!weavy.nodes.authenticationPanel.classList.contains("weavy-open")) {
                        weavy.signIn();
                    }
                    if (!weavy.plugins.panels) {
                        weavy.nodes.authenticationPanel.classList.add("weavy-open");
                    }
                } else {
                    if (!weavy.plugins.panels) {
                        weavy.nodes.authenticationPanel.classList.remove("weavy-open");
                    }
                }
            }
        });

        weavy.on("signing-in", function () {
            var options = weavy.options.plugins[PLUGIN_NAME];
            var wasOpen = $(weavy.nodes.container).hasClass("weavy-open");

            weavy.close();

            function onMessage(e, message) {
                e = e.originalEvent || e;
                message = message || e.data;

                switch (message.name) {
                    case "signed-in":
                        weavy.off(window, "message", onMessage);
                        break;
                    case "authentication-error":
                        if (wasOpen) {
                            weavy.open(options.frameName)
                        }
                        weavy.off(window, "message", onMessage);
                        break;
                }
                
            }

            // listen to signed-in message
            weavy.on(window, "message", onMessage);
        });

        weavy.on("before:signed-in", function () {
            if (weavy.openPanelId === "authentication") {
                weavy.close();
            }
        });

        weavy.on("after:signing-out", function (e, signingOut) {
            if (signingOut.isLocal) {
                weavy.whenClosed.then(function () {
                    weavy.timeout(250).then(weavy.signOut.bind(weavy));
                });
            }
        });

        weavy.on("signing-in signed-in signing-out signed-out", function (e) {
            weavy.userState = e.type;
        });

        // Exports
        return {}
    };


    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.authentication.defaults = {
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
    Weavy.plugins[PLUGIN_NAME].defaults = {
        redirect: '/notify',
        frameClassName: "",
        frameName: "authentication"
    };

})(jQuery);

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

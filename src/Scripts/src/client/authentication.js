/* eslint-env commonjs, amd */

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
        root.WeavyAuthentication = factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("authentication.js");

    /**
     * Module for signing in and out
     * 
     * @module authentication
     * @returns {WeavyAuthentication}
     */
    var WeavyAuthentication = function (weavy, options) {

        var authentication = this;

        var whenAuthenticated = $.Deferred();
        var isAuthenticating = false;

        this.options = options = weavy.extendDefaults(WeavyAuthentication.defaults, options);

        if (this.options.jwt) {
            sso(this.options.jwt);
            delete this.options.jwt;
            delete weavy.options.jwt;
        }

        function sso(jwt) {
            if (jwt && weavy.connection) {
                isAuthenticating = true;
                weavy.connection.sso(jwt);
            }
        }

        /**
         * Id of the current user
         *
         * @category properties
         * @type {int}
         */
        this.userId = null;

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
        this.userState = "signed-out";

        /**
         * The url to the sign in page
         * 
         * @category properties
         * @type {url}
         */
        var signInUrl = weavy.httpsUrl("sign-in?path=" + options.redirect, weavy.options.url);
      
        /**
         * The url to the sign out page
         * 
         * @category properties
         * @type {url}
         */
        var signOutUrl = weavy.httpsUrl("sign-out?path=" + options.redirect, weavy.options.url);

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
         * weavy.authentication.signIn().then(function() {
         *     weavy.log("User has signed in");
         * }).catch(function() {
         *     weavy.warn("User sign-in failed");
         * });
         * @param {string} [username]
         * @param {string} [password]
         * @returns {external:Promise}
         * @resolves - On successful sign-in
         * @rejects - On authentication error if [username] and [password] is provided
         * @fires Weavy#signed-in
         * @fires Weavy#authentication-error
         */
        function signIn(username, password, skipPanelOpen) {
            weavy.log("signing in");

            if (isAuthenticating || weavy.isAuthenticated()) {
                weavy.log("user already " + isAuthenticating ? "signing" : "signed" + " in, moving on");
                return whenAuthenticated.promise();
            }

            isAuthenticating = true;

            var dfd = $.Deferred();
            var doSignIn = username && password;

            function onMessage(e, message) {
                var messageName = message && message.name || e.type;
                switch (messageName) {
                    case "signed-in":
                        dfd.resolve();
                        weavy.off("signed-in authentication-error", onMessage);
                        break;
                    case "authentication-error":
                        if (doSignIn) {
                            dfd.reject();
                            weavy.off("signed-in authentication-error", onMessage);
                        }
                        break;
                }
            }

            // listen to signed-in message
            weavy.on("signed-in authentication-error", onMessage);

            // post message to sign in user
            var url = signInUrl;
            var data = doSignIn ? "username=" + username + "&password=" + password : null;
            var method = doSignIn ? "POST" : "GET";

            if (doSignIn || skipPanelOpen) {
                wvy.postal.postToSelf({ name: "signing-in" });
                weavy.whenLoaded.then(function () {
                    if (weavy.nodes.panels) {
                        weavy.nodes.panels.load(options.frameName, url, data, method, true);
                    }
                });
            } else {
                weavy.whenLoaded.then(function () {
                    if (weavy.nodes.panels) {
                        weavy.nodes.panels.open(options.frameName, url);
                    }
                });
            }

            // return promise
            return dfd.promise();
        }

        /** 
         * Sign out from Weavy regardless of authentication provider
         *  
         * @example
         * // Sign out the active user
         * weavy.authentication.signOut().then(function() {
         *     // Open the sign in page
         *     weavy.authentication.signIn();
         * });
         * 
         * @returns {external:Promise}
         * @resolves When sign-out is completed
         * @fires Weavy#signed-out
         */
        function signOut() {
            weavy.log("signing out");

            var dfd = $.Deferred();

            function onMessage(e, message) {
                dfd.resolve(true);
                weavy.off("after:signed-out", onMessage);
            }

            // listen to signed-out message

            if (authentication.userState === "signed-in" || authentication.userState === "signing-in") {
                weavy.on("after:signed-out", onMessage);
                weavy.whenLoaded.then(function () {
                    if (weavy.nodes.panels) {
                        weavy.nodes.panels.load(options.frameName, signOutUrl, null, "GET", true);
                    }
                })
            } else {
                weavy.log("user already signed out, moving on");
                dfd.resolve(true);
            }

            return dfd.promise();
        }

        weavy.on("after:signing-out", function (e, signingOut) {
            if (signingOut.isLocal) {
                weavy.nodes.panels.close(options.frameName);
            }
        });

        weavy.on("before:clientdata", function (e, clientData) {
            authentication.userId = clientData.user && clientData.user.id;
            if (authentication.userId > 0) {
                authentication.userState = "signed-in";
                isAuthenticating = false;
                whenAuthenticated.resolve(authentication.userId);
            } else {
                authentication.userState = "signed-out";
            }
        });

        weavy.on(weavy.connection, "user-change.connection", function (e, data) {
            weavy.debug("authentication user-change", data.state, "setting userId", data && data.id);

            authentication.userState = data.state;
            if (data.state === "signed-out") {
                authentication.userId = -1;
                whenAuthenticated.reject(-1);
            } else {
                authentication.userId = data.user ? data.user.id : -1;
                isAuthenticating = false;
                whenAuthenticated.resolve(authentication.userId);
            }
        });

        /*weavy.on(weavy.connection, "signed-in.connection", function (e, data) {
            authentication.userState = "signed-in";
            authentication.userId = data.user ? data.user.id : -1;
            isAuthenticating = false;
            whenAuthenticated.resolve(authentication.userId);
        });*/


        weavy.on("options", function () {
            signInUrl = weavy.options.url + "sign-in?path=" + options.redirect
            signOutUrl = weavy.options.url + "sign-out?path=" + options.redirect
        });

        weavy.on("build", function () {
            if (!weavy.nodes.authenticationFrame) {
                weavy.nodes.authenticationPanel = weavy.panels.addPanel(options.frameName, null, { controls: { close: true }, persistent: true });
                weavy.nodes.authenticationFrame = weavy.nodes.authenticationPanel.querySelector("iframe");
            }
        });

        weavy.on("before:panel-open", function (e, open) {
            if (!weavy.isAuthenticated() && open.panelId !== "authentication") {
                weavy.log("Panel " + open.panelId + " not authenticated, trying to open authentication instead");
                weavy.one("after:signed-in", function () {
                    $.when(weavy.whenClosed).then(function () {
                        weavy.log("after:sign-in: Reopening " + open.panelId);
                        open.panels.open(open.panelId, open.destination);
                    });
                });
                if (!weavy.nodes.authenticationPanel.classList.contains("weavy-open")) {
                    signIn();
                }
                return false;
            }
            return open;
        });

        weavy.on("signing-in", function () {
            if (!weavy.nodes.authenticationPanel || !weavy.nodes.panels) {
                return;
            }

            var wasOpen = $(weavy.nodes.authenticationPanel).hasClass("weavy-open");

            if (weavy.nodes.panels) {
                weavy.nodes.panels.close(options.frameName);
            }

            function onMessage(e, message) {
                message = message || e.data;

                switch (message.name) {
                    case "signed-in":
                        weavy.off(wvy.postal, "message", onMessage);
                        break;
                    case "authentication-error":
                        if (wasOpen) {
                            weavy.nodes.panels.open(options.frameName)
                        }
                        weavy.off(wvy.postal, "message", onMessage);
                        break;
                }

            }

            // listen to signed-in message
            weavy.on(wvy.postal, "message", onMessage);

        });


        weavy.on("before:signed-in", function () {
            if (weavy.openPanelId === options.frameName) {
                weavy.nodes.panels.close(options.frameName);
            }
        });

        // whenAuthenticated promise state handling
        weavy.on("before:signing-in", function () {
            isAuthenticating = true;
        });

        weavy.on("after:signed-in", function () {
            isAuthenticating = false;
            whenAuthenticated.resolve(authentication.userId);
        });

        weavy.on("before:signing-out before:signed-out", function () {
            isAuthenticating = false;
            whenAuthenticated.reject(-1);
        });

        weavy.on("after:signed-out", function () {
            isAuthenticating = false;
            whenAuthenticated.reject(-1);
            whenAuthenticated = $.Deferred();
        });

        weavy.on("signing-in signed-in signing-out signed-out", function (e) {
            authentication.userState = e.type;
        });

        Object.defineProperty(this, "whenAuthenticated", {
            get: function () {
                return whenAuthenticated.promise();
            }
        });

        this.sso = sso;
        this.signIn = signIn;
        this.signOut = signOut;
    };


    /**
     * Default plugin options
     * 
     * @example
     * WeavyAuthentication.authentication.defaults = {
     *     redirect: '/notify',
     *     frameClassName: "",
     *     frameName: "authentication",
     *     jwt: null
     * };
     * 
     * @name defaults
     * @memberof authentication
     * @type {Object}
     * @property {string} redirect=/notify - URL to redirect to after signing in or out
     * @property {string} frameClassName - Classes added to the class-property of {@link authentication#nodes#authenticationFrame}
     * @property {string} frameName=authentication - Name used for the authentication panel
     */
    WeavyAuthentication.defaults = {
        redirect: '/notify',
        frameClassName: "",
        frameName: "authentication",
        jwt: null
    };

    return WeavyAuthentication;
}));

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

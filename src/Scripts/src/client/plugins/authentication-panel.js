/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([
            'jquery',
            'weavy'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(
            require('jquery'),
            require('weavy')
        );
    } else {
        // Browser globals (root is window)
        if (typeof Weavy === 'undefined' || !Weavy.plugins) {
            throw new Error("Weavy must be loaded before registering plugin");
        }

        factory(jQuery, Weavy);
    }
}(typeof self !== 'undefined' ? self : this, function ($, Weavy) {

    /**
     * Plugin for sign-in panel.
     * 
     * @mixin AuthenticationPanelPlugin
     * @returns {Weavy.plugins.authenticationPanel}
     * @typicalname weavy.plugins.authenticationPanel
     */
    var AuthenticationPanelPlugin = function (options) {

        /**
         *  Reference to this instance
         *  @lends AuthenticationPanelPlugin#
         */
        var weavy = this;

        var whenSignedIn = $.Deferred();
        var isSigningIn = false;

        /**
         * The url to the sign in page
         * 
         * @category properties
         * @type {url}
         */
        var signInUrl = weavy.httpsUrl("sign-in?path=" + options.redirect, weavy.options.url);

        /**
         * The sign in panel
         * @member AuthenticationPanelPlugin~authenticationPanel
         * @type {?WeavyPanels~panel}
         * @returns {weavy.nodes.authenticationPanel}
         * @see {@link Weavy#nodes}
         */
        weavy.nodes.authenticationPanel = null;

        /**
         * Open the sign-in page. An authentication attempt is started if credentials are provided.
         * 
         * @example
         * // Open the sign in panel and wait for the user to complete authentication
         * weavy.authentication.authenticationPanel.signIn().then(function() {
         *     weavy.log("User has signed in");
         * }).catch(function() {
         *     weavy.warn("User sign-in failed");
         * });
         * 
         * @memberof AuthenticationPanelPlugin#
         * @returns {external:Promise}
         * @resolved On successful sign-in
         * @rejected On authentication error if [username] and [password] is provided
         * @fires Weavy#signed-in
         * @fires Weavy#authentication-error
         */
        function signIn() {
            weavy.log("signing in");

            if (isSigningIn || weavy.authentication.isAuthorized()) {
                weavy.log("user already " + (isSigningIn ? "signing" : "signed") + " in, moving on");
                return whenSignedIn.promise();
            }

            isSigningIn = true;

            weavy.whenLoaded().then(function () {
                if (weavy.nodes.authenticationPanel) {
                    weavy.log("signIn opening authentication panel")
                    weavy.nodes.authenticationPanel.open(signInUrl);
                }
            });

            // return promise
            return whenSignedIn.promise();
        }

        weavy.on("user", function (e, auth) {
            if (auth.authorized) {
                isSigningIn = false;
                whenSignedIn.resolve(auth);
            }
        });

        weavy.on("build", function () {
            if (!weavy.nodes.authenticationPanel) {
                weavy.nodes.authenticationPanel = weavy.nodes.panels.drawer.addPanel(options.frameName, null, { controls: { close: true }, persistent: true, preload: false });
                weavy.on("panel-close", function (e, closePanel) {
                    if (closePanel.panelId === options.frameName) {
                        weavy.log("signIn authentication panel close")
                        isSigningIn = false;
                    }
                });
            }
        });

        // POST-MESSAGE LISTENERS

        weavy.on(wvy.postal, "signing-in", weavy.getId(), function (e) {
            var message = e.data;
            /**
             * Event triggered when signing in process has begun. The user is still not authenticated. The authentication may result in {@link Weavy#event:signed-in} or {@link Weavy#event:authentication-error}.
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @ignore
             * @category events
             * @event Weavy#signing-in
             * @returns {Object}
             * @property {boolean} isLocal - Is the origin of the event from this weavy instance
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-in", { isLocal: typeof e.source !== "undefined" && (message.weavyId === true || message.weavyId === weavy.getId()) }));
        });


        weavy.on(wvy.postal, "authentication-error", weavy.getId(), function (e) {
            weavy.nodes.authenticationPanel.open();

            /**
             * Event triggered when a sign-in attempt was unsuccessful.
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @ignore
             * @category events
             * @event Weavy#authentication-error
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "authentication-error", { method: "panel", status: 401, message: "Unauthorized" }));
        });

        // EVENT LISTENERS

        weavy.on("signing-in", function () {
            isSigningIn = true;

            if (!weavy.nodes.authenticationPanel || !weavy.nodes.panels || !weavy.nodes.panels.drawer) {
                return;
            }

            if (weavy.nodes.authenticationPanel) {
                weavy.nodes.authenticationPanel.close();
            }
        });

        weavy.on("signed-in", function (e, auth) {
            isSigningIn = false;
            if (weavy.nodes.authenticationPanel) {
                weavy.nodes.authenticationPanel.close();
            }
            whenSignedIn.resolve(auth.user);
        });

        weavy.on("clear-user signed-out", function (e, auth) {
            isSigningIn = false;
            whenSignedIn.reject();
        });

        weavy.on("authentication-error user-error", function (e, error) {
            if (error === undefined || error.method === undefined || error.method !== "panel") {
                isSigningIn = false;
                whenSignedIn.reject();
            }
        });

        weavy.on("signed-out", function (e, auth) {
            whenSignedIn = $.Deferred();
        });

        var authenticationExports = {
            signIn: signIn,
            isSigningIn: function () { return isSigningIn },
            whenSignedIn: function () {
                return whenSignedIn.promise();
            }
        };

        weavy.authentication.authenticationPanel = authenticationExports;

        // Exports
        return authenticationExports;
    };

    /**
     * Default plugin options
     *
     * @example
     * Weavy.plugins.authenticationPanel.defaults = {
     *     redirect: '/notify',
     *     frameClassName: "",
     *     frameName: "authentication"
     * };
     *
     * @name defaults
     * @memberof AuthenticationPanelPlugin
     * @type {Object}
     * @property {string} redirect=/notify - URL to redirect to after signing in or out
     * @property {string} frameName=authentication - Name used for the authentication panel
     */
    AuthenticationPanelPlugin.defaults = {
        redirect: '/notify',
        frameName: "authentication"
    };

    /**
     * Non-optional dependencies.
     * 
     * @ignore
     * @name dependencies
     * @memberof AuthenticationPanelPlugin
     * @type {string[]}
     */
    AuthenticationPanelPlugin.dependencies = [];

    // Register and return plugin
    console.debug("Registering Weavy plugin: authenticationPanel");
    return Weavy.plugins.authenticationPanel = AuthenticationPanelPlugin;
}));

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

(function ($) {

    var PLUGIN_NAME = "signIn";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Plugin for sign-in panel.
     * 
     * @mixin signIn
     * @returns {Weavy.plugins.signIn}
     * @typicalname weavy
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /**
         * The nodes placeholder in [Weavy]{@link Weavy#nodes}
         * @instance
         * @member nodes
         * @memberof signIn
         * @extends Weavy#nodes
         * @typicalname weavy.nodes
         */

        /**
         *  Reference to this instance
         *  @lends signIn#
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
         * Panel displaying the authentication page
         * 
         * @alias weavySignIn#nodes#authenticationPanel
         * @type {?Element}
         * @created Client event: {@link Weavy#event:build}
         */
        weavy.nodes.authenticationPanel = null;

        /**
         * Frame for the {@link weavySignIn#nodes#authenticationPanel}
         * 
         * @alias weavySignIn#nodes#authenticationFrame
         * @type {?FrameElement}
         * @created Client event: {@link Weavy#event:build}
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
         * @returns {external:Promise}
         * @resolves - On successful sign-in
         * @rejects - On authentication error if [username] and [password] is provided
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

            weavy.whenLoaded.then(function () {
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
            if (!weavy.nodes.authenticationFrame) {
                weavy.nodes.authenticationPanel = weavy.panels.addPanel(options.frameName, null, { controls: { close: true }, persistent: true });
                weavy.nodes.authenticationFrame = weavy.nodes.authenticationPanel.querySelector("iframe");
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
             * @category events
             * @event Weavy#signing-in
             * @returns {Object}
             * @property {boolean} isLocal - Is the origin of the event from this weavy instance
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-in", { isLocal: typeof e.source !== "undefined" && (message.weavyId === true || message.weavyId === weavy.getId()) }));
        });

        weavy.on(wvy.postal, "signing-out", weavy.getId(), function (e) {
            var message = e.data;
            /**
             * Event triggered when signing out process has begun. Use this event to do signing out animations and eventually clean up your elements. It will be followed by {@link Weavy#event:signed-out}
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @category events
             * @event Weavy#signing-out
             * @returns {Object}
             * @property {boolean} isLocal - Is the origin of the event from this weavy instance
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "signing-out", { isLocal: typeof e.source !== "undefined" && (message.weavyId === true || message.weavyId === weavy.getId()) }));
        });

        weavy.on(wvy.postal, "authentication-error", weavy.getId(), function (e) {
            weavy.nodes.authenticationPanel.open();

            /**
             * Event triggered when a sign-in attempt was unsuccessful.
             * This event may be triggered from anywhere, not only the Weavy instance.
             * 
             * @category events
             * @event Weavy#authentication-error
             */
            weavy.timeout(0).then(weavy.triggerEvent.bind(weavy, "authentication-error"));
        });

        // EVENT LISTENERS

        weavy.on("signing-in", function () {
            isSigningIn = true;

            if (!weavy.nodes.authenticationPanel || !weavy.nodes.panels) {
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


        weavy.on("signing-out signed-out", function (e, auth) {
            isSigningIn = false;
            whenSignedIn.reject();
        });

        weavy.on("signed-out", function (e, auth) {
            whenSignedIn = $.Deferred();
        });

        Object.defineProperty(this, "whenSignedIn", {
            get: function () {
                return whenSignedIn.promise();
            }
        });

        weavy.authentication.signIn = signIn;


        // Exports
        return {
            signIn: signIn,
            isSigningIn: function () { return isSigningIn }
        }
    };

    /**
     * Default plugin options
     *
     * @example
     * Weavy.plugins.signIn.defaults = {
     *     redirect: '/notify',
     *     frameClassName: "",
     *     frameName: "authentication"
     * };
     *
     * @name defaults
     * @memberof signIn
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

    /**
     * Non-optional dependencies.
     * 
     * @name dependencies
     * @memberof signIn
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = [];

})(jQuery);

/**
 * @external Promise
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */

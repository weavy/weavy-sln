(function ($) {
    var PLUGIN_NAME = "sso";

    console.debug("Registering Weavy plugin:", PLUGIN_NAME);

    if (typeof Weavy === 'undefined' || !Weavy.plugins) {
        throw new Error("Weavy must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Single sign on authentication. 
     * Configure weavy for single sign on then provide your {@link external:jwt} via this plugin to sign in automatically.
     * The [weavy.load]{@link Weavy#event:load} event waits for sso to complete before it is fired.
     * 
     * @example
     * var weavy = new Weavy({
     *     plugins: {
     *         sso: {
     *             jwt: "[your JSON web token]"
     *         }
     *     }
     * });
     * 
     * @mixin sso
     * @returns {Weavy.plugins.sso}
     * @property {sso#state} state
     * @property {sso~states} states
     * @typicalname weavy
     * @see {@link https://jwt.io/}
     */
    Weavy.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends sso#
         */
        var weavy = this;

        /**
         * The authentication states. Available via plugin exports in `weavy.plugins.sso.states`
         *
         * @memberof sso~
         * @enum {int}
         */
        var states = {
            /** Authentication has not started */
            uninitialized: 0,
            /** Currently authenticating */
            authenticating: 1,
            /** Authentication process complete and user is authorized */
            authorized: 2,
            /** Authentication process failed and the user is unauthorized */
            unauthorized: 3
        }

        /**
         * The current state of authentication.
         *
         * @type sso~states
         */
        var state = states.uninitialized;

        weavy.on("options", function (e) {
            var options = weavy.options.plugins[PLUGIN_NAME];
            state = options.state;
            if (options.jwt && state === states.authenticating) {

                // prevent load event
                weavy.isLoaded = true;

                // when server says state is authenticating we should call sign-in-token to get an auth cookie
                weavy.log("Signing in with JWT token");
                window.postMessage({ name: "signing-in" }, "*");
                $.ajax(weavy.httpsUrl(weavy.options.url + "sign-in-token", weavy.options.url), {
                    crossDomain: true,
                    data: "jwt=" + options.jwt,
                    method: "POST",
                    xhrFields: {
                        withCredentials: true
                    }
                }).done(function () {
                    state = states.authorized;
                    weavy.log("Signed in with JWT token");
                    window.postMessage({ name: "signed-in" }, "*");
                }).fail(function () {
                    state = states.unauthorized;
                    weavy.warn("Sign in with JWT token failed");
                    window.postMessage({ name: "authentication-error" }, "*");
                });
            }
        });

        weavy.on("signed-out", function () {
            state = states.uninitialized;
        });

        // Exports
        return {
            state: state,
            states: states
        }
    };

    /**
     * Default plugin options
     * 
     * @example
     * Weavy.plugins.sso.defaults = {
     *     jwt: ANY_JSON_WEB_TOKEN
     * };
     * 
     * @name defaults
     * @memberof sso
     * @type {Object}
     * @property {external:jwt} jwt - JSON web token for authentication
     */
    Weavy.plugins[PLUGIN_NAME].defaults = {
        jwt: null
    };

    /**
     * Non-optional dependencies.
     * 
     * @ignore
     * @name dependencies
     * @memberof sso
     * @type {string[]}
     */
    Weavy.plugins[PLUGIN_NAME].dependencies = [
    ];

})(jQuery);

/**
 * @external jwt
 * @see https://jwt.io/
 */

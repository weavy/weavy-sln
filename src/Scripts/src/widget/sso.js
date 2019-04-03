(function ($) {
    var PLUGIN_NAME = "sso";

    console.debug("Registering WeavyWidget plugin:", PLUGIN_NAME);

    if (typeof WeavyWidget === 'undefined' || !WeavyWidget.plugins) {
        throw new Error("WeavyWidget must be loaded before registering plugin: " + PLUGIN_NAME);
    }

    /**
     * Single sign on authentication. 
     * Configure weavy for single sign on then provide your {@link external:jwt} via this plugin to sign in automatically.
     * The {@link ./widget#WeavyWidget+event_load|widget.load} event waits for sso to complete before it is fired. 
     * 
     * @example
     * var widget = new WeavyWidget({
     *     plugins: {
     *         sso: {
     *             jwt: "[your JSON web token]"
     *         }
     *     }
     * });
     * 
     * @module sso
     * @returns {WeavyWidget.plugins.sso}
     * @property {module:sso#ssoState} ssoState
     * @property {module:sso~states} states
     * @typicalname widget
     * @see {@link https://jwt.io/}
     */
    WeavyWidget.plugins[PLUGIN_NAME] = function (options) {
        /** 
         *  Reference to this instance
         *  @lends module:sso#
         */
        var widget = this;

        /**
         * The authentication states. Available via plugin exports in `widget.plugins.sso.states`
         *
         * @memberof module:sso~
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
         * @type module:sso~states
         */
        widget.ssoState = states.uninitialized;

        widget.on("options", function (e) {
            var options = widget.options.plugins[PLUGIN_NAME];            
            if (widget.ssoState === states.uninitialized && options.jwt && !widget.isAuthenticated()) {
                widget.log("Initiating SSO");

                // Prevent load event
                widget.isLoaded = true;

                var url = widget.options.url + "sign-in-token";

                widget.ssoState = states.authenticating;
                window.postMessage({ name: "signing-in" }, "*");

                $.ajax(widget.httpsUrl(url), {
                    crossDomain: true,
                    data: "jwt=" + options.jwt,
                    method: "POST",
                    xhrFields: {
                        withCredentials: true
                    }
                }).done(function () {
                    widget.ssoState = states.authorized;
                    widget.log("SSO authentication ok");
                    window.postMessage({ name: "signed-in" }, "*");
                }).fail(function () {
                    widget.ssoState = states.unauthorized;
                    widget.warn("SSO authentication denied");
                    window.postMessage({ name: "authentication-error" }, "*");
                });
            }
        });

        widget.on("signed-out", function () {
            widget.ssoState = states.uninitialized;
        });

        // Exports
        return {
            state: widget.ssoState,
            states: states
        }
    };

    /**
     * Default plugin options
     * 
     * @example
     * WeavyWidget.plugins.sso.defaults = {
     *     jwt: ANY_JSON_WEB_TOKEN
     * };
     * 
     * @name defaults
     * @memberof module:sso
     * @type {Object}
     * @property {external:jwt} jwt - JSON web token for authentication
     */
    WeavyWidget.plugins[PLUGIN_NAME].defaults = {
        jwt: null
    };

    /**
     * Non-optional dependencies.
     * 
     * @ignore
     * @name dependencies
     * @memberof module:sso
     * @type {string[]}
     */
    WeavyWidget.plugins[PLUGIN_NAME].dependencies = [
    ];

})(jQuery);

/**
 * @external jwt
 * @see https://jwt.io/
 */

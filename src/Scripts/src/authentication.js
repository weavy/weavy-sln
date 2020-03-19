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
        root.wvy = root.wvy || {};
        root.wvy.authentication = root.wvy.authentication || new factory(jQuery);
    }
}(typeof self !== 'undefined' ? self : this, function ($) {
    console.debug("authentication.js");

    var userUrl = "/client/user";
    var ssoUrl = "/client/sign-in";
    var signOutUrl = "/client/sign-out";

    // MULTI AUTHENTICATION HANDLING
    var authentications = this;
    var _authentications = new Map();

    var WeavyAuthentication = function (baseUrl) {
        /**
         *  Reference to this instance
         *  @lends WeavyAuthentication#
         */
        var weavyAuthentication = this;

        baseUrl = baseUrl || "";

        if (baseUrl) {
            // Remove trailing slash
            baseUrl = /\/$/.test(baseUrl) ? baseUrl.slice(0, -1) : baseUrl;
        }

        function resolveUrl(url, resolveBaseUrl) {
            var https = WeavyAuthentication.defaults.https || "adaptive";
            resolveBaseUrl = resolveBaseUrl || baseUrl || "";

            if (typeof url === "string" && https !== "nochange") {
                // Check baseUrl and url protocol
                if (resolveBaseUrl && !/^[0-9a-zA-Z+\-.]*:/.test(url)) {
                    // Remove beginning slash
                    if (url.indexOf("/") === 0) {
                        url = url.substr(1);
                    }
                    // Add trailing slash
                    if (resolveBaseUrl.lastIndexOf("/") !== resolveBaseUrl.length - 1) {
                        resolveBaseUrl += "/";
                    }
                    url = resolveBaseUrl + url;
                }

                // Check protocol
                if (https === "enforce") {
                    url = url.replace(/^http:/, "https:");
                } else if (https === "adaptive") {
                    url = url.replace(/^http:/, window.location.protocol);
                }
            }
            return url;
        }

        var _events = [];

        var _user = null;
        var _jwt;

        // Is the user established?
        var _isAuthenticated = null;
        var _whenAuthenticated = $.Deferred();
        var _whenAuthorized = $.Deferred();

        var _isNavigating = false;

        window.addEventListener('beforeunload', function () {
            _isNavigating = true;
        });

        window.addEventListener('turbolinks:request-start', function () {
            _isNavigating = true;
        });

        window.addEventListener('turbolinks:load', function () {
            _isNavigating = false;
        });


        /**
         * Checks if the provided or authenticated user is signed in
         * 
         * @param {any} [user] - Optional user to check
         */
        function isAuthorized(user) {
            if (user) {
                return user.id && user.id !== -1;
            }
            return _user && _user.id && _user.id !== -1;
        }

        function init(jwt) {
            if (_isAuthenticated === null) {
                if (jwt) {
                    // If JWT is defined, it should always be processed
                    sso(jwt);
                } else if (wvy.context && wvy.context.user) {
                    // If user is defined in wvy.context, user is already signed in
                    setUser({ id: wvy.context.user });
                } else {
                    // Check for current user state
                    update();
                }

                // Listen on messages from parent?
                wvy.postal.on("broadcast", onBroadcastMessageReceived);
                
                console.log("wvy.authentication: init")
                wvy.connection.get(baseUrl).on("authenticate.weavy.rtmweavy", function () {
                    console.log("wvy.authentication: authenticate.weavy -> update");
                    update();
                });
            }
        }

        function setUser(user) {
            console.debug("wvy.authentication: setUser", user.id);
            _user = user;
            if (wvy.context) {
                wvy.context.user = user.id;
            }
            _isAuthenticated = true;
            if (isAuthorized(user)) {
                _whenAuthorized.resolve();
            } else {
                if (_whenAuthorized.state() !== "pending") {
                    _whenAuthorized = $.Deferred();
                }
            }

            _whenAuthenticated.resolve(user);
        }

        function alert(message) {
            if (wvy.alert && !_isNavigating) {
                wvy.alert.alert("info", message, null, "wvy-authentication-alert");
            }
        }

        // EVENTS

        function on(event, handler) {
            event = event.indexOf(".weavy") === -1 ? event + ".weavy" : event;
            _events.push([event, handler]);
            $(weavyAuthentication).on(event, null, null, handler);
        }

        function triggerEvent(name) {
            var event = $.Event(name);

            // trigger event (with json object instead of string), handle any number of json objects passed from hub (args)
            var argumentArray = [].slice.call(arguments, 1);
            var data = argumentArray.map(function (a) {
                if (a && !$.isArray(a) && !$.isPlainObject(a)) {
                    try {
                        return JSON.parse(a);
                    } catch (e) {
                        console.warn("wvy.authentication: could not parse event data;", name);
                    }
                }
                return a;
            });

            $(weavyAuthentication).triggerHandler(event, data);
            triggerBroadcast("broadcast-authentication-event", name, data);
        }

        // trigger a message broadcast
        function triggerBroadcast(name, eventName, data) {
            try {
                var onlyDownstream = true;
                wvy.postal.postBroadcast({ name: name, eventName: eventName, data: data }, null, onlyDownstream);
            } catch (e) {
                console.error("wvy.authentication: could not broadcast authentication message", { name: name, eventName: eventName }, e);
            }
        }

        // AUTHENTICATION

        function signOut() {
            var authUrl = resolveUrl(signOutUrl);

            triggerEvent("signing-out");

            $.ajax(authUrl, {
                crossDomain: true,
                method: "GET",
                xhrFields: {
                    withCredentials: true
                }
            }).catch(function () {
                console.warn("wvy.authentication: signOut request fail");
            }).always(function () {
                processUser({ id: -1 });
            });
        }

        function processUser(user) {
            // Default state when user is unauthenticated or has not changed
            var state = "updated";

            var reloadLink = ' <a href="#" onclick="location.reload(); return false;">Reload</a>'

            if (_isAuthenticated) {
                if (isAuthorized()) {
                    // When signed in

                     if (user && user.id === -1) {
                         console.log("wvy.authentication: signed-out");
                         alert("You have been signed out, reload to sign in again." + reloadLink);
                        // User signed out
                        state = "signed-out";
                     } else if (user && user.id !== _user.id) {
                         console.log("wvy.authentication: changed-user");
                         alert("The signed in user has changed, please reload the page." + reloadLink)
                         // User changed
                         state = "changed-user";
                     }
                } else {
                    // When signed out

                    if (user && user.id !== -1) {
                        console.log("wvy.authentication: signed-in")
                        alert("You have been signed in, please reload." + reloadLink)
                        // User signed in
                        state = "signed-in";
                    }
                }
            }

            triggerEvent("user", { state: state, authorized: isAuthorized(user), user: user });
            setUser(user);
        }

        function update() {
            wvy.postal.whenLeader.then(function () {
                console.debug("wvy.authentication: whenLeader => update");
                var authUrl = resolveUrl(userUrl);

                $.ajax(authUrl, {
                    crossDomain: true,
                    method: "GET",
                    xhrFields: {
                        withCredentials: true
                    }
                }).then(function (actualUser) {
                    processUser(actualUser);
                }).catch(function () {
                    console.warn("wvy.authentication: update request fail");
                    processUser({ id: -1 });
                });
            }).catch(function () {
                wvy.postal.postToParent({ name: "request:user" });
            });

            return _whenAuthenticated.promise();
        }

        // SSO

        // Sign in using Single Sign On JWT token
        function sso(jwt) {
            var whenSSO = $.Deferred();
            wvy.postal.whenLeader.then(function () {

                var authUrl = resolveUrl(ssoUrl);


                var jwtIsNew = !_jwt || _jwt !== jwt;
                _jwt = jwt;

                if (jwtIsNew) {
                    triggerEvent("signing-in");

                    $.ajax(authUrl, {
                        crossDomain: true,
                        contentType: "application/json",
                        data: JSON.stringify({ jwt: _jwt }),
                        method: "POST",
                        xhrFields: {
                            withCredentials: true
                        }
                    }).then(function (ssoUser) {
                        processUser(ssoUser);
                        whenSSO.resolve(ssoUser);
                    }).catch(function (xhr, status, error) {
                        console.warn("wvy.authentication: sign in with JWT token failed", xhr.statusText, status);
                        processUser({ id: -1 });
                        whenSSO.reject({ id: -1 });
                    });
                } else {
                    console.warn("wvy.authentication: JWT token already used");
                    whenSSO.reject(_user);
                }

            }).catch(function () {
                whenSSO.reject();
            });
            return whenSSO.promise();
        }


        // REALTIME CROSS WINDOW MESSAGE
        // handle cross frame events from rtm
        var onBroadcastMessageReceived = function (e) {
            var msg = e.data;
            //console.debug("wvy.authentication: broadcast received", msg.name, msg.eventName || "");
            switch (msg.name) {
                case "request:user":
                    wvy.postal.postToSource(e, { name: "user", user: _user });
                    break;
                case "user":
                    processUser(msg.user);
                    break;
                case "broadcast-authentication-event":
                    var name = msg.eventName;
                    var event = $.Event(name);
                    var data = msg.data;

                    // Extract array with single value
                    if ($.isArray(data) && data.length === 1) {
                        data = data[0];
                    }

                    if (name === "user") {
                        processUser(data.user);
                    } else {
                        console.debug("wvy.authentication: triggering received broadcast-event", name);
                        $(weavyAuthentication).triggerHandler(event, msg.data);
                    }

                    break;
                default:
                    return;
            }

        };


        function destroy() {
            _isAuthenticated = null;
            _user = null;
            _jwt = null;
 
            _events.forEach(function (eventHandler) {
                var name = eventHandler[0], handler = eventHandler[1];
                $(weavyAuthentication).off(name, null, handler);
            });
            _events = [];
        }

        return {
            init: init,
            isAuthorized: isAuthorized,
            isAuthenticated: function () { return _isAuthenticated; },
            whenAuthenticated: function () { return _whenAuthenticated.promise(); },
            whenAuthorized: function () { return _whenAuthorized.promise(); },
            on: on,
            signOut: signOut,
            sso: sso,
            update: update,
            user: _user,
            destroy: destroy
        };
    };

    WeavyAuthentication.defaults = {
        https: "adaptive"
    };

    authentications.get = function (url) {
        var sameOrigin = false;
        var urlExtract = url && /^(https?:\/(\/[^/]+)+)\/?$/.exec(url)
        if (urlExtract) {
            sameOrigin = window.location.origin === urlExtract[1];
            url = urlExtract[1];
        }
        url = (sameOrigin ? "" : url) || "";
        if (_authentications.has(url)) {
            return _authentications.get(url);
        } else {
            var authentication = new WeavyAuthentication(url);
            _authentications.set(url, authentication);
            return authentication;
        }
    };

    authentications.remove = function (url) {
        url = url || "";
        try {
            var authentication = _authentications.get(url);
            if (authentication && authentication.destroy) {
                authentication.destroy();
            }
            _authentications.delete(url);
        } catch (e) {
            console.error("Could not remove authentication", url, e);
        }
    };

    // expose wvy.connection.default. self initiatied upon access and no other connections are active 
    Object.defineProperty(authentications, "default", {
        get: function () {
            if (_authentications.has("")) {
                return _authentications.get("");
            } else {
                var authentication = authentications.get();

                $(function () {
                    setTimeout(function () {
                        if (_authentications.size === 1) {
                            console.debug("wvy.authentication self init");
                            authentication.init();
                        }
                    }, 1);
                });

                return authentication;
            }
        }
    });

    // Bridge for simple syntax and backward compatibility with the mobile apps
    Object.defineProperty(authentications, "on", {
        get: function () {
            return authentications.default.on;
        }
    });

    // Bridge for simple syntax
    Object.defineProperty(authentications, "sso", {
        get: function () {
            return authentications.default.sso;
        }
    });
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

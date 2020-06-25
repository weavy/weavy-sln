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

    console.debug("authentication.js", window.name);

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

        var _isUpdating = false;
        var _isNavigating = false;

        window.addEventListener('beforeunload', function () {
            _isNavigating = true;
        });

        window.addEventListener('turbolinks:request-start', function () {
            _isNavigating = true;
        });

        window.addEventListener('turbolinks:load', function () {
            _isNavigating = false;

            // If the user was changed on page load, process the user instantly
            if (_user && wvy.context && wvy.context.user && _user.id !== wvy.context.user) {
                processUser({ id: wvy.context.user });
            }
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
                wvy.postal.on("message", onChildMessageReceived);
                wvy.postal.on("distribute", onParentMessageReceived);
                
                console.log("wvy.authentication: init", baseUrl || window.name || "self");

                wvy.connection.get(baseUrl).on("authenticate.weavy.rtmweavy", function () {
                    console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " authenticate.weavy -> update");
                    update();
                });
            }
        }

        function setUser(user) {
            if (_user && user && _user.id !== user.id) {
                console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " setUser", user.id);
            }
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

        function off(event, handler) {
            event = event.indexOf(".weavy") === -1 ? event + ".weavy" : event;

            _events = _events.filter(function (eventHandler) {
                if (eventHandler[0] === event && eventHandler[1] === handler) {
                    $(weavyAuthentication).off(event, null, handler);
                    return false;
                } else {
                    return true;
                }
            })

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
                        console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " could not parse event data;", name);
                    }
                }
                return a;
            });

            $(weavyAuthentication).triggerHandler(event, data);
            triggerToChildren("distribute-authentication-event", name, data);
        }

        // trigger a message distribute
        function triggerToChildren(name, eventName, data) {
            try {
                wvy.postal.postToChildren({ name: name, eventName: eventName, data: data }, null);
            } catch (e) {
                console.error("wvy.authentication:" + (window.name ? " " + window.name : "") + " could not distribute authentication message to children", { name: name, eventName: eventName }, e);
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
                console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " signOut request fail");
            }).always(function () {
                console.debug("wvy.authentication: signout ajax -> processing user")

                processUser({ id: -1 });
            });
        }

        function processUser(user) {
            // Default state when user is unauthenticated or has not changed
            var state = "updated";

            var reloadLink = ' <a href="#" onclick="location.reload(); return false;">Reload</a>';

            if (_isAuthenticated) {
                if (isAuthorized()) {
                    // When signed in

                     if (user && user.id === -1) {
                         console.log("wvy.authentication: signed-out");
                         alert("You have been signed out." + reloadLink);
                        // User signed out
                        state = "signed-out";
                     } else if (user && user.id !== _user.id) {
                         console.log("wvy.authentication: changed-user");
                         alert("The signed in user has changed." + reloadLink)
                         // User changed
                         state = "changed-user";
                     }
                } else {
                    // When signed out

                    if (user && user.id !== -1) {
                        console.log("wvy.authentication: signed-in");

                        // Show a message if the user hasn't loaded a new page
                        if (wvy.context && wvy.context.user && user.id !== wvy.context.user) {
                            alert("You have signed in." + reloadLink);
                        }

                        // User signed in
                        state = "signed-in";
                    }
                }
            }

            setUser(user);
            triggerEvent("user", { state: state, authorized: isAuthorized(user), user: user });

            _isUpdating = false;
        }

        function update() {
            if (!_isUpdating) {
                _isUpdating = true;
                wvy.postal.whenLeader.then(function () {
                    console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " whenLeader => update");
                    var authUrl = resolveUrl(userUrl);

                    if (_whenAuthenticated.state() !== "pending") {
                        _whenAuthenticated = $.Deferred();
                    }
                    if (_whenAuthorized.state() !== "pending") {
                        _whenAuthorized = $.Deferred();
                    }
                    $.ajax(authUrl, {
                        crossDomain: true,
                        method: "GET",
                        xhrFields: {
                            withCredentials: true
                        }
                    }).then(function (actualUser) {
                        console.debug("wvy.authentication: update ajax -> processing user")
                        processUser(actualUser);
                    }).catch(function () {
                        console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " update request fail");
                        console.debug("wvy.authentication: update ajax.catch() -> processing user");
                        processUser({ id: -1 });
                    });
                }).catch(function () {
                    wvy.postal.postToParent({ name: "request:user" });
                });
            }

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
                        console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " sign in with JWT token failed", xhr.statusText, status);
                        processUser({ id: -1 });
                        whenSSO.reject({ id: -1 });
                    });
                } else {
                    console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " JWT token already used");
                    whenSSO.reject(_user);
                }

            }).catch(function () {
                whenSSO.reject();
            });
            return whenSSO.promise();
        }


        // REALTIME CROSS WINDOW MESSAGE
        // handle cross frame events from rtm
        var onChildMessageReceived = function (e) {
            var msg = e.data;
            switch (msg.name) {
                case "request:user":
                    _whenAuthenticated.then(function () {
                        wvy.postal.postToSource(e, { name: "user", user: _user });
                    })
                    break;
                default:
                    return;
            }

        };

        var onParentMessageReceived = function (e) {
            var msg = e.data;
            switch (msg.name) {
                case "user":
                    console.debug("wvy.authentication: parentMessage user -> processing user");
                    processUser(msg.user);
                    break;
                case "distribute-authentication-event":
                    var name = msg.eventName;
                    var event = $.Event(name);
                    var data = msg.data;

                    // Extract array with single value
                    if ($.isArray(data) && data.length === 1) {
                        data = data[0];
                    }

                    if (name === "user") {
                        console.debug("wvy.authentication: parentMessage distribute-authentication-event user -> processing user");
                        processUser(data.user);
                    } else {
                        console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " triggering received distribute-event", name);
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
            off: off,
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

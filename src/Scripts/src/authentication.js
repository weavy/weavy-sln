/* eslint-env commonjs, amd, jquery */

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

    //console.debug("authentication.js", window.name);

    var userUrl = "/client/user";
    var ssoUrl = "/client/sign-in";
    var signOutUrl = "/client/sign-out";

    // MULTI AUTHENTICATION HANDLING
    var authentications = this;
    var _authentications = new Map();

    // JSON HELPERS
    var toCamel = function (s) {
        // from PascalCase
        s = s[0].toLowerCase() + s.substring(1);

        // from snake_case and spinal-case
        return s.replace(/([-_][a-z])/ig, function ($1) {
            return $1.toUpperCase()
                .replace('-', '')
                .replace('_', '');
        });
    };

    var keysToCamel = function (o) {
        if ($.isPlainObject(o)) {
            const n = {};

            Object.keys(o)
                .forEach(function (k) {
                    n[toCamel(k)] = keysToCamel(o[k]);
                });

            return n;
        } else if ($.isArray(o)) {
            return o.map(function (i) {
                return keysToCamel(i);
            });
        }

        return o;
    };

    var WeavyAuthentication = function (baseUrl) {

        /**
         *  Reference to this instance
         *  @lends WeavyAuthentication#
         */
        var weavyAuthentication = this;

        var initialized = false;

        baseUrl = baseUrl || window.location.origin + (wvy.config && wvy.config.applicationPath || "/");

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

        // Is the user established?
        var _isAuthenticated = null;
        var _whenAuthenticated = $.Deferred();
        var _whenAuthorized = $.Deferred();

        var _isUpdating = false;
        var _isNavigating = false;

        var _whenSignedOut = $.Deferred();
        var _isSigningOut = false;

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
                processUser({ id: wvy.context.user }, "turbolinks:load/wvy.context.user");
            }
        });


        /**
         * Checks if the provided or authenticated user is signed in
         * 
         * @param {any} [user] - Optional user to check
         */
        function isAuthorized(user) {
            if (user) {
                return user.id && user.id !== -1 || false;
            }
            return _user && _user.id && _user.id !== -1 || false;
        }

        // JWT
        var _jwt;
        var _jwtProvider;

        function setJwt(jwt) {
            console.debug("wvy.authentication: configuring jwt");
            _jwt = null;
            _jwtProvider = jwt;
        }

        /**
         * Returns the current jwt token; either the specified jwt string or as a result from the supplied function.
         * @param {boolean} [refresh=false] - Set to true if you want to call the host for a new token.
         * @returns {external:Promise}
         */
        function getJwt(refresh) {
            return new Promise(function (resolve, reject) {
                if (_jwt && !refresh) {
                    // jwt already set, return it
                    resolve(_jwt);
                    return;
                }

                if (refresh) {
                    // reset jwt on refresh
                    _jwt = null;
                }

                if (_jwtProvider === undefined) {
                    // no jwt provided, return nothing
                    resolve(false);
                    return;
                }

                if (typeof _jwtProvider === "string") {
                    _jwt = _jwtProvider;
                    resolve(_jwt);
                } else if (typeof _jwtProvider === "function") {
                    var resolvedProvider = _jwtProvider();

                    if (typeof resolvedProvider.then === "function") {
                        return resolvedProvider.then(function (token) {
                            _jwt = token;
                            resolve(_jwt);
                        }, function () {
                            reject("failed to get token from the jwt provider promise");
                        });
                    } else if (typeof resolvedProvider === "string") {
                        _jwt = resolvedProvider;
                        resolve(_jwt);
                    } else {
                        reject("failed to get token from the jwt provider function");
                    }
                } else {
                    reject("jwt option must be a string or a function that returns a promise");
                }
            });
        }

        function clearJwt() {
            console.debug("wvy.authentication: clearing jwt");
            _jwt = null;
            _jwtProvider = null;
        }

        function init(jwt) {
            if (_isAuthenticated === null || jwt && jwt !== _jwtProvider) {
                if (typeof jwt === "string" || typeof jwt === "function") {
                    setJwt(jwt);
                }

                // Authenticate
                if (_jwtProvider !== undefined) {
                    console.log("wvy.authentication: authenticate by jwt")
                    // If JWT is defined, it should always be processed
                    signIn();
                } else if (wvy.context && wvy.context.user) {
                    // If user is defined in wvy.context, user is already signed in
                    setUser({ id: wvy.context.user }, "init/wvy.context.user");
                } else {
                    // Check for current user state
                    updateUserState("authenticate()");
                }
            }

            if (!initialized) {
                initialized = true;

                // Listen on messages from parent?
                wvy.postal.on("message", { weavyId: "wvy.authentication", baseUrl: baseUrl }, onChildMessageReceived);
                wvy.postal.on("distribute", { weavyId: "wvy.authentication", baseUrl: baseUrl }, onParentMessageReceived);

                console.log("wvy.authentication: init", baseUrl || window.name || "self");

                wvy.connection.get(baseUrl).on("authenticate.weavy.rtmweavy", onConnectionAuthenticate);
            }

            return _whenAuthenticated.promise();
        }

        function setUser(user, originSource) {
            if (user && user.id) {
                if (_user && user && _user.id !== user.id) {
                    console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " setUser", user.id, originSource);
                }
                _user = user;
                if (wvy.context) {
                    wvy.context.user = user.id;
                }
                _isAuthenticated = true;
                if (isAuthorized(user)) {
                    _whenAuthorized.resolve();
                } else {
                    // Authenticated but still awaiting auhorization
                    if (_whenAuthorized.state() !== "pending") {
                        _whenAuthorized = $.Deferred();
                    }
                    _isSigningOut = false;
                    _whenSignedOut.resolve();
                }

                _whenAuthenticated.resolve(user);
            } else {
                // No valid user, reset states
                _user = null;
                if (wvy.context) {
                    wvy.context.user = null;
                }
                _isAuthenticated = false;

                _whenAuthorized.reject();
                _whenAuthorized = $.Deferred();
            }
        }

        function alert(message, type) {
            if (wvy.alert && !_isNavigating) {
                wvy.alert.alert(type || "info", message, null, "wvy-authentication-alert");
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

            var eventResult = $(weavyAuthentication).triggerHandler(event, data);
            var eventIsPrevented = event.isDefaultPrevented() || eventResult === false;

            triggerToChildren("distribute-authentication-event", name, data);

            return eventIsPrevented ? false : eventResult;
        }

        // trigger a message distribute
        function triggerToChildren(name, eventName, data) {
            try {
                wvy.postal.postToChildren({ name: name, eventName: eventName, data: data, weavyId: "wvy.authentication", baseUrl: baseUrl }, null);
            } catch (e) {
                console.error("wvy.authentication:" + (window.name ? " " + window.name : "") + " could not distribute authentication message to children", { name: name, eventName: eventName }, e);
            }
        }

        // AUTHENTICATION

        /**
         * Sign in using Single Sign On JWT token. 
         * 
         * A new JWT provider will replace the current JWT provider, then the JWT will be validated.
         * 
         * @param {string|function} [jwt] - Optional JWT token string or JWT provider function returning a Promise or JWT token string
         */
        function signIn(jwt) {
            if (typeof jwt === "string" || typeof jwt === "function") {
                setJwt(jwt);
            }
            return wvy.postal.whenLeader.always(function () { return validateJwt(); });
        }

        /**
         * Sign out the current user.
         * 
         * @param {boolean} [clear] - Clears JWT provider after signOut
         */
        function signOut(clear) {
            var authUrl = resolveUrl(signOutUrl);
            _isSigningOut = true;

            if (clear) {
                clearJwt();
            }

            triggerEvent("clear-user");

            $.ajax(authUrl, {
                crossDomain: true,
                method: "GET",
                xhrFields: {
                    withCredentials: true
                }
            }).fail(function () {
                console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " signOut request fail");
            }).always(function () {
                console.debug("wvy.authentication: signout ajax -> processing user");

                processUser({ id: -1 }, "signOut()");
            });

            return _whenSignedOut.promise();
        }

        function processUser(user, originSource) {
            // Default state when user is unauthenticated or has not changed
            var state = "updated";

            var reloadLink = ' <a href="#" onclick="location.reload(); return false;">' + wvy.t("Reload") + '</a>';

            if (user && user.id) {
                if (_isAuthenticated) {
                    if (isAuthorized()) {
                        // When signed in
                        if (user && user.id === -1) {
                            console.log("wvy.authentication: signed-out");
                            alert(wvy.t("You have been signed out.") + reloadLink);
                            // User signed out
                            state = "signed-out";
                        } else if (user && user.id !== _user.id) {
                            console.log("wvy.authentication: changed-user");
                            alert(wvy.t("The signed in user has changed.") + reloadLink)
                            // User changed
                            state = "changed-user";
                        }
                    } else {
                        // When signed out
                        if (user && user.id !== -1) {
                            console.log("wvy.authentication: signed-in", originSource);

                            // Show a message if the user hasn't loaded a new page
                            if (wvy.context && wvy.context.user && user.id !== wvy.context.user) {
                                alert(wvy.t("You have signed in.") + reloadLink);
                            }

                            // User signed in
                            state = "signed-in";
                        }
                    }
                }

                setUser(user, originSource || "processUser()");
                triggerEvent("user", { state: state, authorized: isAuthorized(user), user: user });
            } else {
                // No valid user state
                console.error("wvy.authentication: user-error", originSource || "");

                setUser(null, originSource || "processUser()");
                triggerEvent("clear-user");

                var eventResult = triggerEvent("user", { state: "user-error", authorized: false, user: user });
                if (eventResult !== false) {
                    wvy.postal.whenLeader.then(function () {
                        alert(wvy.t("Authentication error.") + reloadLink, "danger");
                    });
                }
            }

            _isUpdating = false;
        }

        function updateUserState(originSource) {
            if (!_isUpdating) {
                _isUpdating = true;
                wvy.postal.whenLeader.then(function () {
                    console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " whenLeader => updateUserState");

                    if (_whenAuthenticated.state() !== "pending") {
                        _whenAuthenticated = $.Deferred();
                    }
                    if (_whenAuthorized.state() !== "pending") {
                        _whenAuthorized = $.Deferred();
                    }

                    var authSettings = {
                        url: resolveUrl(userUrl),
                        method: "POST",
                        contentType: "application/json",
                        crossDomain: true,
                        dataType: "json",
                        data: {},
                        dataFilter: function (data, dataType) {
                            return dataType === "json" ? JSON.stringify(keysToCamel(JSON.parse(data))) : data;
                        },
                        xhrFields: {
                            withCredentials: true
                        },
                        headers: {
                            // https://stackoverflow.com/questions/8163703/cross-domain-ajax-doesnt-send-x-requested-with-header
                            "X-Requested-With": "XMLHttpRequest"
                        }
                    };

                    getJwt().then(function (token) {
                        if (typeof token === "string") {
                            authSettings.data = JSON.stringify({ jwt: token });
                        }

                        $.ajax(authSettings).then(null, function (xhr, status, error) {
                            if (token !== undefined && xhr.status === 401) {
                                console.warn("wvy.authentication: JWT failed, trying again");
                                return getJwt(true).then(function (token) {
                                    authSettings.data.jwt = token;
                                    return $.ajax(authSettings);
                                })
                            }
                        }).then(function (actualUser) {
                            console.debug("wvy.authentication: updateUserState ajax -> processing user")
                            processUser(actualUser, "updateUserState," + originSource);
                        }, function () {
                            console.warn("wvy.authentication:" + (window.name ? " " + window.name : "") + " updateUserState request fail");
                            console.debug("wvy.authentication: updateUserState ajax xhr fail -> processing user");
                            processUser({ id: null }, "updateUserState," + originSource);
                        });
                    });
                }).catch(function () {
                    wvy.postal.postToParent({ name: "request:user", weavyId: "wvy.authentication", baseUrl: baseUrl });
                });
            }

            return _whenAuthenticated.promise();
        }

        function validateJwt(refresh) {
            var whenSSO = $.Deferred();
            var authUrl = resolveUrl(ssoUrl);

            if (_isSigningOut) {
                // Wait for signout to complete
                console.log("wvy.authentication: vaildate jwt awaiting sign-out");
                return _whenSignedOut.then(function () { return validateJwt(refresh); });
            } else if (_whenSignedOut.state() !== "pending") {
                // Reset signed out promise
                _whenSignedOut = $.Deferred();
            }

            console.log("wvy.authentication: validating jwt");

            if (!refresh) {
                triggerEvent("signing-in");
            }

            return getJwt(refresh).then(function (jwt) {
                return $.ajax(authUrl, {
                    crossDomain: true,
                    contentType: "application/json",
                    method: "GET",
                    xhrFields: {
                        withCredentials: true
                    },
                    // https://stackoverflow.com/questions/8163703/cross-domain-ajax-doesnt-send-x-requested-with-header
                    headers: {
                        "Authorization": "Bearer " + jwt,
                        "X-Requested-With": "XMLHttpRequest"
                    }
                }).then(function (ssoUser) {
                    processUser(ssoUser);
                    return whenSSO.resolve(ssoUser);
                }, function (xhr, status, error) {

                    if (xhr.status === 401 && !refresh) {
                        console.warn("wvy.authentication: JWT failed, trying again");
                        return validateJwt(true);
                    } else {
                        triggerEvent("authentication-error", { method: "jwt", status: xhr.status, message: xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : error });
                        console.error("wvy.authentication:" + (window.name ? " " + window.name : "") + " sign in with JWT token failed", xhr.status, xhr.responseJSON && xhr.responseJSON.message ? "\n" + xhr.responseJSON.message : error);
                        processUser({ id: null });
                        return whenSSO.reject({ id: null });
                    }
                });
            })
        }

        // REALTIME CROSS WINDOW MESSAGE
        // handle cross frame events from rtm
        var onChildMessageReceived = function (e) {
            var msg = e.data;
            switch (msg.name) {
                case "request:user":
                    _whenAuthenticated.then(function () {
                        wvy.postal.postToSource(e, { name: "user", user: _user, weavyId: "wvy.authentication", baseUrl: baseUrl });
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
                    processUser(msg.user, "parentMessage:user");
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
                        processUser(data.user, "distribute-authentication-event:user");
                    } else {
                        console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " triggering received distribute-event", name);
                        $(weavyAuthentication).triggerHandler(event, msg.data);
                    }

                    break;
                default:
                    return;
            }

        };

        var onConnectionAuthenticate = function (e) {
            console.debug("wvy.authentication:" + (window.name ? " " + window.name : "") + " authenticate.weavy -> updateUserState");
            updateUserState("authenticate.weavy.rtmweavy");
        };


        function destroy() {
            _isAuthenticated = null;
            _user = null;

            wvy.postal.off("message", { weavyId: "wvy.authentication", baseUrl: baseUrl }, onChildMessageReceived);
            wvy.postal.off("distribute", { weavyId: "wvy.authentication", baseUrl: baseUrl }, onParentMessageReceived);

            wvy.connection.get(baseUrl).off("authenticate.weavy.rtmweavy", onConnectionAuthenticate);

            _events.forEach(function (eventHandler) {
                var name = eventHandler[0], handler = eventHandler[1];
                $(weavyAuthentication).off(name, null, handler);
            });
            _events = [];

            initialized = false;
        }

        // Exports 
        this.init = init;
        this.isAuthorized = isAuthorized;
        this.isAuthenticated = function () { return _isAuthenticated === true; };
        this.whenAuthenticated = function () { return _whenAuthenticated.promise(); };
        this.whenAuthorized = function () { return _whenAuthorized.promise(); };
        this.on = on;
        this.off = off;
        this.signIn = signIn;
        this.signOut = signOut;
        this.setJwt = setJwt;
        this.getJwt = getJwt;
        this.clearJwt = clearJwt;
        this.updateUserState = updateUserState;
        this.user = function () { return _user };
        this.destroy = destroy;

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

    // expose wvy.authentication.default. self initiatied upon access and no other authentication is active 
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

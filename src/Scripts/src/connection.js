var wvy = wvy || {};
if (wvy.connection && wvy.connection.destroy) {
    console.log("recreating wvy.connection");
    wvy.connection.destroy();
}
wvy.connection = (function ($, w) {
    // create a new hub connection
    var connection = $.hubConnection("/signalr", { useDefaultPath: false });
    var reconnecting = false;
    var hubProxies = { rtm: connection.createHubProxy('rtm'), client: connection.createHubProxy('client'), messenger: connection.createHubProxy('messenger') };
    var wins = [w]; // all windows when in embedded mode
    var _events = [];
    var _reconnectTimeout = null;
    var _connectionTimeout = null;
    var reconnectRetries = 0;
    var explicitlyDisconnected = false;
    var authenticated = null;
    var whenConnectionStart;

    //----------------------------------------------------------
    // Init the connection
    // url: the url to the /signalr 
    // windows: initial [] of windows to post incoming events to when embedded
    // force: if to connect event if the user is not logged in
    //----------------------------------------------------------
    var init = function (url, windows, force) {


        if (url) {
            // Add trailing slash
            url += /\/$/.test(url) ? "" : "/";

            connection.url = url + "signalr";
        }

        // init windows collection
        wins = windows || wins;

        if (authenticated === null) {
            authenticated = (wvy.context && wvy.context.user > 0) ? true : false;
        }

        if ((wvy.context && wvy.context.user > 0) || force) {
            // connect to the server                
            return connect();
        } else {
            // disconnect
            return disconnect();
        }
    }

    // start the connection
    function connect() {
        explicitlyDisconnected = false;

        if (authenticated === null || wvy.context) {
            authenticated = (wvy.context && wvy.context.user > 0) ? true : false;
        }

        if (connection.state === $.signalR.connectionState.disconnected) {
            return whenConnectionStart = connection.start();
        } else {
            return whenConnectionStart;
        }
    }

    // stop connection
    function disconnect(async, notify) {
        if (connection.state !== $.signalR.connectionState.disconnected && explicitlyDisconnected === false) {
            explicitlyDisconnected = true;

            try {
                connection.stop(async === true, notify !== false).then(function () {
                    return Promise.resolve();
                }).catch(function () {
                    return Promise.resolve();
                })
            } catch (e) {
                return Promise.resolve();
            }
        } else {
            return Promise.resolve();
        }
    }

    function disconnectAndConnect() {
        return new Promise(function (resolve) {
            explicitlyDisconnected = false;
            disconnect(true, false).then(function () {
                connect().then(resolve);
            })
        })
    }

    function status() {
        return connection.state;
    }

    function on(event, handler) {
        event = event + ".connection.weavy";
        _events.push([event, handler]);
        $(document).on(event, null, null, handler);
    }

    // configure logging and connection lifetime events
    connection.logging = false;

    connection.stateChanged(function (state) {

        if (state.newState === $.signalR.connectionState.connected) {
            console.debug("weavy connected: " + connection.id + " (" + connection.transport.name + ")");

            // clear timeouts
            window.clearTimeout(_reconnectTimeout);

            // reset retries
            reconnectRetries = 0;

            if (wvy.alert) {
                wvy.alert.close("connection-state");
            } else {
                triggerPostMessage("alert", "close", "connection-state");
            }
        }

        // trigger event
        triggerEvent("state-changed.connection.weavy", JSON.stringify({ state: state }));
    });

    connection.reconnected(function () {
        reconnecting = false;
    });

    connection.reconnecting(function () {
        reconnecting = true;
        console.info("weavy reconnecting...");

        // wait 2 seconds before showing message
        if (_reconnectTimeout != null) {
            window.clearTimeout(_reconnectTimeout);
        }

        _reconnectTimeout = setTimeout(function () {
            if (wvy.alert) {
                wvy.alert.alert("warning", "Reconnecting...", null, "connection-state");
            } else {
                triggerPostMessage("alert", "show", { type: "warning", title: "Reconnecting...", id: "connection-state" });
            }
        }, 2000);
    });

    connection.disconnected(function () {
        console.info("weavy disconnected...");

        if (!explicitlyDisconnected) {
            reconnectRetries++;
            window.clearTimeout(_connectionTimeout);

            if (reconnecting) {
                connection.start();
                reconnecting = false;
            } else {
                // connection dropped, try to connect again after 5s
                _connectionTimeout = setTimeout(function () {
                    connection.start();
                }, 5000);
            }
        }

        // trigger event
        triggerEvent("disconnected.connection.weavy", JSON.stringify({ retries: reconnectRetries, explicitlyDisconnected: explicitlyDisconnected }));

    });

    function triggerEvent(name) {
        console.debug(name);

        var event = $.Event(name);

        // trigger event (with json object instead of string), handle any number of json objects passed from hub (args)
        var argumentArray = [].slice.call(arguments, 1);
        var data = argumentArray.map(function (a) {
            if (a && !$.isArray(a) && !$.isPlainObject(a)) {
                try {
                    return JSON.parse(a);
                } catch (e) {
                    console.warn("Could not parse event data");
                }
            }
            return a;
        });

        $(document).triggerHandler(event, data);

        triggerPostMessage("cross-frame-event", name, data);

    }

    // trigger a post message on all windows (when in embedded mode)
    function triggerPostMessage(name, eventName, data) {
        $(wins).each(function (i, win) {
            // trigger on all except the current one            
            if (win !== w) {
                try {
                    win.postMessage({ name: name, eventName: eventName, data: data }, "*")
                } catch (e) {
                    console.error("could not relay realtime message", { name: name, eventName: eventName }, e);
                }

            }
        });
    }

    function reload(standalone) {
        if (standalone) {
            location.reload(true);
        } else {
            window.parent.postMessage({ name: "reload" }, "*");
        }
    }

    function updateAuthenticationState() {
        var authUrl = connection.url.substr(0, connection.url.lastIndexOf("/") + 1) + "a/users/authenticated";
        console.log("wvy.connection.updateAuthenticationState");

        $.ajax(authUrl, {
            crossDomain: true,
            method: "GET",
            xhrFields: {
                withCredentials: true
            }
        }).done(function (userIsAuthenticated) {
            if (userIsAuthenticated) {
                if (!authenticated) {
                    console.log("wvy.connection.updateAuthenticationState -> authenticated");
                    window.postMessage({ name: "signing-in" }, "*");
                    disconnectAndConnect().then(function () {
                        triggerEvent("user-change.connection.weavy", { eventName: "signed-in" });
                    });
                }
                authenticated = true;
            } else {
                if (authenticated) {
                    console.log("wvy.connection.updateAuthenticationState -> unauthorized");
                    window.postMessage({ name: "signing-out" }, "*");
                    disconnectAndConnect().then(function () {
                        triggerEvent("user-change.connection.weavy", { eventName: "signed-out" });
                    });
                    if (wvy.context && wvy.context.user > 0) {
                        wvy.context.user = -1;
                    }
                    if (wvy.alert) {
                        wvy.alert.warning("You have been signed out. Reload to sign in again.");
                    }
                }
                authenticated = false;
            }

        }).fail(function () {
            console.warn("wvy.connection.updateAuthenticationState Request fail");
            authenticated = false;
        });
    }

    // generic callback used by server to notify clients that a realtime event happened
    // NOTE: we only need to hook this up in standalone, in the weavy client we wrap realtime events in the cross-frame-event and post to the frames
    function rtmEventRecieved(name, args) {
        if (name === "request:authentication.weavy") {
            updateAuthenticationState.call(this);
        } else {
            name = name.indexOf(".rtmweavy" === -1) ? name + ".rtmweavy" : name;
            triggerEvent(name, args);
        }
    }

    if (!wvy.browser || !wvy.browser.embedded) {
        hubProxies["rtm"].on("eventReceived", rtmEventRecieved);
    }


    // callback from weavy client onload
    function weavyLoaded(args) {
        var name = "loaded.rtmweavy.weavy";
        if (!wvy.browser || !wvy.browser.standalone && !wvy.browser.embedded) {
            try {
                var options = JSON.parse(args);
                authenticated = options.userId > -1;
            } catch (e) { console.warn("wvy.connection could not parse weavy client options"); }

        }
        triggerEvent(name, args);
    }
    hubProxies["client"].on("loaded", weavyLoaded);

    // callback from weavy client conversation received
    function weavyConversationsReceived(args) {
        var name = "conversation-received.rtmweavy.weavy";
        triggerEvent(name, args);
    }
    hubProxies["client"].on("conversationReceived", weavyConversationsReceived);

    if (!wvy.browser || !wvy.browser.standalone && !wvy.browser.embedded) {
        window.addEventListener("message", function (e) {
            switch (e.data.name) {
                case "signed-out":
                    authenticated = false;
                    // falls through
                case "signed-in":
                    disconnectAndConnect().then(function () {
                        triggerEvent("user-change.connection.weavy", { eventName: e.data.name });
                    });
                    break;
                case "signing-out":
                    disconnect(true);
                    break;
            }
        });
    }

    function addWindow(win) {
        // add window to array if not already added
        if (wins.indexOf(win) === -1) {
            wins.push(win)
        }
    }

    function removeWindow(win) {
        wins = wins.filter(function (existingWindow) {
            return existingWindow !== win;
        });
    }

    function destroy() {
        disconnect();

        authenticated = null;
        reconnecting = false;
        wins = [];

        window.clearTimeout(_reconnectTimeout);
        window.clearTimeout(_connectionTimeout);

        try {
            hubProxies["rtm"].off("eventReceived", rtmEventRecieved);
        } catch (e) { }

        try {
            hubProxies["client"].off("loaded", weavyLoaded);
        } catch (e) { }

        try {
            hubProxies["client"].off("conversationReceived", weavyConversationsReceived);
        } catch (e) { }

        _events.forEach(function (eventHandler) {
            var name = eventHandler[0], handler = eventHandler[1];
            $(document).off(name, null, handler);
        });
        _events = [];

        wvy.connection = null;
        delete wvy.connection;
    }


    return {
        isAuthenticated: function () { return authenticated },
        init: init,
        connect: connect,
        destroy: destroy,
        disconnect: disconnect,
        proxies: hubProxies,
        connection: connection,
        addWindow: addWindow,
        removeWindow: removeWindow,
        reload: reload,
        state: $.signalR.connectionState,
        status: status,
        on: on
    };

})(jQuery, window);

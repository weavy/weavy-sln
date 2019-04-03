var weavy = weavy || {};
if (weavy.connection && weavy.connection.destroy) {
    console.log("recreating weavy.connection");
    weavy.connection.destroy();
}
weavy.connection = (function ($, w) {
    // create a new hub connection
    var connection = $.hubConnection("/signalr", { useDefaultPath: false });
    var reconnecting = false;
    var hubProxies = { rtm: connection.createHubProxy('rtm'), widget: connection.createHubProxy('widget'), messenger: connection.createHubProxy('messenger') };
    var wins = [w]; // all windows when in embedded mode
    var _events = [];
    var _reconnectTimeout = null;
    var _connectionTimeout = null;
    var reconnectRetries = 0;
    var explicitlyDisconnected = false;
    var authenticated = null;

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
            authenticated = (weavy.context && weavy.context.user > 0) ? true : false;
        }

        if ((weavy.context && weavy.context.user > 0) || force) {
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

        if (authenticated === null || weavy.context) {
            authenticated = (weavy.context && weavy.context.user > 0) ? true : false;
        }

        if (connection.state === $.signalR.connectionState.disconnected) {
            return connection.start();
        } else {
            return Promise.resolve();
        }
    }

    // stop connection
    function disconnect(async, notify) {
        if (connection.state !== $.signalR.connectionState.disconnected && explicitlyDisconnected == false) {
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

            if (weavy.alert) {
                weavy.alert.close("connection-state");
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
            if (weavy.alert) {
                weavy.alert.alert("warning", "Reconnecting...", null, "connection-state");
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
        var authUrl = connection.url.substr(0, connection.url.lastIndexOf("/") + 1) + "api/users/authenticated";
        console.log("weavy.connection.updateAuthenticationState");

        $.ajax(authUrl, {
            crossDomain: true,
            method: "GET",
            xhrFields: {
                withCredentials: true
            }
        }).done(function (userIsAuthenticated) {
            if (userIsAuthenticated) {
                if (!authenticated) {
                    console.log("weavy.connection.updateAuthenticationState -> authenticated");
                    window.postMessage({ name: "signing-in" }, "*");
                    disconnectAndConnect().then(function () {
                        triggerEvent("user-change.connection.weavy", { eventName: "signed-in" });
                    });
                }
                authenticated = true;
            } else {
                if (authenticated) {
                    console.log("weavy.connection.updateAuthenticationState -> unauthorized");
                    window.postMessage({ name: "signing-out" }, "*");
                    disconnectAndConnect().then(function () {
                        triggerEvent("user-change.connection.weavy", { eventName: "signed-out" });
                    });
                    if (weavy.context && weavy.context.user > 0) {
                        weavy.context.user = -1;
                    }
                    if (weavy.alert) {
                        weavy.alert.warning("You have been signed out. Reload to sign in again.");
                    }
                }
                authenticated = false;
            }

        }).fail(function () {
            console.warn("weavy.connection.updateAuthenticationState Request fail");
            authenticated = false;
        });
    }

    // generic callback used by server to notify clients that a realtime event happened
    // NOTE: we only need to hook this up in standalone, in the widget we wrap realtime events in the cross-frame-event and post to the frames
    function rtmEventRecieved(name, args) {
        if (name === "request:authentication.weavy") {
            updateAuthenticationState.call(this);
        } else {
            name = name.indexOf(".rtmweavy" === -1) ? name + ".rtmweavy" : name;
            triggerEvent(name, args);
        }
    }

    if (!weavy.browser || !weavy.browser.embedded) {
        hubProxies["rtm"].on("eventReceived", rtmEventRecieved);
    }


    // callback from widget onload
    function widgetLoaded(args) {
        var name = "loaded.rtmweavy.weavy";
        if (!weavy.browser || !weavy.browser.standalone && !weavy.browser.embedded) {
            try {
                var options = JSON.parse(args);
                authenticated = options.userId > -1;
            } catch (e) { console.warn("weavy.connection could not parse widget options"); }

        }
        triggerEvent(name, args);
    }
    hubProxies["widget"].on("loaded", widgetLoaded);

    // callback from widget conversation received
    function widgetConversationsReceived(args) {
        var name = "conversation-received.rtmweavy.weavy";
        triggerEvent(name, args);
    }
    hubProxies["widget"].on("conversationReceived", widgetConversationsReceived);

    if (!weavy.browser || !weavy.browser.standalone && !weavy.browser.embedded) {
        window.addEventListener("message", function (e) {
            switch (e.data.name) {
                case "signed-in":
                case "signed-out":
                    authenticated = false;
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
            return existingWindow != win;
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
            hubProxies["widget"].off("loaded", widgetLoaded);
        } catch (e) { }

        try {
            hubProxies["widget"].off("conversationReceived", widgetConversationsReceived);
        } catch (e) { }

        _events.forEach(function (eventHandler) {
            var name = eventHandler[0], handler = eventHandler[1];
            $(document).off(name, null, handler);
        });
        _events = [];

        weavy.connection = null;
        delete weavy.connection;
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

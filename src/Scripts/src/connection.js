var weavy = weavy || {};
weavy.connection = (function ($, w) {
    // create a new hub connection
    var connection = $.hubConnection("/signalr", { useDefaultPath: false });
    var reconnecting = false;
    var hubProxies = { rtm: connection.createHubProxy('rtm'), widget: connection.createHubProxy('widget') };
    var wins = [w]; // all windows when in embedded mode
    var _reconnectTimeout = null;
    var reconnectRetries = 0;
    var explicitlyDisconnected = false;

    //----------------------------------------------------------
    // Init the connection
    // url: the url to the /signalr 
    // windows: initial [] of windows to post incoming events to when embedded
    // force: if to connect event if the user is not logged in
    //----------------------------------------------------------
    var init = function (url, windows, force) {
        if (url) {
            connection.url = url + "/signalr";
        }

        // init windows collection
        wins = windows || wins;

        if ((weavy.context && weavy.context.user > 0) || force) {
            // connect to the server                
            return connect();
        } else {
            // disconnect
            return disconnect();
        }
    }

    // start the connection
    function connect(url) {
        explicitlyDisconnected = false;
        if (connection.state === $.signalR.connectionState.disconnected) {
            return connection.start();
        } else {
            return Promise.resolve();
        }
    }

    // stop connection
    function disconnect() {
        explicitlyDisconnected = true;
        if (connection.state !== $.signalR.connectionState.disconnected) {
            return connection.stop();
        }
    }

    function status() {
        return connection.state;
    }

    function on(event, handler, proxy) {
        $(document).on(event + ".connection.weavy", null, null, handler);
    }

    // configure logging and connection lifetime events
    connection.logging = false;

    connection.stateChanged(function (state) {

        if (state.newState === $.signalR.connectionState.connected) {
            console.debug("connected: " + connection.id + " (" + connection.transport.name + ")");

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
        triggerEvent("statechanged.connection.weavy", JSON.stringify({ state: state }));
    });

    connection.reconnected(function () {
        reconnecting = false;
    });

    connection.reconnecting(function () {
        reconnecting = true;
        console.info("reconnecting...");

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
        console.info("disconnected...");

        if (!explicitlyDisconnected) {
            reconnectRetries++;

            if (reconnecting) {
                connection.start();
                reconnecting = false;
            } else {
                // connection dropped, try to connect again after 5s
                setTimeout(function () {
                    connection.start();
                }, 5000);
            }
        }

        // trigger event
        triggerEvent("disconnected.connection.weavy", JSON.stringify({ retries: reconnectRetries }));

    });

    function triggerEvent(name) {
        console.debug("triggering: " + name);
        var event = $.Event(name);

        // trigger event (with json object instead of string), handle any number of json objects passed from hub (args)
        var argumentArray = [].slice.call(arguments, 1);
        var data = argumentArray.map(function (a) { return JSON.parse(a) });

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

    // generic callback used by server to notify clients that a realtime event happened
    // NOTE: we only need to hook this up in standalone, in the widget we wrap realtime events in the cross-frame-event and post to the frames
    if (!weavy.browser || !weavy.browser.embedded) {
        hubProxies["rtm"].on("eventReceived", function (name, args) {
            name = name + ".rtm.weavy";
            triggerEvent(name, args);
        });
    }

    // callback from widget onload
    hubProxies["widget"].on("loaded", function (args) {
        var name = "loaded.rtmwidget.weavy";
        triggerEvent(name, args);
    });

    // callback from widget conversation received
    hubProxies["widget"].on("conversationReceived", function (args) {
        var name = "conversationReceived.rtmwidget.weavy";
        triggerEvent(name, args);
    });

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

    return {
        init: init,
        connect: connect,
        disconnect: disconnect,
        proxies: hubProxies,
        connection: connection,
        addWindow: addWindow,
        removeWindow: removeWindow,
        reload: reload,
        status: status,
        on: on
    };

})(jQuery, window);

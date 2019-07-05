var wvy = wvy || {};
if (wvy.realtime && wvy.realtime.destroy) {
    console.log("recreating wvy.realtime");
    wvy.realtime.destroy();
}
wvy.realtime = (function ($) {
    var _events = [];

    // attach an event handler for the specified server event, e.g. "presence", "typing" etc (see PushService for a list of built-in events)
    function on(event, handler) {
        event = event.indexOf(".rtmweavy" === -1) ? event + ".rtmweavy" : event;
        _events.push([event, handler]);
        $(document).on(event, null, null, handler);
    }

    // invoke a method on a server hub, e.g. "SetActive" on the RealTimeHub (rtm) or "Typing" on the MessengerHub (messenger).
    function invoke(hub, method, data) {
        var args = data ? [method, data] : [method];
        if (wvy.connection.connection.state === $.signalR.connectionState.connected) {
            var proxy = wvy.connection.proxies[hub];
            proxy.invoke.apply(proxy, args).fail(function (error) {
                console.error(error);
            });
        } else if (wvy.browser && wvy.browser.embedded) {
            // if embedded then execute invoke message from host page
            window.parent.postMessage({ name: "invoke", hub: hub, args: args }, "*")
        }
    }

    // handle cross frame events from rtm
    var onCrossMessageReceived = function (e) {

        switch (e.data.name) {
            case "cross-frame-event":
                var name = e.data.eventName;
                var event = $.Event(name);

                $(document).triggerHandler(event, e.data.data);
                break;
            case "alert":
                if (e.data.eventName === "show") {
                    wvy.alert.alert(e.data.data.type, e.data.data.title, null, e.data.data.id);
                } else {
                    wvy.alert.close(e.data.data);
                }
                break;
            default:
                return;
        }
    }

    window.addEventListener("message", onCrossMessageReceived, false);

    function destroy() {
        window.removeEventListener("message", onCrossMessageReceived, false);

        _events.forEach(function (eventHandler) {
            var event = eventHandler[0], handler = eventHandler[1];
            $(document).off(event, null, handler);
        });
        _events = [];

        wvy.realtime = null;
        delete wvy.realtime;
    }

    return {
        destroy: destroy,
        on: on,
        invoke: invoke
    };

})(jQuery);

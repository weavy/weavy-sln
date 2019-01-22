var weavy = weavy || {};
if (weavy.realtime && weavy.realtime.destroy) {
    console.log("recreating weavy.realtime");
    weavy.realtime.destroy();
}
weavy.realtime = (function ($) {
    var _events = [];

    // attach an event handler for the specified server event, e.g. "presence", "typing" etc (see RealTimeHub for a list of events)
    function on(event, handler, proxy) {
        proxy = proxy || "rtm";
        var name = event + "." + proxy + ".weavy";
        _events.push([name, handler]);
        $(document).on(name, null, null, handler);
    }

    // invoke a method on the server, e.g. "SetActive", "Typing" etc. (see RealTimeHub for al list of methods)
    function invoke(hub) {
        hub = hub || "rtm";

        if (weavy.connection.connection.state === $.signalR.connectionState.connected) {
            var proxy = weavy.connection.proxies[hub];

            proxy.invoke.apply(proxy, $.makeArray(arguments).slice(1)).fail(function (error) {
                console.error(error);
            });
        } else if (weavy.browser && weavy.browser.embedded) {
            // if embedded then execute invoke message from host page
            window.parent.postMessage({ name: "invoke", hub: hub, args: $.makeArray(arguments).slice(1) }, "*")
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
                    weavy.alert.alert(e.data.data.type, e.data.data.title, null, e.data.data.id);
                } else {
                    weavy.alert.close(e.data.data);
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
            var name = eventHandler[0], handler = eventHandler[1];
            $(document).off(name, null, handler);
        });
        _events = [];

        weavy.realtime = null;
        delete weavy.realtime;
    }

    return {
        destroy: destroy,
        on: on,
        invoke: invoke
    };

})(jQuery);

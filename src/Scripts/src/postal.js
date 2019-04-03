var weavy = weavy || {};

// post messages between widget and weavy
weavy.postal = (function ($) {

    var self = this;
    var messageQueue = [];

    this.windowName = null;
    this.widgetId = null;
    this.panelId = null;
    this.weavyUrl = null;
    this.hasContext = false;

    window.addEventListener("message", function (e) {
        switch (e.data.name) {
            case "window-id":                
                self.weavyUrl = e.data.weavyUrl;
                self.windowName = e.data.windowName;
                self.panelId = e.data.panelId;
                self.widgetId = e.data.widgetId;
                self.hasContext = true;

                if (messageQueue.length) {
                    messageQueue.forEach(function (windowMessage) {
                        post(windowMessage.message, windowMessage.win);
                    });
                    messageQueue = [];
                }

                break;
        }
    });

    function getContext() {
        return {
            widgetId: self.widgetId,
            windowName: self.windowName,
            panelId: self.panelId,
            weavyUrl: self.weavyUrl,
            hasContext: self.hasContext
        }
    }

    function post(message, win, force) {
        win = (typeof (win) === "undefined" || win === null ? window.parent || window.opener : win);
        if (self.hasContext || force) {
            message.sourceWeavyUrl = self.weavyUrl;
            message.sourceWindowName = self.windowName;
            message.sourcePanelId = self.panelId;
            message.sourceWidgetId = self.widgetId;

            try {
                if (win && win !== window) {
                    win.postMessage(message, "*");
                    console.debug("Posted message", self.windowName, self.widgetId, message.name);
                }
            } catch (e) {
                console.error("Error posting message", message, e);
            }
        } else {
            messageQueue.push({ message: message, win: win });
        }

    }

    $(document).on("click", "[data-widget-event]", function (e) {
        e.preventDefault();

        var name = $(this).data("widget-name");

        post.call(self, { name: name });

        if (name === "signing-out") {
            var url = $(this).attr("href");
            // give the widget a chance to disconnect from the hub
            window.setTimeout(function () { window.location.href = url }, 500);
        }
    });

    $(document).on("submit", "[data-widget-event-notify]", function (e) {
        var name = $(this).data("widgetEventNotify");
        post.call(self, { name: name });
    });

    return {
        post: post,
        getContext: getContext
    }

})(jQuery)


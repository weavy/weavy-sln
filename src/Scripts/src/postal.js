var wvy = wvy || {};

// post messages between wvy and Weavy()
wvy.postal = (function ($) {

    var self = this;
    var messageQueue = [];

    this.windowName = null;
    this.weavyId = null;
    this.panelId = null;
    this.weavyUrl = null;
    this.hasContext = false;

    window.addEventListener("message", function (e) {
        switch (e.data.name) {
            case "window-id":                
                self.weavyUrl = e.data.weavyUrl;
                self.windowName = e.data.windowName;
                self.panelId = e.data.panelId;
                self.weavyId = e.data.weavyId;
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
            weavyId: self.weavyId,
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
            message.sourceWeavyId = self.weavyId;

            try {
                if (win && win !== window) {
                    win.postMessage(message, "*");
                    console.debug("Posted message", self.windowName, self.weavyId, message.name);
                }
            } catch (e) {
                console.error("Error posting message", message, e);
            }
        } else {
            messageQueue.push({ message: message, win: win });
        }

    }

    $(document).on("click", "[data-weavy-event]", function (e) {
        e.preventDefault();

        var name = $(this).data("weavy-name");

        post.call(self, { name: name });

        if (name === "signing-out") {
            var url = $(this).attr("href");
            // give weavy client a chance to disconnect from the hub
            window.setTimeout(function () { window.location.href = url }, 500);
        }
    });

    $(document).on("submit", "[data-weavy-event-notify]", function (e) {
        var name = $(this).data("weavyEventNotify");
        post.call(self, { name: name });
    });

    return {
        post: post,
        getContext: getContext
    }

})(jQuery)


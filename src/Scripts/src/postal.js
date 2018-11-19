var weavy = weavy || {};

// post messages between widget and weavy
weavy.postal = (function ($) {

    var self = this;
    var messageQueue = [];

    this.windowName = null;
    this.stripId = null;
    this.hasContext = false;

    window.addEventListener("message", function (e) {
        switch (e.data.name) {
            case "context-id":
                self.windowName = e.data.windowName;
                self.stripId = e.data.stripId;
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

    function post(message, win, force) {
        win = (typeof (win) === "undefined" || win === null ? window.parent || window.opener : win);
        if (self.hasContext || force) {
            message.sourceWindowName = self.windowName;
            message.sourceStripId = self.stripId;

            try {
                if (win && win !== window) {
                    win.postMessage(message, "*");
                    console.debug("Posted message", self.windowName, message.name);
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

        if (name === "signingOut") {
            var url = $(this).attr("href");
            // give the widget a chance to disconnect from the hub            
            window.setTimeout(function () { window.location.href = url }, 500);
        }
    });

    return {
        post: post
    }

})(jQuery)


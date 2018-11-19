var weavy = weavy || {};

weavy.presence = (function ($) {
    // variable for keeping track of current presence status
    var _active = true;

    // idle after 1 minute of no activity
    var _timeout = 60 * 1000;

    // ping the server periodically
    window.setInterval(ping, _timeout);

    function idle() {
        if (_active) {
            console.debug("Going idle");
            _active = false;
        }
    }

    function active() {
        if (!_active) {
            console.debug("Going active");
            _active = true;

            // tell server that connection is active
            weavy.realtime.invoke("rtm", "SetActive");
        }
    }

    function ping() {
        if (_active) {
            // ping the server to indicate that user is still active on this connection
            weavy.realtime.invoke("rtm", "SetActive");
        }
    }

    // returns a value indicating if the current user is active on this connection
    function isActive() {
        return _active;
    }

    // register callback for server presence event
    weavy.realtime.on("presence", function (event, data) {
        // update presence indicator
        if (data.status === "away") {
            if (data.user === weavy.context.user) {
                console.debug("I'm away");
            }
            $(".presence[data-active=" + data.user + "]").removeAttr("data-active").attr("data-away", data.user);
        } else {
            $(".presence[data-away=" + data.user + "]").removeAttr("data-away").attr("data-active", data.user);
        }
    });

    // track idleness
    $(document).idle({
        onIdle: function () {
            idle();
        },
        onActive: function () {
            active();
        },
        onHide: function () {
            idle();
        },
        onShow: function () {
            active();
        },
        idle: _timeout
    });

    return {
        isActive: isActive
    };
})(jQuery);

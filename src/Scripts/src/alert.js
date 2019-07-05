var wvy = wvy || {};
wvy.alert = (function ($) {

    var _enabled = true;

    // cleanup before cache (needed when clicking back in the browser)
    $(document).on("turbolinks:before-cache", function () {
        $(".alerts .alert").alert('close');
    });

    function primary(message, duration) {
        alert("primary", message, duration);
    }

    function secondary(message, duration) {
        alert("secondary", message, duration);
    }

    function success(message, duration) {
        alert("success", message, duration);
    }

    function info(message, duration) {
        alert("info", message, duration);
    }

    function warning(message, duration) {
        alert("warning", message, duration);
    }

    function danger(message, duration) {
        alert("danger", message, duration);
    }

    function light(message, duration) {
        alert("light", message, duration);
    }

    function dark(message, duration) {
        alert("dark", message, duration);
    }

    function alert(type, message, duration, id) {
        if (_enabled) {
            var $alerts = $(".alerts");
            var $alert = $('<div class="alert alert-dismissible fade" role="alert"><button type="button" class="btn btn-icon close" data-dismiss="alert" aria-label="Close"><svg class="i i-close" height="24" viewBox="0 0 24 24" width="24"><path d="m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg></button></div>');
            $alert.addClass("alert-" + type);
        
            if (typeof id !== "undefined") {
                $alert.attr("id", id);

                // remove previous alert with specified id
                $alerts.find("#" + id).remove();
            }

            $alert.append(message).appendTo($alerts).addClass("show");

            // close after specified time?
            if (Number(duration) > 0) {
                setTimeout(function () { $alert.alert("close"); }, duration);
            }
        }
    }

    // close alert with specified id
    function close(id) {
        // remove previous alert with specified id
        $(".alerts #" + id).alert('close');
    }

    window.addEventListener("beforeunload", function () {
        _enabled = false;
        $(".alerts .alert").alert('close');
    }, true);

    return {
        alert: alert,
        primary: primary,
        secondary: secondary,
        success: success,
        danger: danger,
        warning: warning,
        info: info,
        light: light,
        dark: dark,
        close: close
    };

})(jQuery);

var weavy = weavy || {};

weavy.notifications = (function ($) {
    
    // mark notification as read
    function read(id) {
        return weavy.api.read(id);
    }

    // mark notification as unread
    function unread(id) {
        return weavy.api.unread(id);
    }

    // mark all notifcations as read
    function readAll() {
        return weavy.api.readAll();
    }

    function sortTabNotifications() {
        // Place read notifications last
        var byDataIdDesc = function (a, b) {
            return b.getAttribute("data-id") - a.getAttribute("data-id");
        }

        $(".notification:not(.read)", "#tab-notifications .list-group").sort(byDataIdDesc).appendTo("#tab-notifications .list-group");
        $(".notification.read", "#tab-notifications .list-group").sort(byDataIdDesc).appendTo("#tab-notifications .list-group");
    }

    
    // toggle notification read/unread on click
    $(document).on("click", "[data-toggle='notification']", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $toggler = $(this);
        var id = $toggler.data("id");
        var $notification = $toggler.closest("a");

        if ($notification.hasClass("read")) {
            // first update ui then call api (for better perceived perf.)
            $notification.removeClass("read");
            $toggler.attr("title", "Mark as read");
            unread(id);
        } else {
            // first update ui then call api (for better perceived perf.)
            $notification.addClass("read");
            $toggler.attr("title", "Mark as unread");
            read(id);
        }
    });

    // mark all notifications as read on click
    $(document).on("click", "[data-read='notifications']", function (e) {
        // first add .read class then call api (for better perceived perf.)
        $("a.notification[data-entity='notification']").addClass("read").find("[data-toggle=notification]").attr("title", "Mark as unread");
        readAll();      

        // finally close drawer
        weavy.drawer.close();
    });
    
    // callbacks for realtime events
    weavy.realtime.on("notification", function (event, data) {
        $("#tab-notifications .empty").remove();
                
        get(data.id).then(function (html) {            
            $(html).prependTo("#tab-notifications .list-group");            
        });        
    });

    weavy.realtime.on("notificationupdated", function (event, data) {
        if (data.is_read) {
            $("a.notification[data-id='" + data.id + "']").addClass("read").find("[data-toggle=notification]").attr("title", "Mark as unread");                       
        } else {
            $("a.notification[data-id='" + data.id + "']").removeClass("read").find("[data-toggle=notification]").attr("title", "Mark as read");
        }
    });

    weavy.realtime.on("notificationreadall", function (event, data) {
        $("a.notification[data-entity='notification']").addClass("read").find("[data-toggle=notification]").attr("title", "Mark as unread");
    });

    weavy.realtime.on("badge", function (event, data) {                
        if (data.notifications > 0) {
            $(".badge[data-badge='notification']").text(data.notifications).removeClass("d-none");
        } else {
            $(".badge[data-badge='notification']").text("").addClass("d-none");
        }
    });

    // get html for notification
    function get(id) {
        return $.ajax({
            url: weavy.url.resolve("/notifications/" + id),
            method: "GET",
            contentType: "application/json"
        });
    }

    return {
        read: read,
        unread: unread,
        readAll: readAll,
        sort: sortTabNotifications
    };

})(jQuery);

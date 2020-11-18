var wvy = wvy || {};

wvy.notifications = (function ($) {
    
    // mark notification as read
    function read(id) {
        return wvy.api.read(id);
    }

    // mark notification as unread
    function unread(id) {
        return wvy.api.unread(id);
    }

    // mark all notifications as read
    function readAll() {
        return wvy.api.readAll();
    }

    // mark notifications as read in space
    function readAllForParent(parentType, parentId) {
        return wvy.api.readAllForParent(parentType, parentId);
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
            $toggler.attr("title", wvy.t("Mark as read"));
            unread(id);
        } else {
            // first update ui then call api (for better perceived perf.)
            $notification.addClass("read");
            $toggler.attr("title", wvy.t("Mark as unread"));
            read(id);
        }
    });

    // mark all notifications as read on click
    $(document).on("click", "[data-read='notifications']", function (e) {

        var parentEntity = $(this).data("parent-entity");
        var parentId = $(this).data("parent-id");

        if (typeof parentEntity !== "undefined" && typeof parentId !== "undefined") {
            // first add .read class then call api (for better perceived perf.)
            $(".notifications-list[data-parent-entity='" + parentEntity + "'][data-parent-id='" + parentId + "']").find("a.notification[data-type='notification']").addClass("read").find("[data-toggle=notification]").attr("title", "Mark as unread");
            readAllForParent(parentEntity, parentId);
        } else {
            // first add .read class then call api (for better perceived perf.)
            $("a.notification[data-type='notification']").addClass("read").find("[data-toggle=notification]").attr("title", "Mark as unread");
            readAll();
        }

        // finally close drawer
        wvy.drawer.close();
    });
    
    // callbacks for realtime events
    wvy.connection.default.on("notification-inserted.weavy", function (event, data) {

        var $notificationsLists = $(".notifications-list[data-parent-entity][data-parent-id]");

        if ($notificationsLists.length) {
            index().then(function (html) {
                $notificationsLists.closest("main").empty().append(html);
            });
        }

        $("[data-notifications] .empty").remove();

        get(data.id).then(function (html) {
            $(html).prependTo("[data-notifications] .list-group");
        });
    });

    wvy.connection.default.on("notification-updated.weavy", function (event, data) {
        if (data.isRead) {
            $("a.notification[data-id='" + data.id + "']").addClass("read").find("[data-toggle=notification]").attr("title", wvy.t("Mark as unread"));                       
        } else {
            $("a.notification[data-id='" + data.id + "']").removeClass("read").find("[data-toggle=notification]").attr("title", wvy.t("Mark as read"));
        }
    });

    wvy.connection.default.on("notifications-read.weavy", function (event, data) {
        $("a.notification[data-entity='notification']").addClass("read").find("[data-toggle=notification]").attr("title", wvy.t("Mark as unread"));
    });

    wvy.connection.default.on("notifications-space-read.weavy", function (event, data) {
        $(".notifications-list[data-spaceid='" + data.spaceId + "']").find("a.notification[data-entity='notification']").addClass("read").find("[data-toggle=notification]").attr("title", wvy.t("Mark as unread"));
    });
    
    // get html for notification
    function get(id) {
        return $.ajax({
            url: wvy.url.resolve("/notifications/" + id),
            method: "GET",
            contentType: "application/json"
        });
    }

    // get index view
    function index() {
        return $.ajax({
            url: document.location.href,
            method: "GET",
            contentType: "application/json"
        });
    }

    return {
        read: read,
        unread: unread,
        readAll: readAll,
        readAllForParent: readAllForParent,
        sort: sortTabNotifications
    };

})(jQuery);

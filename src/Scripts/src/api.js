var weavy = weavy || {};
weavy.api = (function ($) {

    // get entity
    function get(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId,
            type: "GET",
            cache: false
        });
    }

    // trash entity
    function trash(entityType, entityId, method) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/trash",
            method: method || "POST",
            contentType: "application/json"
        });
    }

    // restore entity
    function restore(entityType, entityId, method) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/restore",
            method: method || "POST",
            contentType: "application/json"
        });
    }

    // like entity
    function like(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/like",
            method: "POST",
            contentType: "application/json"
        });
    }

    // unlike entity
    function unlike(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/like",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // star entity
    function star(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/star",
            method: "POST",
            contentType: "application/json"
        });
    }

    // unstar entity
    function unstar(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/star",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // follow entity
    function follow(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/follow",
            method: "POST",
            contentType: "application/json"
        });
    }

    // unfollow entity
    function unfollow(entityType, entityId) {
        return $.ajax({
            url: weavy.url.api(entityType) + entityId + "/follow",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // join space
    function join(spaceId) {
        return $.ajax({
            url: weavy.url.api("space") + spaceId + "/members",
            method: "POST",
            contentType: "application/json"
        });
    }

    // leave space
    function leave(spaceId) {
        return $.ajax({
            url: weavy.url.api("space") + spaceId + "/members",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // get badges for the current user
    function badges() {        
        return $.ajax({
            url: weavy.url.api("notification") + "badges",
            method: "GET",
            contentType: "application/json"
        });
    }

    // marks notification as read
    function read(notificationId) {
        return $.ajax({
            url: weavy.url.api("notification") + notificationId + "/read",
            method: "POST",
            contentType: "application/json"
        });
    }

    // marks all notifications as read
    function readAll() {
        return $.ajax({
            url: weavy.url.api("notification") + "read",
            method: "POST",
            ContentType: "application/json"
        });
    }

    // marks notification as unread
    function unread(notificationId) {
        return $.ajax({
            url: weavy.url.api("notification") + notificationId + "/read",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // pin a post
    function pin(postId) {
        return $.ajax({
            url: weavy.url.api("post") + postId + "/pin",
            method: "POST",
            ContentType: "application/json"
        });
    }

    // unpin a post
    function unpin(postId) {
        return $.ajax({
            url: weavy.url.api("post") + postId + "/pin",
            method: "DELETE",
            ContentType: "application/json"
        });
    }

    return {
        get: get,
        like: like,
        unlike: unlike,
        follow: follow,
        unfollow: unfollow,
        star: star,
        unstar: unstar,
        join: join,
        leave: leave,
        read: read,
        trash: trash,
        restore: restore,
        unread: unread,
        readAll: readAll,
        pin: pin,
        unpin: unpin,
        badges: badges
    };
})(jQuery);

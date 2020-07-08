var wvy = wvy || {};
wvy.api = (function ($) {

    // get entity
    function get(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId,
            type: "GET",
            cache: false
        });
    }

    // trash entity
    function trash(entityType, entityId, method) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/trash",
            method: method || "POST",
            contentType: "application/json"
        });
    }

    // restore entity
    function restore(entityType, entityId, method) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/restore",
            method: method || "POST",
            contentType: "application/json"
        });
    }

    // delete entity
    function deleteEntity(entityType, entityId, method) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId,
            method: method || "DELETE",
            contentType: "application/json"
        });
    }

    // like entity
    function like(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/like",
            method: "POST",
            contentType: "application/json"
        });
    }

    // unlike entity
    function unlike(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/like",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // star entity
    function star(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/star",
            method: "POST",
            contentType: "application/json"
        });
    }

    // unstar entity
    function unstar(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/star",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // follow entity
    function follow(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/follow",
            method: "POST",
            contentType: "application/json"
        });
    }

    // unfollow entity
    function unfollow(entityType, entityId) {
        return $.ajax({
            url: wvy.url.api(entityType) + entityId + "/follow",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // get badges for the current user
    function badges() {        
        return $.ajax({
            url: wvy.url.api("notification") + "badges",
            method: "GET",
            contentType: "application/json"
        });
    }

    // marks notification as read
    function read(notificationId) {
        return $.ajax({
            url: wvy.url.api("notification") + notificationId + "/read",
            method: "POST",
            contentType: "application/json"
        });
    }

    // marks all notifications as read
    function readAll() {
        return $.ajax({
            url: wvy.url.api("notification") + "read",
            method: "POST",
            ContentType: "application/json"
        });
    }

    // marks all notifications refering to the parent as read
    function readAllForParent(parentType, parentId) {
        return $.ajax({
            url: wvy.url.api("notification") + parentType + "/" + parentId + "/read",
            method: "POST",
            ContentType: "application/json"
        });       
    }

    // marks notification as unread
    function unread(notificationId) {
        return $.ajax({
            url: wvy.url.api("notification") + notificationId + "/read",
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // pin a post
    function pin(postId) {
        return $.ajax({
            url: wvy.url.api("post") + postId + "/pin",
            method: "POST",
            ContentType: "application/json"
        });
    }

    // unpin a post
    function unpin(postId) {
        return $.ajax({
            url: wvy.url.api("post") + postId + "/pin",
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
        read: read,
        trash: trash,
        restore: restore,
        delete: deleteEntity,
        unread: unread,
        readAll: readAll,
        readAllForParent: readAllForParent,
        pin: pin,
        unpin: unpin,
        badges: badges
    };
})(jQuery);

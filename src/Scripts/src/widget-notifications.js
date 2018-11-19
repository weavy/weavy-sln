(function ($) {
    var _height = null;
    var _timer = null;
    var _timespan = 7000;
    var _notificationId = null;
    var _observer = null;

    // open
    $(document).one("click", "body", function (e) {
        e.preventDefault();
        clearTimeout(_timer);
        $(".media-body p").toggleClass("d-none");
        $(".feedback").removeClass("d-none");
        reportHeight();
    });

    // close
    $(document).on("click", "button.close", function (e) {
        e.stopPropagation();
        e.preventDefault();
        weavy.api.read(_notificationId);
        close();
    });

    // open notification in a bubble
    $(document).on("click", "a[data-entity=notification]", function (e) {
        e.preventDefault();
        var spaceid = $(this).data("spaceid");

        if (spaceid) {
            weavy.bubbles.open(spaceid, $(this).attr("href"));
        }
    });

    // like
    $(document).on("click", "[data-entity-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("entity-like");
        var type = $el.data("type");

        $el.siblings(".d-none").removeClass("d-none");
        $el.addClass("d-none");

        // REVIEW: show spinner during ajax call?
        weavy.api.read(_notificationId).then(function () {
            weavy.api.like(type, id).then(function () {
                close();
            });
        });
    });

    // unlike
    $(document).on("click", "[data-entity-unlike]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("entity-unlike");
        var type = $el.data("type");

        $el.siblings(".d-none").removeClass("d-none");
        $el.addClass("d-none");

        // REVIEW: show spinner during ajax call?
        weavy.api.read(_notificationId).then(function () {
            weavy.api.unlike(type, id).then(function () {
                close();
            });
        });
    });

    // init 
    $(function() {

        _notificationId = $(".card-notification").data("notification-id");

        $("[data-editor-location='notification']").weavyEditor({
            placeholder: "Reply...",
            collapsed: true,
            embeds: false,
            inline: false,
            fileupload: false,
            polls: false,
            onSubmit: function (e, d) {
                e.preventDefault();
                insertComment(e, d, this);
            }
        });
        
        _height = $("html").height() || $("main").outerHeight();

        window.top.postMessage({ "name": "notificationLoaded", "id": _notificationId, "height": _height }, "*");

        window.requestAnimationFrame(reportHeight);

        // create an observer
        var comments = document.querySelector(".card-comments");

        if (comments) {
            try {
                observer = new MutationObserver(reportHeight);
                observer.observe(comments, { attributes: true, childList: true, characterData: false, subtree: true });
            } catch (e) { }
        }
        _timer = close(_timespan);
    });

    function reportHeight() {
        var tempHeight = Math.max($("main").outerHeight(), $(".card-comments").outerHeight() + 276 + 16); // Respect the overflowing height of the emoji-picker (276) 

        if (tempHeight !== _height) {
            _height = tempHeight;
            window.top.postMessage({ "name": "notificationLayoutChanged", "id": _notificationId, "height": _height }, "*");
        }
    }

    // insert comment
    var insertComment = function (e, data, editor) {
        e.preventDefault();
        var $editor = $(editor);

        var $form = $editor.closest("form");
        var $button = $form.find("button[type='submit']");
        var data = $form.serializeObject();
        var method = "POST";
        var url = weavy.url.resolve($form.attr("action"));

        // disable submit button
        $button.prop("disabled", true);

        // make sure attachments is an array
        if (data.attachments) {
            if (!$.isArray(data.attachments)) {
                var id = data.attachments;
                data.attachments = [];
                data.attachments[0] = id;
            }
        }

        var type = data.type;
        data.attached_to = { type: type, id: data.id };
        delete data.type;
        delete data.id;

        // insert comment
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: method,
            url: url,
            data: JSON.stringify(data)
        }).then(function () {
            // reset form
            $editor.weavyEditor("reset");
            close();
        }).always(function () {
            $button.prop("disabled", false);
        });
    };

    function close(timespan) {
        if (timespan) {
            return window.setTimeout(function () {
                window.parent.postMessage({ "name": "notificationClosed", "id": _notificationId }, "*");
            }, timespan);
        } else {
            window.parent.postMessage({ "name": "notificationClosed", "id": _notificationId }, "*");
        }
    }
})(jQuery);

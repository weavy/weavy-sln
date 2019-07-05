var wvy = wvy || {};
wvy.connect = (function ($) {

    window.addEventListener("message", function (e) {
        switch (e.data.name) {
            case "connect":
                var modal = $("#connect-modal");
                modal.attr("data-connect-id", e.data.id);
                modal.attr("data-connect-type", e.data.type);
                modal.attr("data-connect-url", e.data.url);
                $("#connect-modal").modal("toggle");
                break;
        }
    });

    var requestConnect = function (spaceId) {
        if (wvy.browser.embedded) {
            wvy.postal.post({ name: 'request:connect', spaceId: spaceId || wvy.context.space });
        }
    }

    var requestDisconnect = function (spaceId) {
        if (wvy.browser.embedded) {
            wvy.postal.post({ name: 'request:disconnect', spaceId: spaceId || wvy.context.space });
        }
    }

    var requestClose = function (spaceId) {
        if (wvy.browser.embedded) {
            wvy.postal.post({ name: 'request:close', spaceId: spaceId || wvy.context.space });
        }
    }

    // load content
    $(document).on("show.bs.modal", "#connect-modal", function (e) {

        var target = $(e.currentTarget);
        var connectId = target.attr("data-connect-id");
        var connectType = target.attr("data-connect-type")
        var connectUrl = target.attr("data-connect-url");

        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal).removeClass("d-none");
        var $spinner = $(".spinner", $div).addClass("spin");

        // fetch modal content from server
        $.ajax({
            url: wvy.url.resolve("/client/connect") + "?url=" + encodeURIComponent(connectUrl),
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);
            $("form.modal-content", $modal).attr("data-connect-id", connectId);
            $("form.modal-content", $modal).attr("data-connect-type", connectType);
            $div.addClass("d-none");
        }).always(function () {
            // stop spinner
            $spinner.removeClass("spin");
        });
    });

    $(document).on("submit", "#connect-modal form.modal-content", function (e) {
        e.preventDefault();

        var connectId = $(this).attr("data-connect-id");
        var connectType = $(this).attr("data-connect-type");
        var url = $(this).find("input[name='connect-url']:checked").val();

        // connect bubble
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: "POST",
            url: wvy.url.resolve("/a/" + connectType + "/" + connectId + "/connect"),
            data: JSON.stringify({ url: url })
        }).then(function () {
            $("#connect-modal").modal('hide');
        });
    });

    $(document).on("click", "[data-connect-space]", function (e) {
        e.preventDefault();
        requestConnect(this.dataset.connectSpace);
    });

    $(document).on("click", "[data-disconnect-space]", function (e) {
        e.preventDefault();
        requestDisconnect(this.dataset.disconnectSpace);
    });

    $(document).on("click", "[data-close-space]", function (e) {
        e.preventDefault();
        requestClose(this.dataset.closeSpace);
    });

    return { connect: requestConnect, disconnect: requestDisconnect, close: requestClose };

})(jQuery);

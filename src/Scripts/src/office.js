var weavy = weavy || {};

weavy.office = (function ($) {

    $(document).ready(function () {
        weavy.comments.initCommentEditor($("textarea.comments-form"));

        $(".space-picker").prev().text("Attach to...");
        $(".folder-picker").prev().text("In folder...");
    });

    $(document).on("click", "[data-toggle-attach]", function (e) {
        $(".office-attach, .office-newbie").toggleClass("show");
    });

    $(document).on("click", "[data-reload]", function (e) {
        window.location.reload(true);
    });

    $(document).on("click", "[data-save]", function (e) {
        e.preventDefault();
        $(this).attr("disabled", "");

        var id = $(this).data("id");
        weavy.postal.post({ name: "save", url: window.location.origin + "/office/save/" + id + "/" + weavy.guid.get() }, undefined, true);
    });

    $(document).on("submit", "[data-attach]", function (e) {
        e.preventDefault();

        // disable button
        var $btn = $(this).find(".btn-primary");
        $btn.attr("disabled", "");

        var spaceId = $(this).find("#ContentAttachModel_ParentId_space").val();
        var parentId = $(this).find("#ContentAttachModel_ParentId").val();

        var $nameCtrl = $(this).find("#DocName");
        var name = $nameCtrl.val();

        $nameCtrl.removeClass("is-invalid").closest("form").find(".invalid-feedback").remove();

        if (name.length === 0) {
            $nameCtrl.addClass("is-invalid").parent().after("<div class='invalid-feedback d-block'>Document name is required.</div>");
            $btn.removeAttr("disabled", "");
            return;
        }

        // add extension
        name = name + $(this).find("#extension").text();

        var compareName = name.toUpperCase();

        $.ajax({
            url: weavy.url.resolve("/api/content?space_id=" + spaceId + "&parent_id=" + parentId + "&depth=1"),
            method: "GET",
            cache: false
        }).done(function (response) {

            var isDuplicate = _.some(response.data, function (item) {
                return item.name.toUpperCase() === compareName;
            });

            if (isDuplicate) {
                $nameCtrl.addClass("is-invalid").parent().after("<div class='invalid-feedback d-block'>The folder already contains a file with that name. Change the name or save in a different folder.</div>");
                $btn.removeAttr("disabled", "");
            } else {
                if (parentId.length > 0) {
                    weavy.postal.post({ name: "attach", url: window.location.origin + "/office/attach/" + spaceId + "/" + parentId + "/" + weavy.guid.get(), file_name: name }, undefined, true);
                } else {
                    weavy.postal.post({ name: "attach", url: window.location.origin + "/office/attach/" + spaceId + "/" + weavy.guid.get(), file_name: name }, undefined, true);
                }                
            }
        }).fail(function () {
            $nameCtrl.addClass("is-invalid").parent().append("<div class='invalid-feedback'>An unexpected error occurred.</div>");
            $btn.removeAttr("disabled", "");
        });
    });

    weavy.realtime.on("badge", function (e, data) {
        if (data.conversations > 0) {
            $(".badge[data-badge='conversation']").text(data.conversations).removeClass("d-none");
        } else {
            $(".badge[data-badge='conversation']").text("").addClass("d-none");
        }
    });

    weavy.realtime.on("insertedspace", function (e, data) {
        if (data.permissions.includes("insert") && $("body").data("spaces-count") == "0") {
            // NOTE: reload page when a space (with create permission for the user) is created and no prior spaces exists
            window.location.href += ((window.location.href.indexOf("?") > 0 ? "&" : "?") + "created=1");
        }
    });

    window.addEventListener("message", receiveMessage, false);

    function receiveMessage(event) {
        console.debug("Got message:", event.data);
        switch (event.data.name) {
            case "saved":
                $("[data-save]").removeAttr("disabled");
                break;
        }
    }

})(jQuery);

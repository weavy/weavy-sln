var wvy = wvy || {};
wvy.attachment = (function ($) {

    // trash attachment
    $(document).on("click", "[data-trash=attachment]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).data("id");
        wvy.api.trash("attachment", id).then(function () {
            $("[data-type=attachment][data-id='" + id + "']").slideUp("fast");
            wvy.alert.alert("success", wvy.t("Attachment was trashed.") + " <button class='btn btn-link alert-link' data-restore='attachment' data-id='" + id + "'>" + wvy.t("Undo") + "</button>", 5000, "alert-attachment-" + id);
        });
    });

    // restore attachment
    $(document).on("click", "[data-restore=attachment]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).data("id");
        wvy.api.restore("attachment", id).then(function () {
            $("[data-type=attachment][data-id='" + id + "']").slideDown("fast");
            wvy.alert.alert("success", wvy.t("Attachment was restored."), 5000, "alert-attachment-" + id);
        });
    });
})(jQuery);

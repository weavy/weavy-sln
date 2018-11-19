var weavy = weavy || {};
weavy.attachment = (function ($) {

    // trash attachment
    $(document).on("click", "[data-trash=attachment]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).data("id");
        weavy.api.trash("attachment", id).then(function () {
            $("[data-type=attachment][data-id='" + id + "']").slideUp("fast");
            weavy.alert.alert("success", "Attachment was trashed. <button class='btn btn-link alert-link' data-restore='attachment' data-id='" + id + "'>Undo</button>", 5000, "alert-attachment-" + id);
        });
    });

    // restore attachment
    $(document).on("click", "[data-restore=attachment]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).data("id");
        weavy.api.restore("attachment", id).then(function () {
            $("[data-type=attachment][data-id='" + id + "']").slideDown("fast");
            weavy.alert.alert("success", "Attachment was restored.", 5000, "alert-attachment-" + id);
        });
    });
})(jQuery);

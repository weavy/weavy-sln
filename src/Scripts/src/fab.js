var weavy = weavy || {};

(function ($) {
    $(function () {
        // create word, excel, powerpoint document
        $(document).on("show.bs.modal", "#filename-dialog", function (e) {

            $("#o365-modal").modal('toggle')

            var ext = $(e.relatedTarget).data("param");
            var $that = $(this);
            $(this).find("#filename-dialog-type").text($(e.relatedTarget).data("type"));
            $(this).find("#name").val("");
            $(this).find("#ext").val(ext);
            $(this).find(".input-group-append .btn").text(ext);

            setTimeout(function () { $that.find("#name").focus() }, 1);
        });

        // create google drive document
        $(document).on("show.bs.modal", "#google-create-modal", function (e) {

            $("#google-modal").modal('hide')

            var docType = $(e.relatedTarget).data("param");
            var name = $(e.relatedTarget).data("type");
            var guid = $(e.relatedTarget).data("guid");

            var $that = $(this);
            $(this).find("button").data("type", docType);
            $(this).find("button").data("guid", guid);
            $(this).find("#doctype").text(name);
            $(this).find(".doctitle").val("");
            setTimeout(function () { $that.find(".doctitle").focus() }, 1);
        });
    });
})(jQuery);

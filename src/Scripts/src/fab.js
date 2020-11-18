var wvy = wvy || {};

(function ($) {
    $(function () {
        // create word, excel, powerpoint document
        $(document).on("show.bs.modal", "#office-modal", function (e) {
            var docType = $(e.relatedTarget).data("type");
            var ext = $(e.relatedTarget).data("param");

            var $modal = $(this);
            $modal.find(".file-type").text(docType);
            $modal.find("input[name=name]").val("");
            $modal.find("input[name=ext]").val(ext);
            $modal.find("button[type=submit]").text(ext);
            setTimeout(function () { $modal.find("input[name=name]").focus() }, 1);
        });

        // create google drive document
        $(document).on("show.bs.modal", "#google-drive-modal", function (e) {

            var docType = $(e.relatedTarget).data("param");
            var name = $(e.relatedTarget).data("type");

            var $modal = $(this);
            $modal.find(".file-type").text(name);
            $modal.find("input[name=name]").val("");
            $modal.find("button[type=submit]").attr("data-type", docType);
            setTimeout(function () { $modal.find("input[name=name]").focus() }, 1);
        });

        $(document).on("click", ".fab [data-toggle=menu]", function (e) {
            e.preventDefault();

            // hide all visible
            var $menu = $(this).closest(".dropdown-menu");
            $menu.find(".dropdown-item:visible").addClass("d-none");

            // show current category
            $menu.find("[data-menu=" + $(this).data("target") + "]").removeClass("d-none");

            // update dropdown position
            $(this).closest(".fab").find("[data-toggle=dropdown]").dropdown("update");

            return false;
        });

        $(document).on("click", "[data-menu]:not(.dropdown-item)", function (e) {
            e.preventDefault();

            // reset
            var $menu = $(this).closest(".dropdown-menu");
            $menu.find(".dropdown-item").removeClass("d-none");
            $menu.find("[data-menu]").addClass("d-none");

            // update dropdown position
            $menu.closest(".fab").find("[data-toggle=dropdown]").dropdown("update");
            return false;
        });

        $(document).on("hidden.bs.dropdown", ".fab", function (e) {
            // reset
            $(this).find(".dropdown-item").removeClass("d-none");
            $(this).find("[data-menu]").addClass("d-none");
        });

    });
})(jQuery);

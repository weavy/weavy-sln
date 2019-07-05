var wvy = wvy || {};

// See https://github.com/psfpro/bootstrap-html5sortable

(function ($) {
    // attach mouse event handler to [data-sortable]
    $(document).on("mousedown", "[data-sortable]", function (e) {
        if (!this.isSortable) {
            var options = { forcePlaceholderSize: true };

            if ($(this).data("sortable") !== "") {
                if (typeof $(this).data("sortable") === "object") {
                    options = $(this).data("sortable");
                } else {
                    try {
                        options = JSON.parse($(this).data("sortable"));
                    } catch (e) { console.warn("Could not parse sortable options", $(this).data("sortable")); }
                }
            }


            $(this).sortable(options);

            if (options.sortField) {
                $(this).on("sortupdate", function (e, sortable) {
                    $(this).find(options.sortField).each(function (index, element) {
                        element.name = element.name.replace(/\[\d*\]/, "[" + index + "]");
                    });
                });
            }

            if (options.ajaxPost) {
                $(this).on("sortupdate", function (e, sortable) {
                    var $inputs = $(this).find(options.sortField || "input");

                    if ($inputs.length) {
                        $.ajax({
                            type: "POST",
                            url: options.ajaxPost,
                            data: $inputs.serialize(),
                            success: function (data) {
                                console.debug("sorted");
                            }
                        });
                    }
                });
            }

            this.isSortable = true;
        }
    });

})(jQuery);

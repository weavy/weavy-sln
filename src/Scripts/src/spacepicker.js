var weavy = weavy || {};

weavy.spacepicker = (function ($) {
    function formatSpace(space) {
        if (space.loading) return space.text;
        return "<img class='avatar-32' src='" + weavy.url.thumb(space.thumb_url, "32x32-crop,both") + "'/> " + space.title;
    }

    function formatSpaceSelection(space) {
        return space.title;
    }

    // init picker
    document.addEventListener("turbolinks:load", function () {
        $("select[data-role=space]").each(function () {
            $(this).select2({
                ajax: {
                    url: weavy.url.resolve("api/spaces/search"),
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            q: params.term,
                            top: 10,
                            skip: (params.page - 1) * 10,
                            count: true,
                            order_by: 'name'
                        };
                    },
                    processResults: function (data, params) {
                        return {
                            results: data.data,
                            pagination: {
                                more: data.next ? true : false
                            }
                        };
                    },
                    cache: false
                },
                dropdownParent: $(this).data("parent") ? $($(this).data("parent")) : $(document.body),
                placeholder: $(this).data("placeholder"),
                escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
                minimumInputLength: 0,
                templateResult: formatSpace,
                templateSelection: formatSpaceSelection,
                selectOnClose: true
            });
        });
    });

    // destroy picker
    document.addEventListener("turbolinks:before-cache", function () {
        $('select[data-role=space]').select2('destroy');
    });
})(jQuery);

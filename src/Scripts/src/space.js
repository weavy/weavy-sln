var wvy = wvy || {};

// REVIEW: refactor and generalize search+select modals since it is not necessarily specific for adding members to spaces
wvy.space = (function ($) {

    // ajax request for live search
    var _searchxhr = null;

    // timer for displaying search spinner with a small delay
    var _searchtimer = null;

    // load content for members-modal
    $(document).on("show.bs.modal", "#members-modal", function (e) {
        var $modal = $(this);

        // disable submit button (until at least one person has been selected)
        $(".btn[data-action=submit]", $modal).prop("disabled", true);

        var $form = $modal.find(".search-form");
        $($form.data("target")).empty();
        $form[0].reset();
        $form.submit();
    });

    // search form
    $(document).on("submit", ".modal-body .search-form", function (e) {
        e.preventDefault();

        var $form = $(this);
        var $inputs = $("input", $form);
        var $q = $("input[name=q]", $form);

        // special case for sending selected ids in people-search
        var $target = $($form.data("target"));
        if ($target.length) {
            var $selected = $("[type=checkbox]", $target);
            $inputs = $inputs.add($selected);
        }

        // perform search 
        _searchxhr = $.ajax({
            method: "GET",
            url: $form.attr("action") + "?" + $inputs.serialize(),
            beforeSend: function (xhr) {
                // add .searching class to show spinner (after a small delay)
                if (!_searchtimer) {
                    _searchtimer = setTimeout(function () { $form.addClass("searching").removeClass("reset"); }, 150);
                }

                if (_searchxhr && _searchxhr.readyState < 4) {
                    // abort previous search to prevent ui updates that will be overwritten by this search anyway
                    _searchxhr.abort();
                }
            }
        }).done(function (html) {
            // stop timer that displays spinner
            clearTimeout(_searchtimer);
            _searchtimer = 0;

            $form.removeClass("searching");
            if ($q.val().length > 0) {
                $form.addClass("reset");
            } else {
                $form.removeClass("reset");
            }

            $($form.data("target")).html(html);

        }).fail(function (xhr, status, error) {
            if (error !== 'abort') {
                console.error(error);
            }
        });
    });

    // live search on typing (debounce to avoid immediately sending every keypress to the server)
    $(document).on("input", ".search-form input[name=q]", _.debounce(function (e) {
        e.preventDefault();
        $(this).closest("form").submit();
    }, 150));

    // click on reset search button
    $(document).on("click", ".search-form .btn-reset", function (e) {
        $(this).siblings("input[name=q]").val("").closest(".search-form").submit();
    });

    // ESC in search field
    $(document).on("keydown", ".search-form input[name=q]", function (e) {
        if (e.which === 27) {
            $(this).val("").closest(".search-form").submit();
        }
    });

    // toggle checkbox
    $(document).on("click", "tr.table-checkbox", function (e) {
        var $checkbox = $(".btn-checkbox [type=checkbox]", $(this));
        if ($checkbox.prop("checked")) {
            $checkbox.prop("checked", false);
        } else {
            $checkbox.prop("checked", true);
        }

        // enable/disable submit button
        var target = $checkbox.closest("form").prop("id");
        var $button = $("[data-action=submit][data-form='#" + target + "']")
        if ($checkbox.closest("form").find(":checked").length) {
            $button.prop("disabled", false);
        } else {
            $button.prop("disabled", true);
        }
    });

    // submit form
    $(document).on("click", "[data-action=submit]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this.dataset.form).submit();
    });

})(jQuery);


var wvy = wvy || {};

wvy.share = (function ($) {
    
    // show share modal
    $(document).on("show.bs.modal", "#share-modal", function (e) {
        // first reset form
        var $modal = $(this);
        $modal.find("form")[0].reset();

        //  then populate with new data
        var $target = $(e.relatedTarget); // link or button that triggered the event
        $modal.find(".modal-title").text($target.data("share-title"));
        $modal.find("input[name=EntityType]").val($target.data("share-type"));
        $modal.find("input[name=EntityId]").val($target.data("share-id"));
        var $textarea = $modal.find("textarea[name=Text]");
        var $submit = $modal.find("button[type=submit]");
        
        var $editor = $("[data-editor=share]").weavyEditor({
            collapsed: true,
            pickerCss: 'collapsed-static',
            placeholder: $textarea.attr("placeholder"),
            emojis: false,
            embeds: false,
            polls: false,
            meetings: false,
            fileupload: false,
            submitButton: $submit,
            onSubmit: function (e, d) {
                e.preventDefault();
                $textarea.val(d.text);
                $(this).closest("form").submit();     
            }
        });

        // reset editor
        $editor.weavyEditor('reset');
    });

    // hide share modal
    $(document).on("hide.bs.modal", "#share-modal", function (e) {
        $(".weavy-editor").next("textarea[data-editor-location=share]").weavyEditor("destroy");        
    });

    // submit share
    $(document).on("submit", "#share-form", function (e) {
        e.preventDefault();

        // post share
        var $form = $(this);
        var $modal = $form.closest(".modal");
        var $editor = $form.find(".weavy-editor");

        $.ajax({
            method: $form.attr("method"),
            url: wvy.url.resolve($form.attr("action")),
            data: $form.serialize()
        }).done(function () {           
            // hide modal
            $modal.modal("hide");
        }).fail(function (xhr) {
            
            $editor.addClass("is-invalid");

            var json = JSON.parse(xhr.responseText);
            $form.find(".invalid-feedback").text(json.message);
        }).always(function () {
            // enable button 
            $form.find(".btn-load").removeAttr("disabled");
        });
    });


})(jQuery);

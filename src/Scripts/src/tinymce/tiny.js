/*global tinymce, editorType */
var wvy = wvy || {};

wvy.tiny = (function ($) {

    document.addEventListener("turbolinks:load", init);
    document.addEventListener("turbolinks:before-cache", destroy);

    // init tinymce
    function init() {

        if ($('.html-editor').length) {
            console.debug("tiny.js:init");

            setTimeout(function () {
                tinymce.init({
                    selector: '.html-editor',
                    skin_url: window.tinymceSkinURL,
                    content_css: window.tinymceContentURL,
                    body_class: 'weavy_tiny_body',
                    convert_urls: false,
                    contextmenu: false,
                    statusbar: false,
                    entity_encoding: "raw",
                    paste_data_images: true,
                    upload_paste_data_images: true,
                    placeholder: "",
                    plugins: 'weavy_paste weavy_link weavy_sourcecode codesample table link media weavy_autocomplete weavy_image lists weavy_shortcuts',  
                    paste_retain_style_properties: "color font-size background background-color",
                    resize: true,
                    menubar: false,
                    branding: false,
                    elementpath: false,
                    extended_valid_elements: 'em,i[class|title]',
                    paste_preprocess: function (plugin, args) {
                        var isTable = false;
                        try {
                            isTable = $(args.content).is("table");
                        } catch (err) { }

                        if (isTable) {
                            args.content += '<br/>';
                        }
                    },
                    toolbar: 'undo redo | bold italic underline strikethrough | weavy_link weavy_image media codesample | formatselect blockformats fontformats fontsizes align | bullist numlist | forecolor backcolor | removeformat | inserttable | cell row column | table tableprops deletetable | code',            
                    setup: function (editor) {
                        try {
                            document.dispatchEvent(new CustomEvent("tinymce.setup", { detail: editor }));
                        } catch (e) {
                            // Deprecated, used in IE
                            var setupEvent = document.createEvent("CustomEvent");
                            setupEvent.initCustomEvent("tinymce.setup", true, true, editor);
                            document.dispatchEvent(setupEvent);
                        }

                        editor.on('change', function () {                    
                            editor.save();
                        });

                    }

            }, 1)
            });
        }

    }

    // destroy tinymce
    function destroy() {        
        if (tinymce) {
            tinymce.remove();            
        }
    }

    return {
        init: init,
        destroy: destroy
    }

})(jQuery)



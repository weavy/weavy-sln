/*global tinymce */
var wvy = wvy || {};

tinymce.PluginManager.add("weavy_image", function (editor, url) {

    editor.addMenuItem("weavy_image", {
        icon: "image",
        text: "Insert/edit image",
        context: "insert",
        cmd: "weavy_image"
    });

    editor.addButton("weavy_image", {
        tooltip: "Insert/edit image",
        icon: "image",
        cmd: "weavy_image",
        stateSelector: 'img:not([data-mce-object],[data-mce-placeholder]),figure.image'
    });

    editor.addMenuItem("weavy_file", {
        icon: "attachment",
        text: "Insert/edit file",
        context: "insert",
        cmd: "weavy_file"
    });

    editor.addButton("weavy_file", {
        tooltip: "Insert/edit file",
        icon: "attachment",
        cmd: "weavy_file"
    });

    editor.addShortcut("Meta+shift+a", "Insert image", function () {
        editor.execCommand("weavy_image");
    });

    editor.addShortcut("Meta+shift+f", "Insert file", function () {
        editor.execCommand("weavy_file");
    });

    editor.addCommand("weavy_image", function () { weavyInsertFile(true) });
    editor.addCommand("weavy_file", function () { weavyInsertFile(false) });

    function weavyInsertFile(isImage) {
        var params = "";

        // get attributes if current element is an img.
        var attrs;
        var elm = editor.selection.getNode();
        if (elm != null && (elm.nodeName === "IMG" || elm.nodeName === "A")) {
            attrs = editor.dom.getAttribs(elm);
            for (var i = 0; i < attrs.length; i++) {
                if (attrs[i].nodeName.indexOf('_') !== 0) {
                    params += (params.length > 0 ? "&" : "") + encodeURIComponent(attrs[i].nodeName) + "=" + encodeURIComponent(editor.dom.getAttrib(elm, attrs[i].nodeName, ""));
                }
            }
        }

        if (wvy.context.content) {
            params += (params.length > 0 ? "&" : "") + "id=" + wvy.context.content;
        }

        // img or link?
        params += (params.length > 0 ? "&" : "") + "img=" + (isImage ? "true" : "false");

        // get blobs
        $("#blobs input[type='hidden']").each(function (i, item) {
            params += (params.length > 0 ? "&" : "") + "blobs=" + $(item).val();
        });

        editor.windowManager.open({
            title: isImage ? "Insert/edit image" : "Insert/edit file",
            file: wvy.url.resolve("ui/insertimage?" + params),
            width: 800,
            height: 600,
            resizable: true,
            maximizable: true,
            inline: 1,
            onclose: function () {
                var attachmentsRoot = $("#blobs", window.document).empty();
                $("iframe[src*='ui/insertimage']").contents().find(".result").find("input[type='hidden']").each(function (i, item) {
                    attachmentsRoot.append($("<input type='hidden' name='blobs' value='" + $(item).val() + "' />"));
                });
            }
        }, {
                insertImageOrDocument: function (props) {
                    console.log(props);

                    var elm = editor.selection.getNode();
                    var dom = editor.dom;
                    var isThumbnail = props.url !== props.file_url;

                    editor.execCommand("mceBeginUndoLevel");

                    if (/.(jpg|jpeg|gif|png)$/i.test(props.url)) {
                        var pswpSize = props.width && props.height ? props.width + "x" + props.height : '';

                        // image
                        if (elm != null && elm.nodeName === "IMG") {
                            // update existing
                            dom.setAttrib(elm, "src", props.url);
                            dom.setAttrib(elm, "alt", props.description);
                            var parentNode = elm.parentNode;
                            if (parentNode != null && parentNode.nodeName === "A" && (parentNode.hasAttribute("rel") && parentNode.getAttribute("rel") === "lightbox" || parentNode.hasAttribute("data-photoswipe"))) {
                                // update anchor
                                dom.setAttrib(parentNode, "href", props.file_url);
                                dom.setAttrib(parentNode, "data-photoswipe", "document");
                                dom.setAttrib(parentNode, "data-size", pswpSize)
                            }
                        } else {
                            // create new
                            elm = editor.dom.create('img', { src: props.url, alt: '' });
                            dom.setAttrib(elm, "src", props.url);
                            dom.setAttrib(elm, "alt", props.description);

                            var a = dom.create('a', {
                                href: props.file_url,
                                "data-photoswipe": "document",
                                "data-size": pswpSize
                            });
                            dom.add(a, elm);
                            editor.selection.setNode(a);
                        }

                    } else {
                        // link to file
                        if (elm != null && elm.nodeName === 'A') {
                            // update existing
                            dom.setAttrib(elm, "href", props.url);
                        } else {
                            // create new
                            var text = editor.selection.getContent({ format: 'text' });
                            if (text.length === 0) {
                                text = props.name;
                            }
                            elm = editor.dom.create('a', { href: props.url }, text);
                            dom.setAttrib(elm, "href", props.url);
                            editor.selection.setNode(elm);
                        }
                    }
                    editor.execCommand("mceEndUndoLevel");
                }
            });
    }
});

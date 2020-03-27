/*global tinymce */
var wvy = wvy || {};

tinymce.PluginManager.add("weavy_image", function (editor, url) {

    editor.ui.registry.addMenuItem("weavy_image", {
        icon: "image",
        text: "Insert/edit image",
        context: "insert",
        onAction: function () { weavyInsertFile(true) }
    });

    editor.ui.registry.addButton("weavy_image", {
        tooltip: "Insert/edit image",
        icon: "image",
        onAction: function () { weavyInsertFile(true) },
        stateSelector: 'img:not([data-mce-object],[data-mce-placeholder]),figure.image'
    });

    editor.ui.registry.addMenuItem("weavy_file", {
        icon: "attachment",
        text: "Insert/edit file",
        context: "insert",
        onAction: function () { weavyInsertFile(false) },
    });

    editor.ui.registry.addButton("weavy_file", {
        tooltip: "Insert/edit file",
        icon: "attachment",
        onAction: function () { weavyInsertFile(false) },
    });

    editor.addShortcut("Meta+shift+a", "Insert image", function () {
        editor.execCommand("weavy_image");
    });

    editor.addShortcut("Meta+shift+f", "Insert file", function () {
        editor.execCommand("weavy_file");
    });

    function insertImageOrDocument(props) {
        
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

        editor.windowManager.openUrl({
            title: isImage ? "Insert/edit image" : "Insert/edit file",
            url: wvy.url.resolve("ui/insertimage?" + params),
            width: 800,
            height: 600,
            onMessage: function (api, data) {                
                if (data.mceAction === 'insertImage') {
                    insertImageOrDocument(data.props);
                    api.close();
                }
            }
        });

    }
});

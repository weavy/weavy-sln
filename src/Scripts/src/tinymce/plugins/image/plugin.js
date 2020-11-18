/*global tinymce */
var wvy = wvy || {};

tinymce.PluginManager.add("weavy_image", function (editor, url) {

    editor.ui.registry.addMenuItem("weavy_image", {
        icon: "image",
        text: wvy.t("Insert/edit image"),
        context: "insert",
        onAction: function () { weavyInsertFile(true) }
    });

    editor.ui.registry.addButton("weavy_image", {
        tooltip: wvy.t("Insert/edit image"),
        icon: "image",
        onAction: function () { weavyInsertFile(true) },
        stateSelector: 'img:not([data-mce-object],[data-mce-placeholder]),figure.image'
    });

    editor.ui.registry.addMenuItem("weavy_file", {
        icon: "attachment",
        text: wvy.t("Insert/edit file"),
        context: "insert",
        onAction: function () { weavyInsertFile(false) },
    });

    editor.ui.registry.addButton("weavy_file", {
        tooltip: wvy.t("Insert/edit file"),
        icon: "attachment",
        onAction: function () { weavyInsertFile(false) },
    });

    editor.addShortcut("Meta+shift+a", wvy.t("Insert image"), function () {
        editor.execCommand("weavy_image");
    });

    editor.addShortcut("Meta+shift+f", wvy.t("Insert file"), function () {
        editor.execCommand("weavy_file");
    });

    function insertImageOrDocument(props) {
        var elm = editor.selection.getNode();
        var dom = editor.dom;
        var isWeavyFile = false;

        if (props.download && props.download.length > 0) {
            isWeavyFile = true;
        }

        editor.execCommand("mceBeginUndoLevel");

        if (elm != null && elm.nodeName === "IMG") {
            // update existing
            dom.setAttrib(elm, "src", props.url);
            dom.setAttrib(elm, "alt", props.description);

            var parentNode = elm.parentNode;

            if (parentNode != null && parentNode.nodeName === "A") {
                
                // remove photoswipe attribute
                dom.setAttrib(parentNode, "data-photoswipe", "");
                dom.setAttrib(parentNode, "data-size", "")

                // update anchor
                dom.setAttrib(parentNode, "href", isWeavyFile ? props.download : props.url);

                if (isWeavyFile) {
                    dom.setAttrib(parentNode, "target", "overlay");
                } else {
                    dom.setAttrib(parentNode, "target", "");
                }                
            }
        } else {

            // create new
            elm = editor.dom.create('img', { src: props.url, alt: '' });
            dom.setAttrib(elm, "src", props.url);
            dom.setAttrib(elm, "alt", props.description);

            var a = dom.create('a', {
                href: isWeavyFile ? props.download : props.url
            });

            if (isWeavyFile) {
                dom.setAttrib(a, "target", "overlay");
            }

            dom.add(a, elm);
            editor.selection.setNode(a);
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
            title: isImage ? wvy.t("Insert/edit image") : wvy.t("Insert/edit file"),
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

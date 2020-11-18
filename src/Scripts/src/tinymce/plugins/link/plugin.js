/*global tinymce */
var wvy = wvy || {};

tinymce.PluginManager.add("weavy_link", function (editor, url) {

    var bookmark;

    editor.ui.registry.addMenuItem("weavy_link", {
        icon: "link",
        text: wvy.t("Insert/edit link"),
        context: "insert",
        onAction: function () { weavyLink() },
    });

    editor.ui.registry.addButton("weavy_link", {
        tooltip: wvy.t("Insert/edit link"),
        icon: "link",
        onAction: function () { weavyLink() },
    });

    var insertLink = function (url, text, external) {
        editor.selection.moveToBookmark(bookmark);

        var elm = getNode();
        var dom = editor.dom;

        if (external === true && !/(^(https|http|file|ftp|mailto)\:)/.test(url)) {
            url = "http://" + url;
        }

        // update existing anchor
        if (elm != null && elm.nodeName == "A") {
            editor.focus();

            dom.setAttrib(elm, "href", url);

            if (external === true) {
                dom.setAttrib(elm, "target", "_blank");
            } else {
                dom.setAttrib(elm, "target", null);
            }

        } else {
            // create anchor
            var linkText = editor.selection.getContent({ format: 'text' });

            if (linkText.length == 0) {
                linkText = text;
            }

            if (isOnlyTextSelected(elm)) {
                editor.insertContent(dom.createHTML('a', {
                    href: url,
                    target: external === true ? "_blank" : null
                }, dom.encode(linkText)));
            } else {
                editor.execCommand('mceInsertLink', false, {
                    href: url,
                    target: external === true ? "_blank" : null
                });
            }
        }
    }

    var weavyLink = function () {
        bookmark = editor.selection.getBookmark(1, true);

        var url = "";
        var elm = getNode();
        var textSelection = editor.selection.getContent({ format: "text" });

        // NOTE: uses twitter-text.js
        // see if we have a valid url selected, if so then autolink it
        var isValidUrlSelected = twttr.txt.isValidUrl(textSelection.trim().replace(/(https|http|file|ftp|mailto):\/\//, "").replace(/\s/g, "\\"), null, false);

        if (elm != null && elm.nodeName == "A") {
            url = elm.getAttribute("href");
        } else if (isValidUrlSelected) {
            var autolink = textSelection.trim();
            
            if (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(autolink)) {
                // email address
                if (!/(^(mailto)\:)/.test(autolink)) {
                    autolink = "mailto:" + autolink;
                }

            } else if (!/(^(https|http|file|ftp|mailto)\:)/.test(autolink)) {
                // url
                autolink = "http://" + autolink;
            }

            editor.execCommand('mceInsertLink', false, {
                href: autolink
            });
            return;
        }

        var params = "";
        params = "&id=" + wvy.context.content;
        

        // get attachments
        $("#attachments input[type='hidden']").each(function (i, item) {
            params += "&att=" + $(item).val();
        });

        editor.windowManager.openUrl({
            title: wvy.t("Insert/edit link"),
            url: wvy.url.resolve("ui/insertlink?q=" + textSelection + "&url=" + encodeURIComponent(url) + params),
            width: 800,
            height: 600,
            resizable: true,
            maximizable: true,
            inline: 1,
            onMessage: function (api, data) {
                if (data.mceAction === 'insertLink') {
                    insertLink(data.url, data.text, data.external);
                    api.close();
                }
            }
        });
    };

    // returns an anchor node if selected
    function getNode() {
        var elm = editor.selection.getNode();

        if (elm != null && elm.nodeName != "A") {
            elm = editor.dom.getParent(elm, "A");
        }
        return elm;
    }

    function isOnlyTextSelected(anchorElm) {
        var html = editor.selection.getContent();

        // Partial html and not a fully selected anchor element
        if (/</.test(html) && (!/^<a [^>]+>[^<]+<\/a>$/.test(html) || html.indexOf('href=') == -1)) {
            return false;
        }

        if (anchorElm) {
            var nodes = anchorElm.childNodes, i;

            if (nodes.length === 0) {
                return false;
            }

            for (i = nodes.length - 1; i >= 0; i--) {
                if (nodes[i].nodeType != 3) {
                    return false;
                }
            }
        }
        return true;
    }
});

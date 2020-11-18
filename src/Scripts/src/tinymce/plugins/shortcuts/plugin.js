/*global tinymce, Mousetrap */
var wvy = wvy || {};

tinymce.PluginManager.add("weavy_shortcuts", function (editor, url) {

    // perform some things on init
    editor.on("init", function () {
        
        // start autosave
        wvy.autosave.registerEditor();
        
        // register "global" shortcuts
        var regex = new RegExp("ctrl", "gi");
        var shortcuts = $("[data-shortcut]");

        $.each(shortcuts, function (i, item) {
            var shortcut = [$(item).data("shortcut")];

            // add command version if shortcut contains ctrl
            if (regex.test(shortcut[0])) {
                shortcut[1] = shortcut[0].replace(regex, "Command");
            }

            Mousetrap(editor.contentWindow.document.body).bind($.map(shortcut, function (n, i) { return n.toLowerCase(); }), function (e) {
                $("[data-shortcut='" + shortcut[0] + "']")[0].click();
                return false;
            });
        });

        // close plugin window on escape
        Mousetrap(editor.contentWindow.document).bind("esc", function (e) {
            tinymce.activeEditor.windowManager.close();
        });
    });

    function showDialog() {
        var dlg = editor.windowManager.open({
            title: wvy.t("Keyboard shortcuts"),
            width: 350,
            height: 400,
            autoScroll: true,
            body: [{ type: "container", html: getHelpText(helpItems) }],
            buttons: []
        });
    }

    var helpItems = [
        { label: "Text formatting", shortcut: null },
        { label: "Bold", shortcut: "+B" },
        { label: "Italic", shortcut: "+I" },
        { label: "Underline", shortcut: "+U" },
        { label: "Strikethrough", shortcut: "+Shift+." },
        { label: "Paragraph formatting", shortcut: null },
        { label: "Apply 'Heading 1'", shortcut: "+Shift+1" },
        { label: "Apply 'Heading 2'", shortcut: "+Shift+2" },
        { label: "Apply 'Heading 3'", shortcut: "+Shift+3" },
        { label: "Apply 'Heading 4'", shortcut: "+Shift+4" },
        { label: "Apply 'Heading 5'", shortcut: "+Shift+5" },
        { label: "Apply 'Heading 6'", shortcut: "+Shift+6" },
        { label: "Toggle bulleted list", shortcut: "+Shift+7" },
        { label: "Toggle numbered list", shortcut: "+Shift+8" },
        { label: "Clear formatting", shortcut: "+Shift+Space" },
        { label: "Left align text", shortcut: "+Shift+L" },
        { label: "Center align text", shortcut: "+Shift+E" },
        { label: "Right align text", shortcut: "+Shift+R" },
        { label: "Justify text", shortcut: "+Shift+J" },
        { label: "Editing", shortcut: null },
        { label: "Insert link...", shortcut: "+Shift+K" },
        { label: "Insert image...", shortcut: "+Shift+A" },
        { label: "Insert file...", shortcut: "+Shift+F" },
        { label: "Undo", shortcut: "+Z" },
        { label: "Redo", shortcut: "+Y" }
    ];

    editor.ui.registry.addMenuItem("help", {
        icon: "help",
        text: wvy.t("Keyboard shortcuts"),
        context: 'tools',
        onAction: showDialog
    });

    editor.ui.registry.addButton("help", {
        tooltip: wvy.t("Keyboard shortcuts"),
        icon: "help",
        onAction: showDialog
    });

    // register shortcuts

    // formatting
    editor.addShortcut("Meta+Shift+190", "Strikethrough", function () {
        editor.execCommand(wvy.t("Strikethrough"));
    });

    // headings
    editor.addShortcut("Meta+Shift+1", wvy.t("Heading 1"), function () {
        editor.execCommand("formatBlock", false, "h1");
    });

    editor.addShortcut("Meta+Shift+2", wvy.t("Heading 2"), function () {
        editor.execCommand("formatBlock", false, "h2");
    });

    editor.addShortcut("Meta+Shift+3", wvy.t("Heading 3"), function () {
        editor.execCommand("formatBlock", false, "h3");
    });

    editor.addShortcut("Meta+Shift+4", wvy.t("Heading 4"), function () {
        editor.execCommand("formatBlock", false, "h4");
    });

    editor.addShortcut("Meta+Shift+5", wvy.t("Heading 5"), function () {
        editor.execCommand("formatBlock", false, "h5");
    });

    editor.addShortcut("Meta+Shift+6", wvy.t("Heading 6"), function () {
        editor.execCommand("formatBlock", false, "h6");
    });

    editor.addShortcut("Meta+Shift+9", wvy.t("Heading 9"), function () {
        editor.execCommand("formatBlock", false, "p");
    });

    // alignment
    editor.addShortcut("Meta+Shift+l", wvy.t("Align left"), function () {
        editor.execCommand("JustifyLeft");
    });

    editor.addShortcut("Meta+Shift+r", wvy.t("Align right"), function () {
        editor.execCommand("JustifyRight");
    });

    editor.addShortcut("Meta+Shift+e", wvy.t("Align center"), function () {
        editor.execCommand("JustifyCenter");
    });

    editor.addShortcut("Meta+Shift+j", wvy.t("Justify"), function () {
        editor.execCommand("JustifyFull");
    });

    // lists
    editor.addShortcut("Meta+Shift+7", wvy.t("Toggle bulleted list"), function () {
        editor.execCommand("insertunorderedlist");
    });

    editor.addShortcut("Meta+Shift+8", wvy.t("Toggle numbered list"), function () {
        editor.execCommand("insertorderedlist");
    });

    // misc
    editor.addShortcut("Meta+Shift+32", wvy.t("Remove format"), function () {
        editor.execCommand("removeformat");
    });

    function getHelpText(items) {
        var markup = "<table class='table table-condensed shortcuts'><tbody>";
        var meta = navigator.appVersion.indexOf("Mac") !== -1 ? "&#8984;" : "Ctrl";

        for (var i = 0; i < items.length; i++) {
            if (items[i].shortcut == null) {
                markup += "<tr><th colspan='2' class='" + (i === 0 ? "first" : "") + "'>" + items[i].label + "</th></tr>";
            } else {
                markup += "<tr><td>" + items[i].label + "</td><td style='text-align:right'>" + meta + items[i].shortcut + "</td></tr>";
            }
        }
        markup += "</tbody></table>";
        return markup;
    }
});

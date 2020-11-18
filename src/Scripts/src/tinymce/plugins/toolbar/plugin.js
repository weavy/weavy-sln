tinymce.PluginManager.add("weavy_toolbar", function (editor, url) {

    editor.on("init", function () {
        var toolbar1 = this.settings.toolbar1;
        if (toolbar1 && toolbar1.indexOf("toggle_toolbar") != -1) {            
            $(editor.getContainer()).addClass("last-toolbar-hidden");
            $(".fixed-toolbar").addClass("last-toolbar-hidden");
        }
    });

    editor.addButton("toggle_toolbar", {
        type: 'menubutton',
        text: wvy.t('More'),
        tooltip: wvy.t("Toggle toolbar"),
        onclick: function () {
            this.hideMenu();
            this.active(!this.active());
            if (this.active()) {
                $(editor.getContainer()).removeClass("last-toolbar-hidden");
                $(".fixed-toolbar").removeClass("last-toolbar-hidden");
            } else {
                $(editor.getContainer()).addClass("last-toolbar-hidden");
                $(".fixed-toolbar").addClass("last-toolbar-hidden");
            }
        }
    });

    editor.addButton("h1", {
        text: "H1",
        title: wvy.t("Heading 1"),
        stateSelector: "h1",
        onclick: function () {
            editor.execCommand("FormatBlock", false, "h1");
        }
    });

    editor.addButton("h2", {
        text: "H2",
        title: wvy.t("Heading 2"),
        stateSelector: "h2",
        onclick: function () {
            editor.execCommand("FormatBlock", false, "h2");
        }
    });

    editor.addButton("h3", {
        text: "H3",
        title: wvy.t("Heading 3"),
        stateSelector: "h3",
        onclick: function () {
            editor.execCommand("FormatBlock", false, "h3");
        }
    });

    editor.addButton("h4", {
        text: "H4",
        title: wvy.t("Heading 4"),
        stateSelector: "h4",
        onclick: function () {
            editor.execCommand("FormatBlock", false, "h4");
        }
    });

    editor.addButton("normal", {
        text: "P",
        title: wvy.t("Normal text"),
        onclick: function () {
            editor.execCommand("FormatBlock", false, "p");
        }
    });
});

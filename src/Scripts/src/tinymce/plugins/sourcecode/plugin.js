
tinymce.PluginManager.add('weavy_sourcecode', function (editor, url) {

    var sourceCodeMode = false;
    var codeMirror, textarea, textareaContainer;

    function disableClick() {
        return false;
    }

    function showSourceEditor() {

        //Container references
        var contentAreaContainer = editor.contentAreaContainer;
        var editorContainer = editor.editorContainer;
        var editorStatusBar = $(editorContainer).find(".mce-statusbar");
        var menuItems = $(editorContainer).find(".mce-menubtn");
        var toolbarButtons = $(editorContainer).find(".mce-toolbar .mce-btn[aria-label!='Source code']");
        var sourceCodeButton = $(editorContainer).find(".mce-toolbar .mce-btn[aria-label='Source code']");

        //If already in source mode, then submit to TinyMCE
        if (sourceCodeMode) {
            submit();
            return;
        }

        CodeMirror.defineInitHook(function (inst) {
            // Indent all code
            var last = inst.lineCount();
            inst.operation(function () {
                for (var i = 0; i < last; ++i) {
                    inst.indentLine(i);
                }
            });
        });

        textarea = $("<textarea></textarea>").text(editor.getContent());
        textareaContainer = $("<div class='codemirror-container'></div>")
        $(textareaContainer).append(textarea);
        $(editorContainer).after(textareaContainer);

        //Create code mirror from textarea
        codeMirror = CodeMirror.fromTextArea(textarea[0], {
            mode: 'htmlmixed',
            //lineNumbers: false,
            lineWrapping: true,
            indentUnit: 2,
            tabSize: 2,
            //matchBrackets: true,
            //styleActiveLine: false,
            theme: 'weavy'
        });

        //Hide TinyMCE editor
        toggleVisibility(false);

        function toggleVisibility(showTinyMCE) {

            if (showTinyMCE) {
                $(contentAreaContainer).show();
                $(editorStatusBar).show();

                $(menuItems).removeClass("mce-disabled");
                $(menuItems).off("click", disableClick)

                $(toolbarButtons).removeClass("mce-disabled");
                $(toolbarButtons).off("click", disableClick);

                $(sourceCodeButton).removeClass("mce-active");

                //Remove codemirror reference
                $(textareaContainer).remove();
            } else {
                $(contentAreaContainer).hide();
                $(editorStatusBar).hide();

                $(menuItems).addClass("mce-disabled");
                $(menuItems).on("click", disableClick);

                $(toolbarButtons).addClass("mce-disabled");
                $(toolbarButtons).on("click", disableClick);

                $(sourceCodeButton).addClass("mce-active");
            }

            sourceCodeMode = !showTinyMCE;
        }

        //Submit content to TinyMCE editor and hide source editor
        function submit() {
            var isDirty = codeMirror.isDirty;

            editor.setContent(codeMirror.getValue());
            editor.isNotDirty = !isDirty;
            if (isDirty) {
                editor.nodeChanged();
            }

            toggleVisibility(true);
        }

    };

    // Add a button to the button bar
    editor.addButton('code', {
        title: 'Source code',
        icon: 'code',
        onclick: showSourceEditor
    });

    // Add a menu item to the tools menu
    editor.addMenuItem('code', {
        icon: 'code',
        text: 'Source code',
        context: 'tools',
        onclick: showSourceEditor
    });
});

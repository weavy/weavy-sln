
tinymce.PluginManager.add('weavy_sourcecode', function (editor, url) {

    var sourceCodeMode = false;
    var isDirty = false;
    var codeMirror, textarea, textareaContainer;
    var label = wvy.t('Source code');

    function disableClick() {
        return false;
    }

    function showSourceEditor() {        

        //Container references        
        var editorContainer = editor.editorContainer;

        var menuItems = $(editorContainer).find(".mce-menubtn");
        var statusBar = $(editorContainer).find(".tox-statusbar");
        var toolbarButtons = $(editorContainer).find(".tox-toolbar__primary .tox-tbtn[aria-label!='" + label + "'][aria-label!='More...']");
        var sourceCodeButton = $(editorContainer).find(".tox-toolbar__primary .tox-tbtn[aria-label='" + label + "']");

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
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 2,
            tabMode: "indent",
            tabSize: 2,
            matchBrackets: true,
            styleActiveLine: false,
            theme: 'weavy'
        });

        codeMirror.on("change", function () {
            isDirty = true;
        });

        //Hide TinyMCE editor
        toggleVisibility(false);

        function toggleVisibility(showTinyMCE) {
            var editorHeight = 500;
            if (showTinyMCE) {
                $(editorContainer).css("height", editorHeight + "px");
                $(editorContainer).css("border-bottom", "1px solid #ccc");
                $(editorContainer).removeClass("source-code-mode");

                statusBar.show();

                $(menuItems).removeClass("tox-tbtn--disabled");
                $(menuItems).off("click", disableClick)

                $(toolbarButtons).removeClass("tox-tbtn--disabled");
                $(toolbarButtons).off("click", disableClick);

                var toolbarOverflowButtons = $(".tox-toolbar__overflow .tox-tbtn[aria-label!='" + label + "']");

                $(toolbarOverflowButtons).removeClass("tox-tbtn--disabled");
                $(toolbarOverflowButtons).off("click", disableClick);

                $(sourceCodeButton).removeClass("tox-tbtn--enabled");

                //Remove codemirror reference
                $(textareaContainer).remove();
            } else {
                editorHeight = $(editorContainer).css("height");
                $(editorContainer).css("height", "auto");
                $(editorContainer).css("border-bottom", "0");
                $(editorContainer).addClass("source-code-mode");

                codeMirror.focus();
                statusBar.hide();

                $(menuItems).addClass("tox-tbtn--disabled");
                $(menuItems).on("click", disableClick);

                $(toolbarButtons).addClass("tox-tbtn--disabled");
                $(toolbarButtons).on("click", disableClick);

                var toolbarOverflowButtons = $(".tox-toolbar__overflow .tox-tbtn[aria-label!='" + label + "']");
                $(toolbarOverflowButtons).addClass("tox-tbtn--disabled");
                $(toolbarOverflowButtons).on("click", disableClick);

                $(sourceCodeButton).removeClass("tox-tbtn--disabled").addClass("tox-tbtn--enabled");
            }

            sourceCodeMode = !showTinyMCE;
        }

        //Submit content to TinyMCE editor and hide source editor
        function submit() {
            editor.setContent(codeMirror.getValue());
            editor.fire("change");
            editor.isNotDirty = !isDirty;

            if (isDirty) {
                editor.nodeChanged();
            }
            isDirty = false; 
            toggleVisibility(true);
        }
    };

    // Add a button to the button bar
    editor.ui.registry.addButton('code', {
        tooltip: label,
        icon: 'sourcecode',
        onAction: showSourceEditor
    });

    // Add a menu item to the tools menu
    editor.ui.registry.addMenuItem('code', {
        icon: 'sourcecode',
        text: label,
        context: 'tools',
        onAction: showSourceEditor
    });
});

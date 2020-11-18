// drag and drop for uploading files
// see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
var wvy = wvy || {};
wvy.drop = (function ($) {
    
    var _root = $("html");
    var _outerCounter = 0;
    var _innerCounter = 0;    
    var _isDraggingFile = false;

    if (wvy.turbolinks.enabled) {
        // init
        document.addEventListener("turbolinks:load", init);

        // cleanup
        document.addEventListener("turbolinks:before-cache", destroy);
    } else {
        $(document).ready(init);
    }

    function init() {
        // find and hook up eventlisteners
        _root[0].addEventListener("dragenter", globalDragEnter, false);
        _root[0].addEventListener("dragleave", globalDragLeave, false);
        _root[0].addEventListener("dragover", globalDragOver, false);

        $("[data-dropzone]").get().forEach(function (item) {
            var $dropzone = $(item).closest($(item).data("dropzone"));

            if ($dropzone.length) {
                $dropzone.addClass("dropzone");
                jQuery.data($dropzone[0], "target", item);
                $dropzone[0].addEventListener("dragenter", dragEnter, false);
                $dropzone[0].addEventListener("dragover", dragOver, false);
                $dropzone[0].addEventListener("dragleave", dragLeave, false);
                $dropzone[0].addEventListener("drop", drop, false);
            }
        });
    }

    // init a single dropzone (called from editor.js)
    function initSingle($input) {
        var $dropzone = $input.closest($input.data("dropzone"));
        if ($dropzone.length) {
            $dropzone.addClass("dropzone");
            jQuery.data($dropzone[0], "target", $input);
            $dropzone[0].addEventListener("dragenter", dragEnter, false);
            $dropzone[0].addEventListener("dragover", dragOver, false);
            $dropzone[0].addEventListener("dragleave", dragLeave, false);
            $dropzone[0].addEventListener("drop", drop, false);
        }
    }

    function destroy() {
        // remove classes from html element
        _root.removeClass("dropzone").removeClass("drop-over").removeClass("dragging");

        // reset counters
        _outerCounter = 0;
        _innerCounter = 0;
        _isDraggingFile = false;

        // find and remove eventlisteners
        _root[0].removeEventListener("dragenter", globalDragEnter);
        _root[0].removeEventListener("dragleave", globalDragLeave);
        _root[0].addEventListener("dragover", globalDragOver);

        $("[data-dropzone]").get().forEach(function (item) {
            var $dropzone = $(item).closest($(item).data("dropzone"));

            if ($dropzone.length) {
                $dropzone[0].removeEventListener("dragenter", dragEnter);
                $dropzone[0].removeEventListener("dragover", dragOver);
                $dropzone[0].removeEventListener("dragleave", dragLeave);
                $dropzone[0].removeEventListener("drop", drop);
            }
        });
    }

    // verify user is dragging a file, light up dropzones and set dropeffect to none
    function globalDragEnter(e) {
        // verify user is dragging a file
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].kind === "file") {
            e.preventDefault();
            _isDraggingFile = true;
            _outerCounter++;
            e.dataTransfer.dropEffect = "none";

            if (_outerCounter === 1) {
                _root.addClass("dragging");
            }
        }
    }

    // drag leaving stage?
    function globalDragLeave(e) {
        if (_isDraggingFile) {
            _outerCounter--;

            if (_outerCounter === 0) {
                _isDraggingFile = false;
                _root.removeClass("dragging");
            }
        }
    }
    
    // toggle dropeffect if over a dropzone
    function globalDragOver(e) {
        if (_isDraggingFile) {
            e.preventDefault();
            if (_innerCounter > 0) {
                e.dataTransfer.dropEffect = "copy";
            } else {
                e.dataTransfer.dropEffect = "none";
            }
        }
    }

    // dragging over a dropzone
    function dragOver(e) {
        if (_isDraggingFile) {
            e.preventDefault();
        }
    }

    // enter a dropzone, add drop-over class if initial drag enter
    function dragEnter(e) {
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].kind === "file") {
            e.dataTransfer.dropEffect = "copy";
            _innerCounter++;
            if (_innerCounter === 1) {
                $(this).addClass("drop-over");
            }
        }
    }

    // leaving a dropzone, remove drop-over class if last drag enter
    function dragLeave(e) {
        
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].kind === "file") {
            e.preventDefault();
            _innerCounter--;
            if (_innerCounter === 0) {
                $(this).removeClass("drop-over");
            }
        }
    }

    // dropping file on dropzone -> upload
    function drop(e) {
        if (_isDraggingFile) {
            e.preventDefault();

            _outerCounter = 0;
            _innerCounter = 0;
            _isDraggingFile = false;

            var files = [];

            if (e.dataTransfer.items) {
                for (var i = 0; i < e.dataTransfer.items.length; i++) {
                    if (e.dataTransfer.items[i].kind === 'file') {
                        files.push(e.dataTransfer.items[i].getAsFile());
                    }
                }
            }

            if (files.length > 0) {
                $(this).removeClass("drop-over");
                $("html").removeClass("dragging");
                wvy.fileupload.uploadBlobs(files, $(jQuery.data($(this)[0], "target")));
            }
        }
    }

    return {
        initSingle: initSingle
    }

})(jQuery);

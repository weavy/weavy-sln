var weavy = weavy || {};
weavy.autosave = (function ($) {

    var _typing = false;
    var _started = false;
    var _timer = null;
    var _cancel = false;

    var _id = null;
    var _force = true;
    var _message = "Are you sure you want to leave this page? There are some unsaved changes.";
    var $form = null;
    var $status = null;

    // catch :before-visit
    document.addEventListener("turbolinks:before-visit", function (e) {
        var dirtyForm = $("form.autosave.dirty");

        if (dirtyForm.length) {
            e.returnValue = confirm(_message);
        }
    });

    // catch window onbeforeunload
    window.onbeforeunload = function (e) {
        e = e || window.event;

        var dirtyForm = $("form.autosave.dirty");

        if (dirtyForm.length) {
            if (e) {
                e.returnValue = _message;
            }
            // safari
            return _message;
        }
    };

    document.addEventListener("turbolinks:load", function () {
        $form = $("form.autosave");

        if ($form.length) {
            $status = $($form.data("status"));
            _id = $form.data("id");
            _force = !$form.data("is-draft");

            // clear dirty flag when submitting form via buttons
            $form.find("button[type=submit], input[type=submit]").on("click", function () {
                _cancel = true;
                $form.removeClass("dirty");
            });

            // call change on these events
            $form.find(":text").on("keydown", function () {
                change();
            });

            $form.find("textarea").on("keydown", function () {
                change();
            });

            $form.find(":input").on("change", function () {
                change();
            });

            _started = isInt(_id);
        }
    });

    // triggered from tiny when all editors are loaded
    function registerEditor() {
        for (ed in tinyMCE.editors) {
            tinyMCE.editors[ed].on("keydown", function (e) {
                change();
            });
        }
    }

    // called when content changes
    function change() {
        $form.addClass("dirty");
        if (_started) {
            _cancel = false;
            if (_typing) {
                clearTimeout(_timer);
                _timer = setTimeout(function () { save() }, 2000);
            } else {
                _typing = true;
                _timer = setTimeout(function () { save() }, 2000);
            }
        }
    }

    // serialize and persist
    function save() {
        $status.html('Saving');

        _typing = false;
        clearTimeout(_timer);

        // make sure tiny sets content before serializing
        if (window.tinyMCE !== undefined) {
            tinyMCE.triggerSave();
        }

        // serialize form
        var properties = $form.serializeObject(true);

        // make sure tags is array
        if (properties.tags !== undefined && !Array.isArray(properties.tags)) {
            properties.tags = [properties.tags];
        }

        // remove unwanted properties
        delete properties.x_http_method_override;

        var url = "/api/content/" + _id + "/draft?force=" + _force;

        if (!_cancel) {
            $.ajax({
                url: weavy.url.resolve(url),
                data: JSON.stringify(properties),
                type: "PATCH",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                success: function (data, status, xhr) {
                    _force = false; 
                    var now = new Date();
                    $status.html('Saved ' + (now.getHours() < 10 ? "0" : "") + now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes());
                },
                error: function (xhr, status, err) {
                    $status.html('');

                    // conflict - item has been taken over by someone else
                    if (xhr.status === 409) {
                        $form.removeClass("dirty");
                        document.location.href = weavy.url.resolve("~/content/" + _id + "/edit");
                    } else {
                        var json = JSON.parse(xhr.responseText);
                        weavy.alert.warning(json.message);
                    }
                },
                complete: function (xhr, status) {
                    $form.removeClass("dirty");
                }
            });
        } else {
            // autosave was cancelled 
            $status.html('');
        }
    }

    function isInt(value) {
        var x;
        if (isNaN(value)) {
            return false;
        }
        x = parseFloat(value);
        return (x | 0) === x;
    }

    // reveal public pointers to private properties and functions
    return {
        registerEditor: registerEditor
    };

    // pull in jquery
})(jQuery);

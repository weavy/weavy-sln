/*global tinyMCE **/
var wvy = wvy || {};
wvy.autosave = (function ($) {

    var _typing = false;
    var _started = false;
    var _timer = null;
    var _cancel = false;

    var _id = null;
    var _force = true;
    //var _message = wvy.t("Are you sure you want to leave this page? There are some unsaved changes.");
    var $form = null;
    var $status = null;
    var _label = null;
    var _minDuration = 400;

    // NOTE: removed onbeforeunload message if form is dirty. Does not play nice in overlays and also not embedded in iframe.

    // catch :before-visit
    //    document.addEventListener("turbolinks:before-visit", function (e) {
    //        var dirtyForm = $("form.autosave.dirty");

    //        if (dirtyForm.length) {
    //            e.returnValue = confirm(_message);
    //        }
    //    });

    // catch window onbeforeunload
    //window.onbeforeunload = function (e) {
    //    e = e || window.event;

    //    var dirtyForm = $("form.autosave.dirty");

    //    if (dirtyForm.length) {
    //        if (e) {
    //            e.returnValue = _message;
    //        }
    //        // safari
    //        return _message;
    //    }
    //};

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

            _label = $status.text();

            _started = isInt(_id);
        }
    });

    // triggered from tiny when all editors are loaded
    function registerEditor() {
        for (var ed in tinyMCE.editors) {
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
        var start = new Date();

        transition(true);

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

        var url = "/a/content/" + _id + "/draft?force=" + _force;

        if (!_cancel) {
            $.ajax({
                url: wvy.url.resolve(url),
                data: JSON.stringify(properties),
                type: "PATCH",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                success: function (data, status, xhr) {
                    if (typeof (data.is_transient) !== "undefined") {
                        if (data.is_transient) {
                            $(".draft-transient").removeClass("d-none");
                            $(".draft-not-transient").addClass("d-none");
                        } else {
                            $(".draft-not-transient").removeClass("d-none");
                            $(".draft-transient").addClass("d-none");
                        }
                    }                    
                    _force = false;
                    var now = new Date();
                    $status.attr("title", wvy.t('Saved') + ' ' + (now.getHours() < 10 ? "0" : "") + now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes());
                    $(".is-invalid").removeClass('is-invalid');
                    $(".alerts .alert").alert('close');
                },
                error: function (xhr, status, err) {
                    // conflict - item has been taken over by someone else
                    if (xhr.status === 409) {
                        $form.removeClass("dirty");
                        document.location.href = wvy.url.resolve("~/content/" + _id + "/edit");
                    } else {
                        var json = JSON.parse(xhr.responseText);
                        if (json.model_state) {
                            for (var key in json.model_state) {
                                if (json.model_state.hasOwnProperty(key)) {
                                    wvy.alert.danger(json.model_state[key], 4000);
                                }
                            }
                        } else {
                            wvy.alert.warning(json.message);
                        }
                    }
                },
                complete: function (xhr, status) {
                    var end = new Date();
                    var diff = end.getTime() - start.getTime();

                    // reset after minDuration to prevent the button from just flickering
                    if (diff > _minDuration) {
                        transition(false);
                    } else {
                        setTimeout(function () { transition(false); }, _minDuration - diff);
                    }
                    $form.removeClass("dirty");
                }
            });
        } else {
            transition(false);
        }
    }

    function transition(lock) {
        if (lock) {
            // change label and disable buttons during save
            $status.siblings(".dropdown-toggle-split").attr("disabled", true);
            $status.text(wvy.t('Saving') + "...").attr("disabled", true);
        } else {
            // restore
            $status.siblings(".dropdown-toggle-split").removeAttr("disabled");
            $status.text(_label).removeAttr("disabled");
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

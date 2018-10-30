/* =========================================================
 * Bootstrap pincode input, based on https://github.com/fkranenburg/bootstrap-pincode-input
 * ========================================================= */

; (function ($, window, document, undefined) {

    "use strict";

    // create the defaults once
    var pluginName = "pincode";
    var defaults = {
        inputs: 6, // pincode length
        change: function (input, value) {
            // callback on change (keyup event)
            //input = the input textbox DOM element
            //value = the value entered by user (or removed)
        }
    };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {
        init: function () {
            this.buildInputBoxes();
        },
        buildInputBoxes: function () {
            this._container = $('<div />').addClass('pincode-container');

            // set current value of the input box (this will only work if the current value is not longer than the number of input boxes)
            var currentValue = [];
            if ($(this.element).val() != "") {
                currentValue = $(this.element).val().split("");
            }

            // build one input for each digit
            for (var i = 0; i < this.settings.inputs; i++) {

                var input = $('<input>').attr({ 'type': 'tel', 'maxlength': "1", 'autocomplete': 'off' }).addClass('form-control form-control-lg pincode-text').appendTo(this._container);

                // set default value
                input.val(currentValue[i]);

                // add events
                this._addEventsToInput(input, (i + 1));
            }

            // hide original element and place this before it
            $(this.element).css("display", "none");
            this._container.insertBefore(this.element);
        },
        setValue: function (text) {
            // update pincode inputs
            if (text) {
                var chars = text.split("");
                $('.pincode-text', this._container).each(function (index, input) {
                    $(input).val(chars[index]);
                });
            } else {
                $('.pincode-text', this._container).each(function (index, input) {
                    $(input).val("");
                });
            }
            // also set value of original element
            this.updateOriginalInput(text);
        },
        updateOriginalInput: function (text) {
            $(this.element).val(text);
        },
        getValue: function () {
            var value = "";
            $('.pincode-text', this._container).each(function (index, input) {
                value += $(input).val().toString();
            });
            return value;
        },
        enable: function () {
            $('.pincode-text', this._container).each(function (index, input) {
                $(input).prop('disabled', false);
            });
        },
        disable: function () {
            $('.pincode-text', this._container).each(function (index, input) {
                $(input).prop('disabled', true);
            });
        },
        focus: function () {
            $('.pincode-text', this._container).first().select().focus();
        },
        clear: function () {
            this.setValue("");
        },
        destroy: function () {
            $(this.element).css("display", "");
            this._container.remove();
        },
        _addEventsToInput: function (input, inputnumber) {

            input.on('focus', function (e) {
                // automatically select current value on focus
                this.select();
            });

            input.on('keydown', $.proxy(function (e) {
                var $input = $(e.currentTarget);
                if (e.keyCode == 8) {
                    // backspace 
                    e.stopPropagation();
                    e.preventDefault();
                    $input.val("").prev().focus();
                } else if (e.keyCode == 13) {
                    // enter should submit form 
                } else if (e.keyCode == 32) {
                    // space
                    e.stopPropagation();
                    e.preventDefault();
                    $input.val("").next().focus();
                } else if (e.keyCode == 37) {
                    // left arrow
                    e.stopPropagation();
                    e.preventDefault();
                    $input.prev().focus();
                } else if (e.keyCode == 39) {
                    // right arrow
                    e.stopPropagation();
                    e.preventDefault();
                    $input.next().focus();
                } else if (e.keyCode == 46) {
                    // delete
                    e.stopPropagation();
                    e.preventDefault();
                    $input.val("");
                    //  shift chars to the left
                    var $curr = $input;
                    var $next = $input.next();
                    while ($next.length) {
                        $curr.val($next.val());
                        $curr = $next;
                        $next = $curr.next();
                    }
                    $('.pincode-text', this._container).last().val("");

                } else if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)) {
                    // digit
                    e.stopPropagation();
                    e.preventDefault();

                    var keyCode = e.keyCode;
                    if (keyCode >= 96) {
                        // subtract 48 to get correct code when using numpad
                        keyCode -= 48;
                    }
                    $input.val(String.fromCharCode(keyCode)).next().focus();
                } else if (!(e.keyCode == 9 ||		   // tab key
                    (e.ctrlKey && e.keyCode == 67) ||  // ctrl+c
                    (e.ctrlKey && e.keyCode == 86) ||  // ctrl+v
                    (e.ctrlKey && e.keyCode == 88))) { // ctrl+x
                    // prevent input
                    e.stopPropagation();
                    e.preventDefault();
                }
            }, this));

            input.on('keyup', $.proxy(function (e) {
                if (e.keyCode != 13 && e.keyCode != 37 && e.keyCode != 39) {

                    // update original input box
                    var text = this.getValue();
                    this.updateOriginalInput(text);

                    // trigger the change event
                    if (this.settings.change) {
                        this.settings.change(e.currentTarget, text);
                    }
                }

            }, this));

            input.on('paste', $.proxy(function (e) {
                e.stopPropagation();
                e.preventDefault();

                // get pasted data via clipboard API
                var text = e.originalEvent.clipboardData.getData("text");
                if (text) {
                    if (text.length === 1) {
                        var $input = $(e.currentTarget).val(text);
                    } else {
                        this.setValue(text)
                    }
                }

            }, this));
        }
    });

    // A really lightweight plugin wrapper around the constructor, preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);

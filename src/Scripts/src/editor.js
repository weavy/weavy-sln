var weavy = weavy || {};

weavy.editor = (function ($) {

    var pluginName = 'weavyEditor';


    /**
     * WeavyEditor object constructor.
     * Implements the Revealing Module Pattern.
     */
    function WeavyEditor(element, options) {

        // References to DOM and jQuery versions of element.
        var el = element;
        var $el = $(element);
        var _emojiarea, $wrapper;
        var embedAdded = false;
        var removedEmbeds = [];

        // Extend default options with those supplied by user.
        options = $.extend({}, $.fn[pluginName].defaults, options);

        /**
         * Initialize plugin.
         */
        function init() {
            // Add any initialization logic here...
            emojione.imagePathSVG = weavy.url.resolve("/img/eo/");
            emojione.imageType = "svg";
            $.fn.emojioneArea.defaults.useInternalCDN = false;
            $.fn.emojioneArea.defaults.imageType = "svg";

            $wrapper = $("<div class='weavy-editor'/>");
            $wrapper.insertBefore($el);
            $wrapper.on("click", function (e) {
                toggleMore(false);
                hook("onClick", e, $wrapper);
            });

            // Force hide emojis if mobile
            if (weavy.browser.mobile) {
                options.emojis = false;
            }

            var $textarea = $el.emojioneArea({
                attributes: {
                    dir: "ltr",
                    spellcheck: true,
                    autocomplete: "on",
                    autocorrect: "on",
                    autocapitalize: "on",
                    tabindex: "1"
                },
                container: $wrapper,
                tonesStyle: "bullet",
                hidePickerOnBlur: true,
                saveEmojisAs: 'shortname',
                buttonTitle: "Insert emoji",
                inline: options.inline,
                placeholder: options.placeholder,
                pickerPosition: options.mode === 'default' ? (options.inline ? "bottom" : "top") : options.mode,
                shortcuts: false,
                textcomplete: {
                    maxCount: 5,
                    placement: null
                },
                events: {
                    "picker.show": function (picker, evt) {
                        toggleMore(false);
                        picker.show();
                    },
                    "picker.hide": function (picker, evt) {
                        picker.hide();
                    }
                }
            });

            if ($textarea[0] !== null) {
                $textarea.removeAttr("disabled");

                _emojiarea = $textarea[0].emojioneArea;

                // collapsed mode
                if (options.collapsed) {
                    $wrapper.addClass("collapsed");
                } else if (options.minimized) {
                    toggleMore(true);
                }

                // text only mode
                if (options.textonly) {
                    $wrapper.addClass("textonly");
                }

                // add picker css
                $wrapper.addClass(options.pickerCss);

                // add button container
                var $buttoncontainer = $("<div class='emojionearea-button-container'></div>").appendTo($wrapper);
                if (options.mode === 'fixed') {
                    $buttoncontainer.addClass("footer fixed-bottom");
                }

                // Move the button                            
                if (!options.inline) {
                    $buttoncontainer.empty().append(_emojiarea.button);
                }

                // Hide emojibutton
                if (!options.emojis) {
                    $buttoncontainer.addClass("no-emojis");
                }

                if (options.textonly) {
                    $buttoncontainer.addClass("d-none");
                }

                // Prepare the area for textcompletes
                _emojiarea.editor.data({
                    quicklinks: options.quicklinks,
                    mentions: options.mentions
                });

                // mentions
                var noPrefix = _emojiarea.editor.data("mention-noprefix") === "1";
                if (_emojiarea.editor.data("mentions")) {

                    _emojiarea.editor.textcomplete([{
                        // mention strategy
                        match: noPrefix ? /((@[a-zA-Z0-9_]+)|([a-zA-Z0-9_]+))$/ : /\B@([a-zA-Z0-9_]+)$/,
                        search: function (term, callback) {

                            $.getJSON(weavy.url.resolve("/api/autocomplete/mentions"), {
                                q: term,
                                top: 5
                            }).done(function (resp) {
                                callback(resp);
                            }).fail(function () {
                                callback([]);
                            });

                        },
                        index: 1,
                        template: function (item) {
                            //return '<img class="img-24 avatar" src="' + weavy.url.thumb(item.thumb_url, "48x48-crop,both") + '" alt="" /><span>' + (item.name || item.username) + ' <small>@' + item.username + '</small></span>';
                            var html = '<img class="img-24 avatar" src="' + weavy.url.thumb(item.thumb_url, "48x48-crop,both") + '" alt="" /><span>' + (item.name || item.username);
                            if (item.username) {
                                html += ' <small>@' + item.username + '</small>';
                            }
                            html += "</span>";
                            return html;
                        },
                        replace: function (mention) {
                            return '<a href="#">@' + mention.username + (noPrefix ? ',' : '') + "</a> ";
                        },
                        cache: false

                    }], {
                            maxCount: 10, zIndex: 10000, listPosition: null, placement: "top"
                        });
                }

                // quicklinks
                if (_emojiarea.editor.data("quicklinks")) {
                    // links
                    var top = 5;
                    _emojiarea.editor.textcomplete([{
                        // link strategy
                        match: /\[([^\]]+)$/,

                        search: function (term, callback) {
                            $.getJSON(weavy.url.resolve("/api/autocomplete"), { q: term, top: top }).done(function (resp) {
                                callback(resp);
                            }).fail(function () {
                                callback([]);
                            });
                        },
                        index: 1,
                        template: function (item) {
                            var icon = "<svg class='i text-" + item.icon.color + "'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#" + item.icon.name + "'></use></svg>"
                            return icon + '<span>' + item.title + ' <small class="text-muted">' + item.kind + '</small></span>';
                        },
                        replace: function (item) {
                            return "[" + item.title + "](" + item.url + ") ";
                        },
                        cache: false
                    }], {
                            maxCount: 10, zIndex: 10000, placement: "top"
                        });
                }

                if (!options.textonly) {
                    // file upload
                    if (options.fileupload) {
                        // add file button
                        var $file = $("<div class='btn-file btn btn-icon' title='Add files'><svg class='i'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#image'></use></svg><svg class='i'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#attachment'></use></svg><input type='file' name='files' multiple=''></div>");
                        $file.appendTo($buttoncontainer);

                        // add upload container
                        var $uploads = $("<div class='uploads'><table class='table table-attachments'></table><div class='progress d-none'></div></div>");
                        $uploads.appendTo($wrapper);

                        // init file upload                
                        $wrapper.fileupload({
                            url: weavy.url.resolve("/api/blobs"),
                            dropZone: $wrapper,
                            dataType: "json",
                            paramName: "blobs",
                            singleFileUploads: false,
                            add: function (e, data) {
                                // TODO: add logic here to prevent upload of certain files?                            
                                data.submit();
                            },
                            start: function (e) {
                                // disable submit button while upload in progress
                                $wrapper.find(".uploads").show();
                                $wrapper.find("button[type=submit]").attr("disabled", true);
                            },
                            progressall: function (e, data) {
                                // update progress bar
                                var percentage = parseInt(data.loaded / data.total * 100, 10);
                                $wrapper.find(".progress").css("width", percentage + "%").removeClass("d-none");
                            },
                            done: function (e, data) {
                                var blobs = data.result; // todo: parse

                                $.each(blobs.data, function (index, blob) {
                                    $wrapper.find(".uploads .table-attachments").append('<tr>' +
                                        '<td class="table-icon"><svg class="i text-' + blob.icon.color + '"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#' + blob.icon.name + '"></use></svg></td>' +
                                        '<td>' + blob.name + '</td>' +
                                        '<td class="table-icon"><a class="btn btn-icon remove"><svg class="i"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#close"></use></svg></a><input type="hidden" name="blobs" value="' + blob.id + '" /></td>' +
                                        '</tr>');
                                });

                                toggleMore(false);
                            },
                            fail: function (e, data) {
                                console.error(data);
                            },
                            always: function (e, data) {

                                // reset and hide progress bar
                                $wrapper.find(".progress").css("width", "0%").addClass("d-none");

                                // enable submit button
                                $wrapper.find("button[type=submit]").attr("disabled", false);

                            }
                        });

                        $wrapper.on("click", ".table-attachments .remove", function (e) {
                            e.preventDefault();
                            $(this).closest("tr").remove();
                        })
                    }

                    // embeds                

                    // init existing embeds
                    var embedIds = $textarea.data("editor-embed-ids");
                    
                    if (embedIds || options.embeds) {
                        var $embeds = $("<div class='embeds'/>");
                        $embeds.appendTo($wrapper);

                        if (embedIds) {
                            var ids = embedIds.toString().split(",");

                            // TODO: endpoint that takes array of embedid
                            $.each(ids, function (i, id) {
                                $.ajax({
                                    url: weavy.url.resolve("/embeds/" + id),
                                    method: "GET"
                                }).done(function (html) {
                                    $embeds.append(html).show();
                                    embedAdded = true;
                                }).fail(function () {
                                    // add embedid if we fail to load embed
                                    $embeds.append("<input type='hidden' name='embeds' value='" + id + "' />")
                                });
                            });
                        }

                        // enable embeds
                        _emojiarea.on("keyup", function (evt) {
                            var textarea = $el;

                            if (!embedAdded) {

                                var text = _emojiarea.getText();
                                var urls = twttr.txt.extractUrls(text);

                                if (urls.length) {
                                    var url = null;

                                    // get an url
                                    for (var i = 0; i < urls.length; i++) {
                                        var currentUrl = urls[i];

                                        // add protocol if missing
                                        if (!/^(?:f|ht)tps?\:\/\//.test(currentUrl)) {
                                            currentUrl = "http://" + currentUrl;
                                        }

                                        if (removedEmbeds.indexOf(currentUrl) === -1) {
                                            url = currentUrl;
                                            break;
                                        }
                                    }

                                    if (url) {

                                        var data = { url: url };

                                        $.ajax({
                                            contentType: "application/json; charset=utf-8",
                                            url: weavy.url.resolve("/embeds"),
                                            type: "POST",
                                            data: JSON.stringify(data),
                                            beforeSend: function (xhr, settings) {
                                                // show loading...

                                                // temporarily disable parsing while we fetch an url
                                                embedAdded = true;
                                            },
                                            success: function (html, status, xhr) {
                                                // set html of embedded url                                            
                                                $embeds.html(html).show();

                                                // disable embed once an url has been embedded
                                                embedAdded = true;
                                            },
                                            error: function (xhr, status, error) {
                                                // re-enable embeds if we got an error
                                                embedAdded = false;
                                            },
                                            complete: function (xhr, status) {
                                                // hide loading                                            
                                            }
                                        });
                                    }
                                }
                            }


                        });

                        // remove embed
                        $wrapper.on("click", ".close-embed", function (e) {
                            e.preventDefault();
                            $(this).closest(".embed").remove();

                            // get the embed url and add it to the blacklist
                            var url = $(this).data("url");
                            removedEmbeds.push(url);
                            embedAdded = false;
                        })
                    }

                    // polls
                    if (options.polls) {

                        // add options button
                        var $optionsbutton = $("<button type='button' class='btn btn-icon btn-poll' title='Add poll'><svg class='i'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#poll-box'></use></svg></button>");
                        $optionsbutton.appendTo($buttoncontainer);

                        // add options container
                        var $options = $('<div class="poll-options"></div>');
                        $options.insertBefore($buttoncontainer);

                        // init existing poll
                        var pollId = $textarea.data("editor-poll-id");
                        if (pollId) {
                            $.ajax({
                                url: weavy.url.resolve("/api/posts/" + pollId),
                                method: "GET"
                            }).then(function (post) {
                                if (post.poll) {
                                    post.poll.options.map(function (option, index) {
                                        var optIndexer = "opt_" + index;
                                        var opt = $("<div class='form-group'><input type='hidden' name='options.Index' value='" + optIndexer + "'/>" +
                                            "<input type='hidden' name='options[" + optIndexer + "].Id'  value='" + option.id + "'/>" +
                                            "<input type='text' name='options[" + optIndexer + "].Text' value='" + option.text + "' class='form-control' placeholder='+add an option' />" +
                                            "</div>");
                                        $options.append(opt);
                                    });
                                    $options.show();
                                }
                            });

                        }


                        // show options
                        $wrapper.on("click", ".btn-poll", function (evt) {
                            evt.preventDefault();

                            // expand if minimized
                            toggleMore(false);

                            var options = $wrapper.find(".poll-options");

                            if (!options.is(":visible")) {
                                if (!options.find(".form-group").length) {
                                    var optIndexer = "opt_" + randomNumber();
                                    var opt = $("<div class='form-group'><input type='hidden' name='options.Index' value='" + optIndexer + "'/>" +
                                        "<input type='hidden' name='options[" + optIndexer + "].Id'  value='0'/>" +
                                        "<input type='text' name='options[" + optIndexer + "].Text' value='' class='form-control' placeholder='+add an option' />" +
                                        "</div>");
                                    options.append(opt);
                                }
                                options.show();
                                options.find("input:first").focus();

                            } else {
                                options.hide();
                            }
                        });

                        // add option
                        $wrapper.on("focus", ".poll-options input:last", function (evt) {
                            var options = $(this).closest(".poll-options");
                            var count = options.find(".form-group").length;
                            if (count < 10) {
                                var optIndexer = "opt_" + randomNumber();
                                var opt = $("<div class='form-group'><input type='hidden' name='options.Index' value='" + optIndexer + "'/>" +
                                    "<input type='hidden' name='options[" + optIndexer + "].Id'  value='0'/>" +
                                    "<input type='text' name='options[" + optIndexer + "].Text' value='' class='form-control' placeholder='+add an option' />" +
                                    "</div>");
                                options.append(opt);
                            }
                        });
                    }
                }

                // add context button
                if (options.context) {

                    var $context = $("<div class='context'>" +
                        "<div class='context-data'><img class='context-icon' src=''/><span class='context-url'></span><a href='#' title='Remove url as context' class='remove-context btn btn-icon'><svg class='i i-18'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#close-circle'></use></svg></a></div>" +
                        "</div>");

                    var $contextButton = $("<button type='button' class='context btn btn-icon btn-add-context' title='Embed current url as context'><svg class='i'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#link-context'></use></svg></button>");

                    // Always hide context initially for comments
                    if ($wrapper.closest(".section-comments").length) {
                        $wrapper.closest("form").find("#contextUrl").attr("disabled", true);
                        $context.hide();
                    } else {
                        $context.addClass("has-context");
                        $contextButton.addClass("has-context");
                    }

                    $context.prependTo($wrapper);
                    $contextButton.prependTo($buttoncontainer);

                    $context.on("click", ".remove-context", function (e) {
                        e.preventDefault();
                        $wrapper.find(".context").removeClass("has-context");
                        $context.find(".context-data").fadeOut(200);
                        $context.slideUp(200);
                        $wrapper.closest("form").find("#contextUrl").attr("disabled", true);
                        hook("onContextChange", e, { has_context: false });
                    });

                    $($contextButton).on("click", function (e) {
                        e.preventDefault();
                        $wrapper.find(".context").addClass("has-context");
                        $wrapper.closest("form").find("#contextUrl").attr("disabled", false);
                        $context.find(".context-data").fadeIn(200);
                        $context.slideDown(200);
                        hook("onContextChange", e, { has_context: true });
                    });
                }

                // add more button
                if (options.minimized) {
                    var $more = $("<button type='button' class='btn btn-icon btn-more' title='More'><svg class='i'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#dots-horizontal-circle'></use></svg></button>")
                    $more.appendTo($buttoncontainer);
                    $more.on("click", function (e) {
                        e.preventDefault();
                        $wrapper.toggleClass("minimized");
                    });
                }

                // add submit button
                var $submit = $("<button tabindex='2' type='submit' class='btn-submit btn btn-icon btn-primary' title='Submit'><svg class='i'><use xmlns:xlink='http://www.w3.org/1999/xlink' xlink:href='#send'></use></svg></button>");
                if (options.submitButton) {
                    $submit = options.submitButton;
                } else {
                    $submit.appendTo($buttoncontainer);
                }

                $submit.on("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $wrapper.find(".context").removeClass("has-context");
                    $wrapper.find("div.context .context-data").fadeOut(200);
                    $wrapper.find("div.context").slideUp(200);
                    toggleMore(true);

                    hook("onSubmit", e, { text: _emojiarea.getText(), wrapper: $wrapper, editor: _emojiarea });
                });

                // ctrl + enter submits content
                _emojiarea.on("keypress", function (editor, evt) {
                    if ((evt.keyCode === 10 || evt.keyCode === 13) && evt.ctrlKey) {
                        evt.preventDefault();
                        editor.blur();
                        $submit.trigger("click");
                    }
                });
            }

            hook('onInit');
        }


        function focus() {
            if (_emojiarea) {
                _emojiarea.setFocus();
            }
        }
        /**
         * Reset plugin
         */
        function reset() {
            // remove validation error class
            $wrapper.removeClass("is-invalid");

            // reset attachments
            $wrapper.find(".table-attachments tr").remove();

            // reset embeds
            $wrapper.find(".embeds").hide().empty();
            embedAdded = false;
            removedEmbeds = [];

            // reset polls
            $wrapper.find(".poll-options").hide().empty();

            // Clear text
            if (_emojiarea) {
                _emojiarea.setText("");
            }
        }

        /**
         * Get/set a plugin option.
         * Get usage: $('#el').weavyEditor('option', 'key');
         * Set usage: $('#el').weavyEditor('option', 'key', value);
         */
        function option(key, val) {
            if (val) {
                options[key] = val;
            } else {
                return options[key];
            }
        }

        /**
         * Destroy plugin.
         * Usage: $('#el').weavyEditor('destroy');
         */
        function destroy() {
            // Iterate over each matching element.            
            $el.each(function () {
                var el = this;
                var $el = $(this);

                // Code to restore the element to its original state...                
                $el.css("display", "");
                _emojiarea = null;
                $wrapper.remove();

                hook('onDestroy');
                // Remove WeavyEditor instance from the element.
                $el.removeData('plugin_' + pluginName);
            });
        }

        /**
         * Callback hooks.
         * Usage: In the defaults object specify a callback function:
         * hookName: function() {}
         * Then somewhere in the plugin trigger the callback:
         * hook('hookName');
         */
        function hook(hookName, evt, data) {
            if (options[hookName] !== undefined) {
                // Call the user defined function.
                // Scope is set to the jQuery element we are operating on.
                options[hookName].call(el, evt, data);
            }
        }

        function randomNumber() {
            var min = 0;
            var max = 9999999;
            return Math.floor(Math.random() * (max - min) + min);
        }

        function toggleMore(minimize) {
            if (!options.minimized) return;

            if (minimize) {
                $wrapper.addClass("minimized");
            } else {
                $wrapper.removeClass("minimized");
            }
        }

        // Initialize the plugin instance.
        init();

        // Expose methods of WeavyEditor we wish to be public.
        return {
            option: option,
            destroy: destroy,
            reset: reset,
            focus: focus
        };
    }

    /**
     * WeavyEditor definition.
     */
    $.fn[pluginName] = function (options) {
        // If the first parameter is a string, treat this as a call to
        // a public method.
        if (typeof arguments[0] === 'string') {
            var methodName = arguments[0];
            var args = Array.prototype.slice.call(arguments, 1);
            var returnVal;
            this.each(function () {
                // Check that the element has a plugin instance, and that
                // the requested public method exists.
                if ($.data(this, 'plugin_' + pluginName) && typeof $.data(this, 'plugin_' + pluginName)[methodName] === 'function') {
                    // Call the method of the WeavyEditor instance, and Pass it
                    // the supplied arguments.
                    returnVal = $.data(this, 'plugin_' + pluginName)[methodName].apply(this, args);
                } else {
                    throw new Error('Method ' + methodName + ' does not exist on jQuery.' + pluginName);
                }
            });
            if (returnVal !== undefined) {
                // If the method returned a value, return the value.
                return returnVal;
            } else {
                // Otherwise, returning 'this' preserves chainability.
                return this;
            }
            // If the first parameter is an object (options), or was omitted,
            // instantiate a new instance of the plugin.
        } else if (typeof options === "object" || !options) {
            return this.each(function () {
                // Only allow the plugin to be instantiated once.
                if (!$.data(this, 'plugin_' + pluginName)) {
                    // Pass options to WeavyEditor constructor, and store WeavyEditor
                    // instance in the elements jQuery data object.
                    $.data(this, 'plugin_' + pluginName, new WeavyEditor(this, options));
                }
            });
        }
    };

    // Default plugin options.
    // Options can be overwritten when initializing plugin, by
    // passing an object literal, or after initialization:
    // $('#el').weavyEditor('option', 'key', value);
    $.fn[pluginName].defaults = {
        emojis: true,
        mentions: true,
        quicklinks: true,
        embeds: true,
        polls: true,
        fileupload: true,
        inline: false,
        collapsed: false,
        minimized: false,
        textonly: false,
        mode: 'default',
        pickerCss: '',
        placeholder: 'What\'s on your mind?',
        submitButton: null,
        onInit: function () { },
        onDestroy: function () { },
        onClick: function () { }
    };

})(jQuery);

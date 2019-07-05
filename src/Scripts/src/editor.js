/*global twttr */
var wvy = wvy || {};

wvy.editor = (function ($) {

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
            $wrapper = $("<div class='weavy-editor'/>");
            $wrapper.insertBefore($el);
            $wrapper.on("click", function (e) {
                toggleMore(false);
                hook("onClick", e, $wrapper);
            });

            // Force hide emojis if mobile
            if (wvy.browser.mobile) {
                options.emojis = false;
            }

            var $textarea = $el.removeAttr("disabled").emojioneArea({
                attributes: {
                    dir: "ltr",
                    spellcheck: true,
                    autocomplete: "on",
                    autocorrect: "on",
                    autocapitalize: "on"                    
                },
                buttonTitle: "Insert emoji",
                container: $wrapper,
                events: {
                    "picker.show": function (picker, evt) {
                        toggleMore(false);
                        picker.show();
                    },
                    "picker.hide": function (picker, evt) {
                        picker.hide();
                    }
                },
                imageType: "svg",
                inline: options.inline,
                pickerPosition: options.mode === 'default' ? (options.inline ? "bottom" : "top") : options.mode,
                placeholder: options.placeholder,
                saveEmojisAs: "shortname",
                searchPlaceholder: "Search...",
                shortcuts: false,
                textcomplete: {
                    maxCount: 5,
                    placement: null
                },
                tonesStyle: "bullet",
                useInternalCDN: false
            });

            if ($textarea[0] !== null) {
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

                            $.getJSON(wvy.url.resolve("/a/autocomplete/mentions"), {
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
                            var html = '<img class="img-24 avatar" src="' + wvy.url.thumb(item.thumb_url, "48x48-crop,both") + '" alt="" /><span>' + (item.name || item.username);
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
                            $.getJSON(wvy.url.resolve("/a/autocomplete"), { q: term, top: top }).done(function (resp) {
                                callback(resp);
                            }).fail(function () {
                                callback([]);
                            });
                        },
                        index: 1,
                        template: function (item) {
                            var icon = '<svg class="i i-link-variant" height="24" viewBox="0 0 24 24" width="24"><path d="m10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0-1.95-1.95-1.95-5.12 0-7.07l3.54-3.54c1.95-1.95 5.12-1.95 7.07 0s1.95 5.12 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48c1.18-1.17 1.18-3.07 0-4.24-1.17-1.18-3.07-1.18-4.24 0l-3.53 3.53c-1.18 1.17-1.18 3.07 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0 1.95 1.95 1.95 5.12 0 7.07l-3.54 3.54c-1.95 1.95-5.12 1.95-7.07 0s-1.95-5.12 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47c-1.18 1.17-1.18 3.07 0 4.24 1.17 1.18 3.07 1.18 4.24 0l3.53-3.53c1.18-1.17 1.18-3.07 0-4.24-.41-.39-.41-1.03 0-1.42z"/></svg>'
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
                        var $file = $('<div class="btn-file btn btn-icon" title="Add files"><svg class="i i-image" height="24" viewBox="0 0 24 24" width="24"><path d="m8.5 13.5 2.5 3 3.5-4.5 4.5 6h-14m16 1v-14c0-1.11-.9-2-2-2h-14c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2z"/></svg><svg class="i i-attachment" height="24" viewBox="0 0 24 24" width="24"><path d="m7.5 18c-3.04 0-5.5-2.46-5.5-5.5s2.46-5.5 5.5-5.5h10.5c2.21 0 4 1.79 4 4s-1.79 4-4 4h-8.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5h7.5v1.5h-7.5c-.55 0-1 .45-1 1s.45 1 1 1h8.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5h-10.5c-2.21 0-4 1.79-4 4s1.79 4 4 4h9.5v1.5z"/></svg><input type="file" name="files" multiple /></div>');
                        $file.appendTo($buttoncontainer);

                        // add upload container
                        var $uploads = $("<div class='uploads'><table class='table table-attachments'></table><div class='progress d-none'></div></div>");
                        $uploads.appendTo($wrapper);

                        // init file upload                
                        $wrapper.fileupload({
                            url: wvy.url.resolve("/a/blobs"),
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
                                        '<td class="table-icon"><svg class="i i-attachment" height="24" viewBox="0 0 24 24" width="24"><path d="m7.5 18c-3.04 0-5.5-2.46-5.5-5.5s2.46-5.5 5.5-5.5h10.5c2.21 0 4 1.79 4 4s-1.79 4-4 4h-8.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5h7.5v1.5h-7.5c-.55 0-1 .45-1 1s.45 1 1 1h8.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5h-10.5c-2.21 0-4 1.79-4 4s1.79 4 4 4h9.5v1.5z"/></svg></td>' +
                                        '<td>' + blob.name + '</td>' +
                                        '<td class="table-icon"><a class="btn btn-icon remove"><svg class="i i-close" height="24" viewBox="0 0 24 24" width="24"><path d="m19 6.41-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59z"/></svg></a><input type="hidden" name="blobs" value="' + blob.id + '" /></td>' +
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
                                    url: wvy.url.resolve("/embeds/" + id),
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
                                        if (!/^(?:f|ht)tps?:\/\//.test(currentUrl)) {
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
                                            url: wvy.url.resolve("/embeds"),
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
                        var $optionsbutton = $('<button type="button" class="btn btn-icon btn-poll" title="Add poll"><svg class="i i-poll-box" height="24" viewBox="0 0 24 24" width="24"><path d="m17 17h-2v-4h2m-4 4h-2v-10h2m-4 10h-2v-7h2m10-7h-14c-1.11 0-2 .89-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-14c0-1.11-.9-2-2-2z"/></svg></button>');
                        $optionsbutton.appendTo($buttoncontainer);

                        // add options container
                        var $options = $('<div class="poll-options"></div>');
                        $options.insertBefore($buttoncontainer);

                        // init existing poll
                        var pollId = $textarea.data("editor-poll-id");
                        if (pollId) {
                            $.ajax({
                                url: wvy.url.resolve("/a/posts/" + pollId),
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

                    var $context = $('<div class="context">' +
                        '<div class="context-data"><img class="context-icon" src=""/><span class="context-url"></span><a href="#" title="Remove context url" class="remove-context btn btn-icon"><svg class="i i-18 i-close-circle" height="24" viewBox="0 0 24 24" width="24"><path d="m12 2c5.53 0 10 4.47 10 10s-4.47 10-10 10-10-4.47-10-10 4.47-10 10-10m3.59 5-3.59 3.59-3.59-3.59-1.41 1.41 3.59 3.59-3.59 3.59 1.41 1.41 3.59-3.59 3.59 3.59 1.41-1.41-3.59-3.59 3.59-3.59z"/></svg></a></div>' +
                        '</div>');

                    var $contextButton = $('<button type="button" class="context btn btn-icon btn-add-context" title="Embed current url as context"><svg class="i i-link-context" height="24" viewBox="0 0 24 24" width="24"><path d="m19 19h-14v-14h5l2-2h-7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7l-2 2zm-6.1-7.9c.3.3.3.8 0 1.1s-.8.3-1.1 0c-1.5-1.5-1.5-3.9 0-5.4l2.7-2.7c1.5-1.5 3.9-1.5 5.4 0s1.5 3.9 0 5.4l-1.1 1.1c0-.6-.1-1.2-.3-1.8l.4-.4c.9-.9.9-2.3 0-3.2s-2.3-.9-3.2 0l-2.7 2.7c-1 .8-1 2.3-.1 3.2zm2.2-3.2c.3-.3.8-.3 1.1 0 1.5 1.5 1.5 3.9 0 5.4l-2.7 2.7c-1.5 1.5-3.9 1.5-5.4 0s-1.5-3.9 0-5.4l1.1-1.1c0 .6.1 1.2.3 1.8l-.4.4c-.9.9-.9 2.3 0 3.2s2.3.9 3.2 0l2.7-2.7c.9-.9.9-2.3 0-3.2-.2-.4-.2-.8.1-1.1z"/></svg></button>');

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
                        hook("onContextChange", e, { hasContext: false });
                    });

                    $($contextButton).on("click", function (e) {
                        e.preventDefault();
                        $wrapper.find(".context").addClass("has-context");
                        $wrapper.closest("form").find("#contextUrl").attr("disabled", false);
                        $context.find(".context-data").fadeIn(200);
                        $context.slideDown(200);
                        hook("onContextChange", e, { hasContext: true });
                    });
                }

                // add more button
                if (options.minimized) {
                    var $more = $('<button type="button" class="btn btn-icon btn-more" title="More"><svg class="i i-dots-horizontal-circle" height="24" viewBox="0 0 24 24" width="24"><path d="m12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10-10-4.48-10-10 4.48-10 10-10m0 8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5m-5.5 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5m11 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/></svg></button>')
                    $more.appendTo($buttoncontainer);
                    $more.on("click", function (e) {
                        e.preventDefault();
                        $wrapper.toggleClass("minimized");
                    });
                }

                // add submit button
                var $submit = $('<button type="submit" class="btn-submit btn btn-icon btn-primary" title="Submit"><svg class="i i-send" height="24" viewBox="0 0 24 24" width="24"><path d="m2 21 21-9-21-9v7l15 2-15 2z"/></svg></button>');
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

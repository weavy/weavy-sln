/*global tinymce, emojione */
var wvy = wvy || {};

tinymce.PluginManager.add("weavy_autocomplete", function (editor, url) {

    // TinyMce adapter for jquery.textcomplete.js
    function TinyMceAdapter(element, completer, option) {
        this.initialize(element, completer, option);
    }

    var extension = {
        // update the content when an dropdown item is selected
        select: function (value, strategy, e) {
            var $body = $(editor.getBody());
            var rootDocument = $body[0].ownerDocument;
            var pre = this.getTextFromHeadToCaret();
            var sel = editor.selection;
            var range = sel.getRng(true);
            var selection = range.cloneRange();

            selection.selectNodeContents(range.startContainer);
            var content = selection.toString();
            var post = content.substring(range.startOffset);
            var replacement = strategy.replace(value, e);

            if (typeof replacement !== 'undefined') {
                if ($.isArray(replacement)) {
                    post = replacement[1] + post;
                    replacement = replacement[0];
                }
                if (pre.length > 0) {
                    pre = pre.replace(strategy.match, '');
                }

                range.selectNodeContents(range.startContainer);
                range.deleteContents();

                var frag = rootDocument.createDocumentFragment();
                var prenode = rootDocument.createTextNode(pre);
                frag.appendChild(prenode);
                var replnodes = $.parseHTML(replacement);
                $.each(replnodes, function (i, el) {
                    frag.appendChild(replnodes[i]);
                });
                var postnode = rootDocument.createTextNode(post);
                frag.appendChild(postnode);
                range.insertNode(frag);

                // set cursor position
                range.setStartBefore(postnode);
                range.collapse(true);
                var intsel = sel.getSel();
                intsel.removeAllRanges();
                intsel.addRange(range);
            }
        },

        getCaretPosition: function () {
            // start with position of timymce
            var caretpos = $(editor.getContentAreaContainer()).offset();
            // then find relative caret position 
            var range = editor.selection.getRng(true);
            var rects = range.getClientRects();
            if (rects.length > 0) {
                var rect = rects[0];
                caretpos.top += rect.top + rect.height;
                caretpos.left += rect.left;
            } else {
                var $node = $(editor.selection.getNode())
                var nodepos = $node.offset();
                caretpos.top += nodepos.top + $node.height();
                caretpos.left += nodepos.left;
            }
            return caretpos;
        },

        // Returns the string between the first character and the caret.
        // Completer will be triggered with the result for start autocompleting.
        // For example, suppose the html is '<b>hello</b> wor|ld' and | is the caret.
        // getTextFromHeadToCaret() should return ' wor'  // not '<b>hello</b> wor'
        getTextFromHeadToCaret: function () {
            var range = editor.selection.getRng(true);
            var selection = range.cloneRange();
            selection.selectNodeContents(range.startContainer);
            var text = selection.toString();
            text = text.substring(0, range.startOffset);
            return text;
        }
    }


    var backupAdapter = $.fn.textcomplete.ContentEditable;

    $.extend(TinyMceAdapter.prototype, $.fn.textcomplete.Adapter.prototype, extension);

    $.fn.textcomplete.ContentEditable = TinyMceAdapter;

    editor.on("remove", function () {
        $.fn.textcomplete.ContentEditable = backupAdapter;
    })

    // attach textcomplete to tinymce body element
    editor.on("init", function () {
        var $body = $(editor.getBody());
        $body.textcomplete([
            {
                // mention strategy
                match: /\B@([a-zA-Z0-9_]+)$/,
                search: function (term, callback) {
                    var url = wvy.url.resolve("/a/autocomplete/mentions");
                    if (wvy.context.space > 0) {
                        url = wvy.url.resolve("/a/autocomplete/" + wvy.context.space + "/mentions");
                    }
                    $.getJSON(url, {
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
                    var html = '<img class="img-24 avatar" src="' + wvy.url.thumb(item.thumb, "48") + '" alt="" />';
                    if (item.member) {
                        html += '<span>';
                    } else {
                        html += '<span class="text-muted">';
                    }
                    html += item.name || item.username;
                    if (item.username) {
                        html += ' <small>@' + item.username + '</small>';
                    }
                    if (item.directory) {
                        html += ' <span class="badge badge-success">' + item.directory + '</small>';
                    }
                    html += "</span>";
                    return html;
                },
                replace: function (mention) {
                    return '<a class="' + mention.type + '" href="' + mention.url + '">@' + mention.username + '</a>';
                }
            }, {
                // emoji strategy
                match: /\B:([a-zA-Z0-9_]*)$/,
                search: function (term, callback) {
                    callback($.map(wvy.emoji.shortnames, function (shortname) {
                        return shortname.indexOf(term) !== -1 ? shortname : null;
                    }));
                },
                template: function (shortname) {
                    return emojione.toImage(shortname).replace('class="emojione"', 'class="eo"') + " " + shortname.replace(/:/g, '')
                },
                replace: function (shortname) {
                    return emojione.toImage(shortname).replace('class="emojione"', 'class="eo"');
                },
                cache: true,
                index: 1
            }, {
                // link strategy
                match: /\[(\w*)$/, ///\B\[([^\]]+)$/,
                search: function (term, callback) {
                    var url = wvy.url.resolve("/a/autocomplete/content");
                    if (wvy.context.space > 0) {
                        url = wvy.url.resolve("/a/autocomplete/" + wvy.context.space + "/content");
                    }
                    if (wvy.config && wvy.config.autocomplete) {
                        url = wvy.url.resolve(wvy.config.autocomplete + "?id=" + wvy.context.space + "&appId=" + wvy.context.app);
                    }

                    var data = { top: 5 };
                    if (term !== "") {
                        data.q = term;
                    }
                    
                    $.getJSON(url, data).done(function (resp) {
                        callback(resp);
                    }).fail(function () {
                        callback([]);
                    });
                },
                template: function (item) {
                    var icon = '<svg class="i i-link-variant" height="24" viewBox="0 0 24 24" width="24"><path d="m10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0-1.95-1.95-1.95-5.12 0-7.07l3.54-3.54c1.95-1.95 5.12-1.95 7.07 0s1.95 5.12 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48c1.18-1.17 1.18-3.07 0-4.24-1.17-1.18-3.07-1.18-4.24 0l-3.53 3.53c-1.18 1.17-1.18 3.07 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0 1.95 1.95 1.95 5.12 0 7.07l-3.54 3.54c-1.95 1.95-5.12 1.95-7.07 0s-1.95-5.12 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47c-1.18 1.17-1.18 3.07 0 4.24 1.17 1.18 3.07 1.18 4.24 0l3.53-3.53c1.18-1.17 1.18-3.07 0-4.24-.41-.39-.41-1.03 0-1.42z"/></svg>'
                    return icon + '<span>' + item.name + ' <small class="text-muted">' + item.kind + '</small></span>';

                },
                replace: function (item) {
                    return '<a href="' + item.url + '">' + item.name + '</a>';
                },
                index: 1
            }
        ], {
                maxCount: 10, zIndex: 10000, onKeydown:
                    function (e, commands) {
                        if (e.keyCode === 9) {
                            e.preventDefault();
                            return false;
                        }
                    }
            }).on({
                'textComplete:show': function (e) {
                    $body.data('autocompleting', true);
                },
                'textComplete:hide': function (e) {
                    $body.data('autocompleting', false);
                }
            });
    });

    // prevent tinymce from inserting new line on enter when textcomplete dropdown is open
    editor.on('keydown', function (e) {
        if (e.keyCode === 13) {
            var body = this.getBody();
            var autocompleting = $(body).data("autocompleting");
            if (autocompleting) {
                e.stopPropagation();
                e.preventDefault();
            }
        }
    });

});

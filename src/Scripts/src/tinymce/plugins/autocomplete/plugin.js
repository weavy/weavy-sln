tinymce.PluginManager.add("weavy_autocomplete", function (editor, url) {
    
    // TinyMce adapter for jquery.textcomplete.js
    function TinyMceAdapter(element, completer, option) {        
        this.initialize(element, completer, option);    }

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
                  console.debug(term);
                  $.getJSON(weavy.url.resolve("api/autocomplete/mentions"), {
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
                  return '<img class="avatar-24" src="' + item.thumb_url.replace('{options}', '24x24-crop,both') + '" alt="" /><span><span>' + (item.name || item.username) + ' <small> @' + item.username + '</small></span>'
              },
              replace: function (mention) {
                  return '<a class="' + mention.type + '" href="' + mention.url + '">@' + mention.username + '</a>';
              }
          }, {
              // emoji strategy
              match: /\B:([a-zA-Z0-9_]*)$/,
              search: function (term, callback) {
                  console.debug(term);
                  var data = weavy.emoji.icons;
                  var result = [];
                  term = term.replace(":", "");
                  result = _.chain(data)
                      .filter(function (emoji) {
                          return emoji.shortname.indexOf(term) != -1;
                      })
                      .first(5)
                      .value();

                  callback(result);
              },
              template: function (item) {
                  // todo: replace with inline html
                  //return Handlebars.templates["autocomplete-emoji-template"](item);
                  return '<img class="eo" src="' + weavy.url.resolve('img/eo/' + item.unicode + '.svg') + '" alt="' + item.shortname + '" /> ' + item.shortname;
              },
              index: 1,
              replace: function (emoji) {
                  return '<img class="eo" src="' + weavy.context.path + 'img/eo/' + emoji.unicode + '.svg" alt="' + emoji.shortname + '" />';
              }
          }, {
              // link strategy
              match: /\B\[([^\]]+)$/,
              search: function (term, callback) {
                  console.debug(term);
                  $.getJSON(weavy.url.resolve("api/autocomplete"), {
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
                  return '<img class="avatar-24" src="' + weavy.url.thumb(item.thumb_url, "24x24-crop,both") + '" alt="" /><span>' + item.title + '</span><small> - ' + item.type + '</small>'; 
                  
              },
              replace: function (item) {
                  return '<a href="' + item.url + '">' + item.title + '</a>';
              }
          }
        ], {
            maxCount: 10, zIndex: 10000, onKeydown :
                function(e, commands) {
                    if (e.keyCode == 9) {
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
        if (e.keyCode == 13) {
            var body = this.getBody();
            var autocompleting = $(body).data("autocompleting");
            if (autocompleting) {
                e.stopPropagation();
                e.preventDefault();
            }
        }
    });
    
});

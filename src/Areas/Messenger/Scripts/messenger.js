var weavy = weavy || {};
weavy.messenger = (function ($) {
    // NOTE: IE seems to cache ajax get requests so we need to disable the jquery ajax cache
    $.ajaxSetup({ cache: false });

    // current conversation
    var _conversation = -1;

    // people typing
    var _typing = [];
    var _typingTimeout;
    var _hasDisconnected = false;

    // emoji area
    var emojiAreaEditorHeight;
    var $textarea;
    var _emojiarea;

    // ajax requests
    var _messagesXhr = null;
    var _detailsXhr = null;
    var _listXhr = null;

    // keep track of latest pane when clicking on profiles
    var _activePane = "";

    // custom jquery contains (case-insensitive)
    $.expr.pseudos.contains = $.expr.createPseudo(function (arg) {
        return function (elem) {
            return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
    });

    if ($.fn.textcomplete.Completer) {
        $.fn.textcomplete.Completer.defaults.rightEdgeOffset = 0;
        $.fn.textcomplete.Completer.defaults.dropdownClassName = "dropdown-menu messenger-textcomplete";
    }

    ///////////////////
    // public functions
    ///////////////////

    // set active conversation
    function set(id) {
        // set current conversation
        $(".app").removeClass("one three").addClass("two");

        if (_conversation == id) {
            // conversation is already active, just mark as read and scroll to bottom
            read(_conversation);
            scrollToBottom();
        } else {
            // remove active class from conversations
            $(".list-group-conversations .conversation").removeClass("active");

            // remove new messages banner when switching conversation
            removeMessagesBanner();

            // refresh messages (no need to update conversations and details pane)
            getConversation(id, false, true, false);
        }

        // save id of active conversation
        _conversation = id;

        // set active class
        $(".list-group-conversations .conversation[data-conversation=" + id + "]").addClass("active");
        pushState("", id);
    }

    // archive conversation
    function archive(id) {
        console.debug("archiving conversation " + id);
        $.ajax({
            contentType: "application/json",
            method: "POST",
            url: weavy.url.resolve("/api/conversations/" + id + "/archive")
        }).done(function (data, status, xhr) {
            refreshConversation(true);
        });
    }

    // unarchive conversation
    function unarchive(id) {
        console.debug("unarchiving conversation " + id);
        $.ajax({
            contentType: "application/json",
            method: "DELETE",
            url: weavy.url.resolve("/api/conversations/" + id + "/archive")
        }).done(function (data, status, xhr) {
            refreshConversation(true);
        });
    }

    // leave conversation
    function leave(id) {
        console.debug("leaving conversation " + id);
        $.ajax({
            contentType: "application/json",
            method: "DELETE",
            url: weavy.url.resolve("/api/conversations/" + id + "/leave")
        }).done(function (data, status, xhr) {
            refreshConversation(true);
        });
    }

    // mark conversation as read
    function read(id) {
        // update ui immediately for better perceived performance
        ui_read(id);

        // then call server to mark as read
        $.post(weavy.url.resolve("/api/messenger/" + id + "/read"));
    }

    // mark conversation as unread
    function unread(id) {
        // update ui immediately for better perceived performance
        ui_unread(id);

        // then call server to mark as unread
        $.ajax({
            contentType: "application/json",
            method: "DELETE",
            url: weavy.url.resolve("/api/conversations/" + id + "/read")
        });
    }

    // update user settings
    function saveSettings(refresh) {
        var $form = $(".form-settings");
        var postData = $form.serializeObject(true);
        // fix checkboxes
        $(".form-settings input[type=checkbox]").each(function (i, item) {
            postData[$(item).attr("name").snakecase()] = $(item).is(":checked") ? true : false;
        });

        $.ajax({
            contentType: "application/json",
            method: "POST",
            data: JSON.stringify(postData),
            url: weavy.url.resolve("/api/messenger/settings")
        }).done(function (data, status, xhr) {
            weavy.context.notify = data.desktop_notifications;
            weavy.context.enter = data.enter_to_send;

            if (refresh) {
                refreshConversation(false);
            }
        });
    }

    ///////////////
    // ui callbacks
    ///////////////

    // update ui when conversation was marked read
    function ui_read(id) {
        var $conversation = $(".conversation[data-conversation=" + id + "]").removeClass("unread");
        var $dropdown = $(".dropdown-menu").removeClass("show");
        var $button = $(".dropdown-item[data-read=" + id + "]").removeAttr("data-read").attr("data-unread", id).text("Mark as unread");
        refreshBadge();
    }

    // update ui when conversation was marked unread
    function ui_unread(id) {
        var $conversation = $(".conversation[data-conversation=" + id + "]").addClass("unread");
        var $dropdown = $(".dropdown-menu").removeClass("show");
        var $button = $(".dropdown-item[data-unread=" + id + "]").removeAttr("data-unread").attr("data-read", id).text("Mark as read");
        refreshBadge();
    }

    ////////////////////////
    // misc helper functions
    ////////////////////////

    // add page to pushState
    function pushState(page, id) {
        var url = weavy.url.resolve("/messenger/" + id);

        if (typeof history.pushState !== "undefined") {
            var obj = { Page: page, Url: url, Id: id };
            try {
                history.pushState(obj, obj.Page, obj.Url);
            } catch (e) {
                // NOTE: history api is not working in office add-in: https://stackoverflow.com/questions/42642863/office-js-nullifies-browser-history-functions-breaking-history-usage
            }

        } else {
            console.debug("Browser does not support push state.");
        }
    }

    // add to cache
    function setCache(key, data) {
        if (typeof (Storage) !== "undefined") {
            try {
                localStorage.setItem(key, data);
            } catch (err) {
                console.debug(err);
            }
        } else {
            console.debug("Sorry, no support for local storage");
        }
    }

    // get from cache
    function getCache(key) {
        if (typeof (Storage) !== "undefined") {
            try {
                return localStorage.getItem(key);
            } catch (err) {
                console.debug(err);
                return null;
            }
        } else {
            console.debug("Sorry, no support for local storage");
            return null;
        }
    }

    // set focus
    function setTextAreaFocus() {
        if (_emojiarea && !weavy.browser.mobile) {
            _emojiarea.setFocus();
        }
    }

    // scroll to bottom of pane-two
    function scrollToBottom(force, forceOffset) {

        var $elem = $(".pane-two .scroll-y");
        if ($elem.length > 0) {
            force = typeof (force) === "undefined" ? true : force;
            forceOffset = forceOffset || 250;
            var aroundBottom = $elem[0].scrollHeight - ($elem[0].offsetHeight + $elem[0].scrollTop) <= forceOffset;

            if (force || (!force && aroundBottom)) {
                $elem.scrollTop($elem[0].scrollHeight);
            }
        }
    }

    // updates gui when a message is updated/inserted
    function messageUpserted(message, insert) {

        // make ajax request to server to get pre-rendered html for the message
        var d1 = $.ajax({
            url: weavy.url.resolve("/messenger/m/" + message.id),
            cache: false
        });

        // make ajax request to server to get html markup for the conversation in the conversation list
        var d2 = $.Deferred();
        if (insert) {
            d2 = $.ajax({
                url: weavy.url.resolve("/messenger/c/" + message.conversation),
                cache: false
            });
        } else {
            // resolve deferred to undefined
            d2.resolve();
        }

        // wait for both ajax requests to complete
        // a1 and a2 are arguments resolved for the d1 and d1 ajax requests
        // each argument is an array with the following structure: [data, statusText, jqXHR]
        $.when(d1, d2).then(function (a1, a2) {
            if (a1) {
                var mhtml = a1[0];
                // append message to conversation if it is loaded
                if (_conversation === message.conversation) {

                    var $msg = $(".message[data-message=" + message.id + "]");
                    if ($msg.length) {
                        // replace existing message with new markup
                        $msg.replaceWith(mhtml);
                    } else {
                        // add new messages banner (if there isn't one already)
                        if (message.created_by.id !== weavy.context.user && !(weavy.presence.isActive() && document.hasFocus()) && $(".new-separator").length == 0) {
                            $("<div class='new-separator'>New messages</div>").appendTo(".messages");
                        }

                        // add new message to list
                        $(mhtml).appendTo(".messages");
                    }

                    // add target blank to all links in message
                    $(".message[data-message=" + message.id + "] a").attr("target", "_blank");

                    // remove old status icons
                    if (message.created_by.id === weavy.context.user) {
                        $(".message.me:not([data-message=" + message.id + "]) .status:not(.status-read)").remove();
                    }

                    scrollToBottom();
                }

                // update cached header and messages
                var cachedHeaderAndMessages = getCache("hm:" + message.conversation);
                if (cachedHeaderAndMessages != null) {
                    var $cachedHeaderAndMessages = $("<div>").append($(cachedHeaderAndMessages).clone());
                    var $cachedmsg = $cachedHeaderAndMessages.find(".message[data-message=" + message.id + "]");
                    if ($cachedmsg.length) {
                        // replace existing message with new markup
                        $cachedHeaderAndMessages.find(".message[data-message=" + message.id + "]").replaceWith(mhtml);
                    } else {
                        // add new messages banner (if there isn't one already)
                        if ($cachedHeaderAndMessages.find(".new-separator").length == 0) {
                            // add new message banner
                            $("<div class='new-separator'>New messages</div>").appendTo($cachedHeaderAndMessages.find(".messages"));
                        }

                        // add new message to list
                        $(mhtml).appendTo($cachedHeaderAndMessages.find(".messages"));
                    }

                    // add target blank to all links in message
                    $cachedHeaderAndMessages.find(".message[data-message=" + message.id + "] a").attr("target", "_blank");

                    // remove old status icons
                    if (message.created_by.id === weavy.context.user) {
                        $cachedHeaderAndMessages.find(".message.me:not([data-message=" + message.id + "]) .status:not(.status-read)").remove();
                    }

                    // update cache
                    setCache("hm:" + message.conversation, $cachedHeaderAndMessages.html());
                }

            }

            if (a2) {
                var chtml = a2[0];
                var $html = $(chtml);
                if (_conversation === message.conversation) {
                    $html.addClass("active");
                }

                var $cnv = $(".conversation[data-conversation=" + message.conversation + "]");
                var isRoom = $html.data("room");
                var listContainer = isRoom ? $("#rooms") : $("#direct");
                if (!listContainer.length) {
                    listContainer = $(".list-group-conversations");
                }
                if ($cnv.length) {
                    // move to top of list and replace with new markup
                    $cnv.prependTo(listContainer).replaceWith($html);
                } else {
                    // add new conversation to top of list
                    $(chtml).prependTo(listContainer);
                }

                // remove create links for empty containers
                if (isRoom) {
                    $("#empty-new-room").remove();
                } else {
                    $("#empty-new-message").remove();
                }

                refreshBadge();
            }

            if (insert && message.created_by.id !== weavy.context.user) {
                // show browser notification
                notify(message);
            }
        });
    }

    // display desktop notification for specified message
    function notify(message) {

        weavy.audio.play("#message-sound");

        if (window.Notification) {
            console.debug("notification permission is " + Notification.permission + " and context.notify is " + weavy.context.notify);

            if (Notification.permission === "granted" && weavy.context.notify) {
                var notification = new Notification("Message from " + (message.created_by.name || message.created_by.username), {
                    body: message.text,
                    tag: message.id,
                    // get user thumbnail (as .png since svgs are not supported in browser notifications)
                    icon: message.created_by.thumb_url.replace("{options}", "96x96-crop,both").replace(".svg", ".png")
                });

                notification.addEventListener("click", function () {
                    // trigger custom event when notifications is clicked (used in desktop apps for now)
                    var event = $.Event("browsernotification.clicked");
                    $(document).triggerHandler(event, null);

                    location.href = weavy.url.resolve("/messenger/" + message.conversation);
                    window.focus();
                    this.close();
                });

                setTimeout(notification.close.bind(notification), 10000);
            }
        } else {
            console.debug("Browser does not support notifications");
        }
    }

    // send typing indicator to server
    function sendTyping() {
        weavy.realtime.invoke("rtm", "Typing", _conversation);
    }

    // called to update gui with typing indicators
    function updateTyping() {
        if (_typingTimeout) {
            clearTimeout(_typingTimeout);
            _typingTimeout = null;
        }

        // discard typing events older than 5 seconds
        var now = Date.now();
        _typing.forEach(function (item, index) {
            if (now - item.time > 5 * 1000) {
                console.debug("user stopped typing");
                _typing.splice(index, 1);
            }
        });

        // remove old typing indicators
        $("[data-conversation]").removeClass("typing");

        if (_typing.length) {

            // group typing events by conversation
            var grouped = _.groupBy(_typing, "conversation");

            // loop over all typing events and update the gui
            for (var key in grouped) {
                var text = "";
                var names = _.map(grouped[key], function (item) {
                    console.debug("user is typing in conversation " + key);
                    return item.user.username;
                });

                for (var i = 0; i < names.length; i++) {
                    if (i > 0) {
                        if (i === (names.length - 1)) {
                            text += " and ";
                        } else {
                            text += ", ";
                        }
                    }
                    text += names[i];
                }
                if (names.length === 1) {
                    text += " is typing...";
                } else {
                    text += " are typing...";
                }

                // update gui
                $("[data-conversation=" + key + "]").addClass("typing").find(".typing-show").text(text);
            }

            // schedule another call to updateTyping in 1 second
            _typingTimeout = setTimeout(updateTyping, 1000);
        }
    }


    // refresh the gui
    function refreshConversation(refreshToRoot) {
        console.debug("refreshing ui...");

        if (typeof (refreshToRoot) !== "undefined" && refreshToRoot) {
            // load start page
            document.location.href = weavy.url.resolve("/messenger");
        } else {
            getConversation(_conversation, true, true, true);
        }
    }

    // refreash badge
    function refreshBadge() {
        var count = 0;
        if (_conversation !== -1) {
            count = $(".list-group-item.conversation.unread[data-conversation!='" + _conversation + "']").length;
        } else {
            count = $(".list-group-item.conversation.unread").length;
        }
        console.debug("badge = " + count);
        $(".badge").text(count == 0 ? "" : count.toString());
    }

    // remove new messages banner from currently active conversation (and cache)
    function removeMessagesBanner() {

        $(".new-separator").remove();

        var cachedHeaderAndMessages = getCache("hm:" + _conversation);
        if (cachedHeaderAndMessages != null) {
            var $cachedHeaderAndMessages = $("<div>").append($(cachedHeaderAndMessages).clone());
            $cachedHeaderAndMessages.find(".new-separator").remove();
            setCache("hm:" + _conversation, $cachedHeaderAndMessages.html());
        }
    }

    // refresh ui for the specified conversation
    function getConversation(id, refreshConversations, refreshMessages, refreshDetails) {

        // conversation is not set
        if (id === null) {
            return;
        }

        // update conversations (default false)
        refreshConversations = typeof (refreshConversations) !== "undefined" ? refreshConversations : false;
        if (refreshConversations) {
            // cancel previous ajax call
            if (_listXhr !== null) {
                _listXhr.abort();
            }

            _listXhr = $.ajax({
                url: weavy.url.resolve("/messenger/list/" + id),
                cache: false,
                success: function (html) {
                    $(".list-group-conversations").html(html);
                }
            });
        }

        // update messages (default true)
        refreshMessages = typeof (refreshMessages) !== "undefined" ? refreshMessages : true;
        if (refreshMessages) {
            // get html from cache
            var html = getCache("hm:" + id);



            if (html !== null) {
                // update ui with cached html
                var at = $(".conversation-title").text($(html).find(".conversation-title").text());
                $(".header-messages-partial").html(html);
                scrollToBottom();
            } else {
                $(".pane-body").addClass("loading");
            }

            if (_messagesXhr !== null) {
                // cancel previous ajax call
                _messagesXhr.abort();
            }

            // get current html markup for conversation
            _messagesXhr = $.ajax({
                url: weavy.url.resolve("/messenger/" + id),
                cache: false,
                success: function (html) {
                    // update ui with html
                    var at = $(".conversation-title").text($(html).find(".conversation-title").text());
                    $(".header-messages-partial").html(html);

                    // update cache
                    var $html = $("<div>").append($(html).clone());
                    setCache("hm:" + id, $html.html());
                    $("#main").attr("data-conversation", id);
                    scrollToBottom();
                }
            });
        }

        // update details (default false)
        refreshDetails = typeof (refreshDetails) !== "undefined" ? refreshDetails : false;
        if (refreshDetails) {
            refreshDetailsFunction(id);
        }

        // make sure footer is visible
        $("#main .pane-footer").show();

        // focus textaea
        setTextAreaFocus();
    }

    function refreshDetailsFunction(id) {
        $(".drawer-user").removeClass("drawer-visible");
        var $drawer = $(".drawer-details").addClass("drawer-visible");
        //var keep = $drawer.hasClass("drawer-visible");

        var cachedDetails = getCache("d:" + id);
        if (cachedDetails != null) {
            $drawer.html(cachedDetails);
        }

        if (_detailsXhr != null) {
            // cancel previous ajax call
            _detailsXhr.abort();
        }

        _detailsXhr = $.ajax({
            url: weavy.url.resolve("/messenger/d/" + id),
            cache: false,
            success: function (html) {
                $drawer.html(html);
                setCache("d:" + id, html);
            }
        });
    }

    function validateEmail(email) {
        var re = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        return re.test(email);
    }


    // TODO: many of the event handlers below can be hooked up before DOM READY!!!
    $(function () {



        //////////////////////////////////
        // callbacks for the real time api
        //////////////////////////////////

        // called by server to let client know the active/away status of a user
        weavy.realtime.on("presence", function (event, data) {
            if (data.status === "away") {
                $(".presence[data-user=" + data.user + "]").removeClass("active");
                $(".seen[data-user=" + data.user + "]").text("Away");
            } else {
                $(".presence[data-user=" + data.user + "]").addClass("active");
                $(".seen[data-user=" + data.user + "]").text("Active now");
            }
        });

        // called by server to let client know about typing events
        weavy.realtime.on("typing", function (event, data) {
            // track time when we received this event
            data.time = Date.now();

            // remove existing typing events by this user (can only type in one conversation at a time)
            _typing.forEach(function (item, index) {
                if (item.user.id === data.user.id) {
                    _typing.splice(index, 1);
                }
            });

            // push current event to the list of all people typing
            _typing.push(data);

            // finally update gui
            updateTyping();
        });

        // called by server to let client know about new messages
        weavy.realtime.on("message", function (event, message) {

            console.debug("received message " + message.id);

            if (message.created_by.id !== weavy.context.user) {
                if (_conversation === message.conversation && weavy.presence.isActive() && document.hasFocus()) {
                    // mark conversation as read (also tells server that message was delivered)
                    console.debug("marking conversation " + message.conversation + " as read");
                    $.post(weavy.url.resolve("/api/messenger/" + message.conversation + "/read"));
                } else {
                    // let server know that we received the message
                    console.debug("marking message " + message.id + " as delivered");
                    $.post(weavy.url.resolve("/api/messenger/" + message.id + "/delivered"));
                }
            }

            // remove typing indicator for message creator
            _typing.forEach(function (item, index) {
                if (item.user.id === message.created_by.id) {
                    console.debug("user stopped typing (got new message)");
                    _typing.splice(index, 1);
                }
            });
            updateTyping();

            // update gui with new message
            messageUpserted(message, true);
        });

        // called by server to let client know that a message was delivered
        weavy.realtime.on("messagedelivered", function (event, data) {
            console.debug("message " + data.message.id + " in conversation " + data.message.conversation + " was delivered");
            messageUpserted(data.message, false);
        });

        // called by server to let client know that a conversation was marked as read/unread
        weavy.realtime.on("conversationread", function (event, data) {
            console.debug("conversation " + data.conversation.id + " was " + (data.conversation.is_read ? "read" : "unread"));
            if (data.user.id === weavy.context.user) {
                if (data.conversation.is_read) {
                    ui_read(data.conversation.id);
                } else {
                    ui_unread(data.conversation.id);
                }
            } else {

                if (_conversation !== data.conversation.id) {
                    return;
                }

                // find last message by current user
                var $last = $(".message.me").last();
                if (!$last.length) {
                    // return early
                    return;
                }

                // get new markup for last message
                var id = $last.data("message");

                if (!isNaN(id)) {
                    $.get(weavy.url.resolve("/messenger/m/" + id), function (html) {
                        // update last message
                        $last.replaceWith(html);
                        // remove previous read marker
                        $(".message.me:not([data-message=" + id + "]) .status-read [data-user=" + data.user.id + "]").remove();
                        // scroll to bottom
                        scrollToBottom(false, 1);
                    });
                }
            }
        });

        /////////////////////
        // misc event handlers etc
        /////////////////////

        // handle the back and forward buttons
        $(window).bind('popstate', function (event) {
            if (weavy.browser.mobile) {
                return;
            }

            var state = event.originalEvent.state;

            if (state && state.Id) {
                set(state.Id);
            } else {
                refreshConversation(true);
            }
        });

        $(window).bind("focus", function () {
            if (_conversation !== -1 && $(".new-separator").length > 0) {
                // mark conversation as read
                read(_conversation);
            }
        });

        // update room name
        $(document).on("change", ".edit-room-form input", function (evt) {
            $(".edit-room-form").submit();
        });

        // toggle panes
        $(document).on("click", "[data-toggle=pane-one]", function (evt) {
            evt.preventDefault();
            // NOTE: clear conversation on mobile to make sure messages in conversations are marked as unread
            if (_conversation !== -1) {
                $(".list-group-item.conversation.unread[data-conversation='" + _conversation + "']").removeClass("unread");
            }

            _conversation = -1;

            // remove new messages banner when toggling pane-one
            removeMessagesBanner();

            $(".app").removeClass("two three").addClass("one");
            pushState("", "");
        });

        // set active conversation
        $(document).on("click", ".list-group-conversations .conversation", function (evt) {
            evt.preventDefault();
            var id = Number($(this).data("conversation"));
            set(id);
        });

        // toggle drawers
        $(document).on("click", "[data-toggle=drawer-invite]", function (evt) {
            if (!weavy.browser.embedded) {
                evt.preventDefault();
                var drawer = "." + $(this).data("toggle");
                $(drawer).toggleClass("drawer-visible");
            } else {
                evt.preventDefault();
                var url = weavy.url.resolve($(this).attr("href"));
                window.parent.postMessage({ "name": "personal", "url": url }, "*");
            }
        });

        $(document).on("click", "[data-toggle=drawer-settings]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("toggle");
            $(drawer).toggleClass("drawer-visible");
        });

        $(document).on("click", "[data-toggle=drawer-room-name]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("toggle");
            $(drawer).toggleClass("drawer-visible");
        });

        $(document).on("keypress", ".room-form input", function (evt) {
            if (evt.which === 13) {
                $("[data-toggle=drawer-select-people]").first().trigger("click");
                return false;
            }
        });

        $(document).on("click", "[data-toggle=drawer-select-people]", function (evt) {
            evt.preventDefault();
            var $drawer = $("." + $(this).data("toggle"));

            var $room = $(".drawer-room-name");
            if ($room.hasClass("drawer-visible")) {
                // check that room name is not empty
                var $input = $room.find("input[name='name']");
                if ($input.val() === "") {
                    $input.addClass("is-invalid");
                    return false;
                } else {
                    $input.removeClass("is-invalid");
                    $drawer.toggleClass("drawer-visible");
                    if ($drawer.hasClass("drawer-visible")) {
                        $.get(weavy.url.resolve("/messenger/drawer/room/members"), function (html) {
                            $(".drawer-body", $drawer).html(html);
                        });
                    }
                }
            } else {
                $drawer.toggleClass("drawer-visible");
            }
        });

        $(document).on("click", "[data-toggle=drawer-message]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("toggle");
            var $drawer = $(drawer).toggleClass("drawer-visible");
            if ($drawer.hasClass("drawer-visible")) {
                $.get(weavy.url.resolve("/messenger/drawer/message"), function (html) {
                    $(drawer + " .drawer-body").html(html);
                });
            }
        });

        // search conversations
        $(document).on("input", ".search-conversations input[name=q]", function (evt) {
            evt.preventDefault();
            var query = $(this).val();
            var $context = $(this).closest(".search-conversations");
            var archive = $("input[name=archive]", $context).val();

            if (query.length > 0) {
                $(".btn-reset", $context).removeClass("d-none");
                $(".btn-search", $context).addClass("d-none");

                // get search result
                $.get(weavy.url.resolve("/messenger/search/?q=" + query + "&search_archived=" + archive), function (html) {
                    $(".list-group-conversations").hide();
                    $(".search-result-list").html(html).show();
                });

            } else {
                $(".btn-reset", $context).addClass("d-none");
                $(".btn-search", $context).removeClass("d-none");
                $(".list-group-conversations").show();
                $(".search-result-list").hide().empty();
            }
        });

        // click on reset search button
        $(document).on("click", ".search-conversations .btn-reset", function (e) {
            var $context = $(this).closest(".search-conversations");
            $("input[name=q]", $context).val("").trigger("input");
        });

        // ESC in search field
        $(document).on("keydown", ".search-conversations input[name=q]", function (e) {
            if (e.which == 27) {
                $(this).val("").trigger("input");
            }
        });

        // search user for new message
        $(document).on("input", ".search-user input[name=q]", function (evt) {
            evt.preventDefault();
            var $context = $(this).closest(".search-user");
            var query = $(this).val();
            if (query.length > 0) {
                $(".btn-reset", $context).removeClass("d-none");
                $(".btn-search", $context).addClass("d-none");
            } else {
                $(".btn-reset", $context).addClass("d-none");
                $(".btn-search", $context).removeClass("d-none");
            }

            // get search result
            var $context = $(this).closest(".drawer-body");
            $.get(weavy.url.resolve("/messenger/drawer/message?q=" + query), function (html) {
                $(".list-group", $context).html(html);
            });
        });

        // click on reset search button
        $(document).on("click", ".search-user .btn-reset", function (e) {
            var $context = $(this).closest(".search-user");
            $("input[name=q]", $context).val("").trigger("input");
        });

        // ESC in search field
        $(document).on("keydown", ".search-user input[name=q]", function (e) {
            if (e.which == 27) {
                $(this).val("").trigger("input");
            }
        });

        // search users for room
        $(document).on("input", ".search-users input[name=q]", function (evt) {
            evt.preventDefault();
            var $context = $(this).closest(".search-users");
            var data = $("input", $context).serialize();

            var query = $(this).val();
            if (query.length > 0) {
                $(".btn-reset", $context).removeClass("d-none");
                $(".btn-search", $context).addClass("d-none");
            } else {
                $(".btn-reset", $context).addClass("d-none");
                $(".btn-search", $context).removeClass("d-none");
            }

            // get search result
            var $context = $(this).closest(".drawer-body");
            $.get(weavy.url.resolve("/messenger/drawer/room/members?" + data), function (html) {
                $(".list-group", $context).html(html);
            });

        });

        // click on reset search button
        $(document).on("click", ".search-users .btn-reset", function (e) {
            var $context = $(this).closest(".search-users");
            $("input[name=q]", $context).val("").trigger("input");
        });

        // ESC in search field
        $(document).on("keydown", ".search-users input[name=q]", function (e) {
            if (e.which == 27) {
                $(this).val("").trigger("input");
            }
        });

        // add user to new room
        $(document).on("click", ".drawer-select-people [data-user]", function (evt) {
            evt.preventDefault();
            var $context = $(this).closest(".drawer-body");

            var $form = $(".search-users", $context);
            var id = $(this).data("user");

            var $selected = $("input[name=users][value=" + id + "]", $form);
            if ($selected.length) {
                $selected.remove();
                $(this).removeClass("selected");
            } else {
                $selected = $("<input type='hidden' name='users' value='" + id + "' />");
                $form.append($selected);
                $(this).addClass("selected");
            }

            var $selected = $("input[name=users]", $form);
            if ($selected.length) {
                $form.find(":submit").removeAttr("disabled");
            } else {
                $form.find(":submit").attr("disabled", "");
            }
        });

        // add user to existing room
        $(document).on("click", ".drawer-add-people [data-user]", function (evt) {
            evt.preventDefault();

            var data = {
                id: _conversation,
                users: [$(this).data("user")]
            };

            $.ajax({
                contentType: "application/json",
                method: "POST",
                url: weavy.url.resolve("/api/conversations/members"),
                data: JSON.stringify(data)
            }).done(function (data, status, xhr) {
                // refresh details pane
                getConversation(_conversation, false, false, true);

                // close drawer
                $(".drawer-add-people").removeClass("drawer-visible");
            });
        });

        // remove user from a room
        $(document).on("click", "[data-remove-user]", function (evt) {
            evt.preventDefault();
            var id = $(this).data("remove-user");

            $(this).closest("tr").remove();
            $.ajax({
                contentType: "application/json",
                method: "DELETE",
                url: weavy.url.resolve("/api/conversations/" + _conversation + "/member/" + id)
            }).fail(function (xhr, status, error) {
                console.error(error);
            });
        });

        $(document).on("click", "[data-toggle=drawer-archive]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("toggle");
            var $drawer = $(drawer).toggleClass("drawer-visible");
            if ($drawer.hasClass("drawer-visible")) {
                $.get(weavy.url.resolve("/messenger/drawer/archive"), function (html) {
                    $(drawer + " .drawer-body").html(html);
                });
            }
        });

        $(document).on("click", "[data-toggle=drawer-details]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("toggle");
            $(drawer).toggleClass("drawer-visible");

            if ($(".app").hasClass("three")) {
                $(".app").removeClass("three").addClass("two");
            } else {
                $(".app").addClass("three").removeClass("two");
            }
        });

        $(document).on("click", "[data-show=drawer-details]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("show");
            $(drawer).addClass("drawer-visible");
            $(".app").addClass("three").removeClass("two");
            refreshDetailsFunction(_conversation);
        });

        $(document).on("click", "[data-profile]", function (evt) {
            evt.preventDefault();
            var id = $(this).data("profile");

            $app = $(".app");
            _activePane = $app.attr("class").replace("app ", "").trim();

            // hide details panel if visible
            $(".drawer-details").removeClass("drawer-visible");
            var $drawer = $(".drawer-user").addClass("drawer-visible");

            var cachedDetails = getCache("u:" + id);
            if (cachedDetails != null) {
                $drawer.html(cachedDetails);
            }

            if (_detailsXhr != null) {
                _detailsXhr.abort();
            }

            _detailsXhr = $.ajax({
                url: weavy.url.resolve("/messenger/u/" + id),
                cache: false,
                success: function (html) {
                    $drawer.html(html);
                    setCache("u:" + id, html);
                }
            });

            $app.removeClass("one two").addClass("three");
        });

        $(document).on("click", "[data-hide=drawer-details]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("hide");

            if (_activePane == "three") {
                // back to details
                refreshDetailsFunction(_conversation);
                _activePane = "";
            } else if (_activePane !== "") {
                $(drawer).removeClass("drawer-visible");
                $(".app").removeClass("one two three").addClass(_activePane);
                _activePane = "";
            } else {
                $(drawer).removeClass("drawer-visible");
                $(".app").removeClass("three").addClass("two");
            }
        });

        $(document).on("click", "[data-hide=drawer-user]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("hide");

            if (_activePane == "three") {
                // back to details
                refreshDetailsFunction(_conversation);
                _activePane = "";
            } else if (_activePane !== "") {
                $(drawer).removeClass("drawer-visible");
                $(".app").removeClass("one two three").addClass(_activePane);
                _activePane = "";
            } else {
                $(drawer).removeClass("drawer-visible");
                $(".app").removeClass("three").addClass("two");
            }
        });

        $(document).on("click", "[data-toggle=drawer-add-people]", function (evt) {
            evt.preventDefault();
            var drawer = "." + $(this).data("toggle");
            var $drawer = $(drawer).toggleClass("drawer-visible");

            if ($drawer.hasClass("drawer-visible")) {
                $.get(weavy.url.resolve("/messenger/drawer/room/members"), function (html) {
                    $(drawer + " .drawer-body").html(html);
                });
            }
        });

        // expand/collapse rooms
        $(document).on("click", "[data-expand=rooms]", function (evt) {
            evt.preventDefault();
            var $rooms = $(".rooms");
            if ($rooms.hasClass("expanded")) {
                $rooms.removeClass("expanded");
                $(this).attr("title", "Expand rooms");
            } else {
                $rooms.addClass("expanded");
                $(this).attr("title", "Collapse rooms");
            }
        });

        // archive conversation
        $(document).on("click", "[data-archive]", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var id = $(this).data("archive");
            archive(id);
        });

        // unarchive conversation
        $(document).on("click", "[data-unarchive]", function (evt) {
            evt.preventDefault();
            var id = $(this).data("unarchive");
            unarchive(id);
        });

        // set conversation as read
        $(document).on("click", "[data-read]", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var id = $(this).data("read");
            read(id);
        });

        // set conversation as unread
        $(document).on("click", "[data-unread]", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var id = $(this).data("unread");
            unread(id);
        });

        // leave conversation
        $(document).on("click", "[data-leave]", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var id = $(this).data("leave");
            leave(id);
        });

        // fetch more messages
        $(document).on("click", "a.loader", function (evt) {
            evt.preventDefault();
            var $loader = $(this);

            // get first msg
            var firstmsg = $('.message:first');

            // get current position
            var $body = $(".pane-two .scroll-y");
            var offset = firstmsg.offset().top - $body.scrollTop();

            // load more messages
            $.get(this.href, function (html) {

                // add new messages after loader
                $loader.after(html);

                // update loader
                var $x = $("a.loader:last").remove();
                if ($x.length) {
                    $loader[0].href = $x[0].href;
                }

                // offset to previous first message minus original offset/scroll
                $body.scrollTop(firstmsg.offset().top - offset);

            });
        });

        // submit message
        $(document).on("submit", ".message-form", function (evt) {
            evt.preventDefault();
            var $form = $(this);

            // disable button to prevent double posts
            var $submit = $form.find("button[type='submit']").attr("disabled", true);

            // serialize form to json
            var data = $form.serializeObject(true);

            // make sure blobs is an array
            if (data.blobs) {
                if (!$.isArray(data.blobs)) {
                    var id = data.blobs;
                    data.blobs = [];
                    data.blobs[0] = id;
                }
            }

            $.ajax({
                contentType: "application/json",
                type: "POST",
                url: weavy.url.resolve("/api/messenger/" + _conversation),
                data: JSON.stringify(data),
                beforeSend: function (xhr, settings) {

                    if ((data.text && data.text.length) || (data.blobs && data.blobs.length)) {
                        console.debug("sending message");

                        // append sending message
                        var html = Handlebars.templates["message-sending"](data);

                        $(".messages .status").remove();
                        $(html).appendTo(".messages");

                        // reset form
                        $form[0].reset();

                        // scroll 
                        scrollToBottom();
                    } else {
                        // empty message
                        console.warn("message cannot be empty");
                        return false;
                    }
                }
            }).done(function (data, status, xhr) {
                // replace message-sending with message-sent 
                var html = Handlebars.templates["message-sent"](data);
                $(".message.sending").replaceWith(html);

                $form.find("#contextUrl").attr("disabled", true);
                $form.find("input[name=hasContext]").val(false);
                $form.find(".context").removeClass("has-context");

                var $context = $form.find("div.context");
                $context.find(".context-data").fadeOut(200);
                $context.slideUp(200);
            }).fail(function (xhr, status, error) {
                // REVIEW: update message to indicate that send failed?
                // REVIEW: add button/link for re-sending the failed message?
                console.error(error);
            }).always(function (xhr, status) {
                // focus and enable button again
                setTextAreaFocus();
                $submit.attr("disabled", false);
            });
        });

        // reset form
        $(document).on("reset", ".message-form", function () {
            $(".table-uploads tr").remove();

            // Clear text
            if (_emojiarea) {
                _emojiarea.setText("");
            }
        });

        // remove uploaded file before submit
        $(document).on("click", ".table-uploads [data-remove]", function (evt) {
            evt.preventDefault();
            var $file = $(this).closest("tr").remove();
        });

        // update user settings
        $(document).on("change", ".drawer-settings select", function () {
            saveSettings(true);
        });
        $(document).on("click", ".drawer-settings input[type=checkbox]", function () {
            var refresh = $(this).attr("name") === "GroupConversations";
            saveSettings(refresh);
        });

        // handle context
        $(document).on("click", ".context .remove-context", function (e) {
            e.preventDefault();
            var $form = $(this).closest(".message-form");
            $form.find("#contextUrl").attr("disabled", true);
            $form.find("input[name=hasContext]").val(false);
            $form.find(".context").removeClass("has-context");

            var $context = $(this).closest("div.context");
            $context.find(".context-data").fadeOut(200);
            $context.slideUp(200);            
            
        });

        $(document).on("click", "button.btn-add-context", function (e) {
            var $form = $(this).closest(".message-form");
            $form.find("input[name=hasContext]").val(true);
            $form.find("#contextUrl").attr("disabled", false);
            $form.find(".context").addClass("has-context");

            var $context = $form.find("div.context");            
            $context.find(".context-data").fadeIn(200);
            $context.slideDown(200);                        
        })

        // load conversation from widget
        window.addEventListener("message", onMessageReceived, false);

        // responds to messages sent from outer frame
        function onMessageReceived(e) {
            if (e.data.name === "openConversation") {
                if (e.data.id) {
                    // set active conversation
                    set(e.data.id);
                } else {
                    // back to all conversations
                    $("[data-toggle=pane-one]").trigger("click");
                }
            }
        }

        //////////////////////
        // Start up everything
        //////////////////////

        // set current conversation
        _conversation = parseInt($("main").data("conversation")) || -1;

        // ...but not on smaller screens
        if (!$(".pane.pane-two").is(":visible")) {
            _conversation = -1;
        }

        // toggling desktop notifications
        if (window.Notification) {

            if (window.Notification.permission === "denied") {
                $(".alert.notification-denied").show();
                $("input[name=DesktopNotifications]")[0].checked = false;
            } else if (window.Notification.permission === "default") {
                $("input[name=DesktopNotifications]")[0].checked = false;
            }

            $(document).on("change", "input[name=DesktopNotifications]", function (evt) {
                if ($(this).is(":checked") && window.Notification.permission === "default") {
                    $(".alert.notification-required").show();
                    $(".notification-required").trigger("click");
                }
            });

            $(document).on("click", ".notification-required", function (evt) {
                evt.preventDefault();
                window.Notification.requestPermission(function (result) {
                    if (result === "granted") {
                        $(".notification-alerts .alert").hide();
                    } else if (result === "denied") {
                        $(".alert.notification-required").hide();
                        $(".alert.notification-denied").show();
                    } else if (result === "default") {
                        // do nothing
                    }
                });
            });

        } else if (weavy.browser.mobile) {
            // hide checkbox if on mobile
            $(".notification-setting").remove();
            $(".notification-alerts").hide();
        } else {
            $(".alert.notification-missing").show();
        }

        // Preconfigure textarea
        emojiAreaEditorHeight = 0;

        emojione.imagePathSVG = weavy.url.resolve("/img/eo/");
        emojione.imageType = "svg";


        // Initialize the textarea
        $textarea = $(".message-form textarea").emojioneArea({
            attributes: {
                dir: "ltr",
                spellcheck: true,
                autocomplete: "on",
                autocorrect: "on",
                autocapitalize: "on"
            },
            buttonTitle: "Insert emoji", // title of emojionearea smiley button
            placeholder: null,
            pickerPosition: "top",
            container: null, // by default, emojionearea container created directly under source, in this option you can specify custom {jQuery|selector} container
            tones: true, // whether to show the skin tone buttons in Emoji picker
            tonesStyle: "bullet", // style of skin tones selector [ bullet | radio | square | checkbox ]
            hideSource: true,  // hide source element after binding
            autoHideFilters: false, // auto hide filters panel
            sprite: true, // use sprite instead of images, is awesome, but not works in old browsers
            shortnames: true, // if true - will converts emojis to short names, by default converts emojis to unicode characters
            standalone: false, // whether to use standalone EmojiOneArea picker (for EmojiOneArea 2.1 only)
            useInternalCDN: false,
            recentEmojis: true, // whether to show recently select Emoji's in picker
            shortcuts: false,
            textcomplete: {
                maxCount: 5,
                placement: "top"
            },
            events: {
                // send typing on keypress, but not more often than every 3 seconds
                keydown: _.throttle(sendTyping, 3000, {
                    trailing: false
                }),
                "button.click": function () {
                    scrollToBottom(false);
                },
                keyup: function (editor, evt) {
                    if (editor.height() !== emojiAreaEditorHeight) {
                        scrollToBottom(false);
                        emojiAreaEditorHeight = editor.height();
                    }
                },
                keypress: function (editor, evt) {
                    var key = evt.which || evt.keyCode;
                    if ((evt.ctrlKey && (key === 10 || key === 13)) || (weavy.context.enter && (key === 10 || key === 13) && !evt.shiftKey && !weavy.browser.mobile)) {
                        evt.preventDefault();
                        editor.blur();
                        var $form = $(editor).closest("form");
                        $form.submit();
                    }
                },
                "picker.show": function (picker, evt) {
                    $(picker).parent().css("flex-basis", "100%");
                },
                "picker.hide": function (picker, evt) {
                    $(picker).parent().css("flex-basis", "auto")
                    // by default the eomojionearea picker waits 500ms to add the .hidden class, we override that here to avoid the delay
                    $(".emojionearea-picker").addClass("hidden");
                }
            }
        });

        // Custom textarea configuration
        if ($textarea[0] !== null && typeof ($textarea[0]) !== 'undefined') {

            $textarea.removeAttr("disabled");

            _emojiarea = $textarea[0].emojioneArea;

            // Move the button
            $("#emojionearea-button-container").empty().append(_emojiarea.button);

            // Hide on escape
            _emojiarea.on("keydown", function (editor, evt) {
                var key = evt.which || evt.keyCode;
                if (key === 27) {
                    evt.preventDefault();
                    if (_emojiarea.button.is(".active")) {
                        _emojiarea.hidePicker();
                    }
                }
            });

            // Prepare the area for textcompletes
            _emojiarea.editor.data({
                quicklinks: true,
                mentions: true
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
                        var html = '<img class="img-24 avatar mr-1" src="' + weavy.url.thumb(item.thumb_url, "48x48-crop,both") + '" alt="" /><span>' + (item.name || item.username);
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
                        return Handlebars.templates["suggest-template"](item);
                    },
                    replace: function (item) {
                        return "[" + item.title + "](" + item.url + ") ";
                    },
                    cache: false
                }], {
                        maxCount: 10, zIndex: 10000, placement: "top"
                    });
            }

            // Prevent emojiarea from losing focus when clicking send
            // NOTE: listening on mousedown caused a double submit
            $(".message-form button[type='submit']")[0].addEventListener("click", function (e) {
                e.preventDefault();
                $textarea.val(_emojiarea.getText());
                $(".message-form").submit();
            }, true);

            // Focus after init
            setTextAreaFocus();
        }

        // scroll conversation to bottom
        scrollToBottom();

        // fix all links in messages
        $(".message a").attr("target", "_blank");

        // configure file uploads
        $("#main").fileupload({
            url: weavy.url.resolve("/api/blobs"),
            dataType: "json",
            paramName: "blobs",
            singleFileUploads: false,
            add: function (e, data) {
                // TODO: add logic here to prevent upload of certain files?
                data.submit();
            },
            start: function (e) {
                console.debug("starting upload");
                // disable submit button while upload in progress
                $(".message-form button[type=submit]").attr("disabled", true);
            },
            progressall: function (e, data) {
                // update progress bar
                var percentage = parseInt(data.loaded / data.total * 100, 10);
                $(".message-form .progress").css("width", percentage + "%").show();
            },
            done: function (e, data) {
                var html = Handlebars.templates["fileuploads"](data.result);
                $(".table-uploads").append(html);
            },
            fail: function (e, data) {
                console.error(e);
            },
            always: function (e, data) {
                console.debug("upload finished");
                // reset and hide progress bar
                $(".message-form .progress").css("width", "0%").hide();
                // enable submit button
                $(".message-form button[type=submit]").attr("disabled", false);
                scrollToBottom(false);
            }
        });
    });

    return {
        archive: archive,
        read: read,
        set: set,
        unarchive: unarchive,
        unread: unread,
        refresh: refreshConversation
    };
})($);

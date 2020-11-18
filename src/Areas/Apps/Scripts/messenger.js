/* global Turbolinks */
var wvy = wvy || {};
wvy.messenger = (function ($) {

    ////////// Settings //////////

    // prevent browser from automatically restoring scroll position on back, forward, reload
    window.history.scrollRestoration = "manual";

    // override textcomplete z-index
    if ($.fn.textcomplete.Completer) {
        $.fn.textcomplete.Completer.defaults.zIndex = 1021;
    }

    ////////// Variables //////////

    // route prefix for messenger 
    var _prefix = "/messenger";

    // id of currently selected conversation
    var _id = -1;

    // id of user that should be displayed in profile modal
    var _uid = null;

    // people typing
    var _typing = [];
    var _typingTimeout;

    // body scroll positions for body.one and body.two
    var _b1 = null;
    var _b2 = null;

    // scroll position for #conversations
    var _p1 = null;

    // ajax request for live search
    var _searchxhr = null;

    // timer for displaying search spinner with a small delay
    var _searchtimer = null;

    // the text area (actually emojionearea)
    var _textarea = null;

    // regular infinite scroll
    var nextObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // start spinner
                var $target = $(entry.target);
                var $spinner = $target.find(".spinner:not(.spin)").addClass("spin");
                if ($spinner.length) {
                    // fetch next page of data
                    var url = $target.data("next");
                    $.get({ url: url, cache: false }, function (html) {
                        // insert new data
                        $target.before(html);

                        // stop spinner
                        $spinner.removeClass("spin");

                        // remove the injected, and update the observered .loader
                        var $next = $target.parent().find(".loader[data-next]:first").remove();
                        if ($next.length) {
                            $target.data("next", $next.data("next"));
                        }

                    });
                }
            }
        });
    }, { threshold: 0 });

    // inverted infinite scroll (e.g. for messages)
    var prevObserver = new IntersectionObserver(function (entries, observer) {
        var entry = entries[0];
        if (entry.isIntersecting) {
            // start spinner
            var $target = $(entry.target);
            var $spinner = $target.find(".spinner:not(.spin)").addClass("spin");
            if ($spinner.length) {

                // fetch next page of data
                var url = $target.data("prev");

                // find first child (that is not .spinner or .loader)
                var $parent = $target.parent();
                var child = $parent.find("> :not(.spinner):not(.loader)")[0];
                var offset = child.offsetTop;

                // load more messages
                $.get({ url: url, cache: false }, function (html) {
                    // insert new data
                    $target.after(html);

                    // stop spinner
                    $spinner.removeClass("spin");

                    // remove the injected, and update the observered .loader
                    var $prev = $target.parent().find(".loader[data-prev]:last").remove();
                    if ($prev.length) {
                        $target.data("prev", $prev.data("prev"));
                    }

                    // scroll parent so that first child remains in the same position as before
                    // NOTE: when this is called via observer we need to requestAnimationFrame, otherwise scrolling happens to fast (before the DOM has been updated)
                    window.requestAnimationFrame(function (timestamp) {
                        var parent = getScrollParent(child);
                        parent.scrollTop = child.offsetTop - offset;
                    });
                });
            }
        }
    }, { threshold: 0 });

    // Convert base64 encoded data to Blob 
    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    function initTextarea() {
        var typing;

        // enable fieldset
        var $fieldset = $(".message-form fieldset").prop("disabled", false);

        // upgrade textarea to emojionearea
        var $textarea = $("textarea", $fieldset);
        if ($textarea.length) {
            $textarea = $textarea.emojioneArea({
                attributes: {
                    dir: "ltr",
                    spellcheck: true,
                    autocomplete: "on",
                    autocorrect: "on",
                    autocapitalize: "on"
                },
                buttonTitle: wvy.t("Insert emoji"),
                container: null,
                imageType: "svg",
                pickerPosition: "top",
                searchPlaceholder: wvy.t("Search..."),
                shortcuts: false,
                textcomplete: {
                    maxCount: 5,
                    placement: "top"
                },
                tones: true,
                tonesStyle: "bullet",
                useInternalCDN: false,
                events: {
                    // hide emoji picker on ESC
                    keydown: function (editor, evt) {
                        var key = evt.which || evt.keyCode;
                        if (key === 27) {
                            if (_textarea) {
                                evt.preventDefault();
                                _textarea.hidePicker();
                            }
                        }
                    },
                    // submit on enter or ctrl+enter depending on settings
                    keypress: function (editor, evt) {
                        var key = evt.which || evt.keyCode;
                        if ((key === 10 || key === 13) && !evt.shiftKey && !wvy.browser.mobile) {
                            if (wvy.settings.enter || evt.ctrlKey) {
                                evt.preventDefault();
                                editor.blur(); // blur to update underlying textarea
                                $(editor).closest("form").submit();
                            }
                        }
                    },
                    // save message form and send typing event on keypress (throttled to avoid sending every keypress)
                    keyup: function () {
                        typing = typing || _.throttle(function () {
                            $.post({ url: wvy.url.resolve(_prefix + "/c/" + _id + "/typing") });
                        }, 3000, { trailing: false })

                        typing();
                        saveMessageForm(false);
                    },
                    // configure autocomplete for @mentions
                    ready: function (editor, evt) {
                        editor.textcomplete([{
                            match: /\B@([a-zA-Z0-9_]+)$/,
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
                                        var html = '<img class="img-24 avatar mr-1" src="' + wvy.url.thumb(item.thumb, "48") + '" alt="" /><span>' + (item.name || item.username);
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
                                        return '@' + mention.username + " ";
                                    },
                                    cache: false
                                }]);
                            }
                        }
                    });

            // get the textarea (which is now an emojionearea)
            _textarea = $textarea[0].emojioneArea;

                    // handle pasted image
                    _textarea.on("pasteImage", function (editor, data, html) {
                        var file = data.dataURL;
                        var block = file.split(";");
                        // get the content type of the image
                        var contentType = block[0].split(":")[1];// In this case "image/gif"
                        // get the real base64 content of the file
                        var realData = block[1].split(",")[1];// In this case "R0lGODlhPQBEAPeoAJosM...."
                        // convert it to a blob to upload
                        var blob = b64toBlob(realData, contentType);
                        var fileOfBlob = new File([blob], data.name, { type: contentType });
                        wvy.fileupload.uploadBlobs([].concat(fileOfBlob), $(".message-form input[type=file]"));
                    });
                    // restore pending message
                    restoreMessageForm();
                }
            }

    ////////// Document events //////////

    document.addEventListener("turbolinks:visit", function (e) {
        //console.debug(e.type, e.data.url);


        if (document.body.classList.contains("sending")) {
            clearMessageForm();
        } else {

            // save pending message
            saveMessageForm(true);

            // reset current conversation
            _id = -1;
            _textarea = null;

            // display spinner etc.
            if (wvy.browser.mobile && e.target.location.pathname === _prefix) {
                // REVIEW: det blir fortfarande konstigt när man swipar back....
                // except when when swiping right to go back in mobile since this gives a blank screen on ios
            } else {
                // add loading class to show spinner (unless reloading after reconnect)
                if (!document.body.classList.contains("reloading")) {
                    document.body.classList.add("loading");
                }

                // disable links, info button and textarea while loading
                var $h = $("#main .pane-header");
                $h.find("a").removeAttr("href")
                $h.find("[data-toggle=modal]").prop("disabled", true);
                $(".form-container").prop("disabled", true);
                $(".emojionearea-editor").prop("contenteditable", false);
            }
        }

    });
    
    document.addEventListener("turbolinks:render", function (e) {
        //console.debug(e.type);

        // restore scroll position
        restoreScroll();
    }, true);


    document.addEventListener("turbolinks:load", function (e) {
        //if (e.data.timing.visitEnd) {
        //    console.log(e.type, e.data.url, (e.data.timing.visitEnd - e.data.timing.visitStart) + "ms");
        //} else {
        //    console.log(e.type, e.data.url);
        //}

        var $main = $("#main");
        if ($main.length) {
            // set current conversation
            _id = Number($main.data("id")) || -1;
            console.debug("conversation " + _id + " was loaded");

            setTimeout(initTextarea, 0);
        }

        // remove sending and loading classes
        document.body.classList.remove("sending", "loading");

        // scroll to bottom of messages
        scrollToBottomOfMessages();

        // observe intersection, resize etc.
        var el = document.querySelector(".loader[data-next]")
        if (el) {
            nextObserver.observe(el);
        }
        el = document.querySelector(".loader[data-prev]")
        if (el) {
            prevObserver.observe(el);
        }

        // show/hide correct dektop notification message
        if (window.Notification) {
            if (window.Notification.permission === "denied") {
                $(".notification-denied").removeClass("d-none");
            } else if (window.Notification.permission === "default" && $("input[name=DesktopNotifications]").is(":checked")) {
                $(".notification-required").removeClass("d-none");
            }
        } else {
            $(".notification-missing").removeClass("d-none")
        }

    });

    window.addEventListener("beforeunload", function (e) {
        // save form before unload to avoid losing data
        saveMessageForm(true);
    });

    window.addEventListener("message", function (e) {
        
        switch (e.data.name) {
            case "zoom-signed-in":                                                
                recreateMeeting("zoom");
                break;

            case "teams-signed-in":                                
                recreateMeeting("teams");
                break;
        }        
    })

    ////////// DOM events //////////

    // add meeting
    $(document).on("click", ".btn-add-meeting", function () {
        var provider = $(this).data("provider");
        createMeeting(provider);
        
    });

    function createMeeting(provider) {
        // check if already added
        if ($("[data-meeting-provider='" + provider + "']").length > 0) {
            return false;
        }

        var qs = "?provider=" + provider + "&id=" + _id;
        $.get(wvy.url.resolve(_prefix + "/meeting" + qs), function (html) {
            $(".table-meetings").append(html);

            saveMessageForm(false);
        });
    }

    function recreateMeeting(provider) {
        removeMeeting($("[data-meeting-provider='" + provider + "']"));
        createMeeting(provider);
    }
        
    // various click actions
    $(document).on("click", ".btnZoomAuthentication", function (e) {
        e.preventDefault();
        
        var zoomAuthUrl = wvy.config.zoomAuthUrl + "&state=" + _id;
        
        if (!wvy.browser.mobile) {
            window.open(zoomAuthUrl,
                "zoomAuthWin",
                "height=640,width=480");
        } else {
            clearMeetings();
            location.href = zoomAuthUrl;
        }
        
    });

    $(document).on("click", ".btnTeamsAuthentication", function (e) {
        e.preventDefault();

        var teamsAuthUrl = wvy.config.teamsAuthUrl + "&state=" + _id;
        
        if (!wvy.browser.mobile) {
            window.open(teamsAuthUrl,
                "teamsAuthWin",
                "height=640,width=480");
        } else {
            clearMeetings();
            location.href = teamsAuthUrl;
        }
    });

    // sign out from meeting providers
    $(document).on("click", "[data-meeting-sign-out]", function () {
        var provider = $(this).data("meeting-sign-out");
        var qs = "?provider=" + provider + "&conversationId=" + _id;
        $.post(wvy.url.resolve("/a/meetings/sign-out" + qs), function (response) {            
            clearMeetings(provider);
        });
    });

    $(document).on("click", "[data-action]", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // close dropdown
        if (this.classList.contains("dropdown-item")) {
            $(this).closest(".dropdown-menu").siblings(".dropdown-toggle").dropdown("toggle");
        }

        var action = this.dataset.action;
        switch (action) {
            //case "archive":
            //    // TODO: 
            //    break;
            case "leave":
                leave(this.dataset.id);
                break;
            case "edit":
                $(".edit-form").addClass("edit").find("input").focus();
                break;
            case "add-people":
                $("#add-people-modal").modal();
                break;
            case "load":
                load(this.dataset.id);
                break;
            case "pin":
                pin(this.dataset.id, true);
                break;
            case "read":
                read(this.dataset.id, true);
                break;
            case "remove-blob":
                removeBlob(this.dataset.id);
                break;
            case "remove-meeting":
                removeMeeting(this);
                break;
            case "remove-member":
                removeMember(this.dataset.id);
                break;
            case "star":
                star(this.dataset.id, true);
                break;
            case "submit":
                $(this.dataset.form).submit();
                break;
            case "unpin":
                unpin(this.dataset.id, true);
                break;
            case "unread":
                unread(this.dataset.id, true);
                break;
            case "unstar":
                unstar(this.dataset.id, true);
                break;
            default:
                console.warn("unhandled action: " + action);
        }
    });

    // toggle star
    $(document).on("click", "[data-toggle=star][data-type=conversation]", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($(this).hasClass("on")) {
            unstar(this.dataset.id, true);
        } else {
            star(this.dataset.id, true);
        }
    });

    // mark active conversation as read when window is focused
    $(window).bind("focus", function () {
        if (_id !== -1 && $(".new-separator").length > 0 && (document.body.classList.contains("dual") || document.body.classList.contains("two"))) {
            //console.debug("window focused, marking conversation " + _id + " as read");
            $.post(wvy.url.resolve(_prefix + "/c/" + _id + "/read"));
        }
    });

    // reset scroll positions so that conversation list is scrolled to top and messages to bottom after turbolinks:render
    $(document).on("click", "#sidebar .pane-title a", function (e) {
        _b1 = _p1 = 0;
        var el = getScrollParent(document.getElementById("conversations"));
        if (el === document.scrollingElement) {
            //console.debug("_b1 = " + _b1);
            el.scrollTop = _b1;
        } else if (el) {
            //console.debug("_p1 = " + _p1);
            el.scrollTop = _p1;
        }
    });

    // save scroll position so that conversation list is scrolled to correct position after turbolinks:render
    $(document).on("click", "#main .pane-title a", function (e) {
        if (document.body.classList.contains("one")) {
            var el = getScrollParent(document.getElementById("conversations"));
            if (el === document.scrollingElement) {
                _b1 = el.scrollTop;
                //console.debug("_b1 = " + _b1);
            } else if (el) {
                _p1 = el.scrollTop;
                //console.debug("_p1 = " + _p1);
            }
        }
    });

    // switch visible pane from #main to #sidebar
    $(document).on("click", ".btn-back", function (e) {
        // reset scroll position
        _b2 = null;
        //console.debug("_b2 = " + _b2);

        // switch visible pane
        document.body.classList.remove("two");
        document.body.classList.add("one");

        // and restore scroll position
        setTimeout(restoreScroll, 0);
    });

    // let server know that user is typing in conversation
    $(document).on("keydown", ".message-form textarea", _.throttle(function () { wvy.connection.default.invoke("messenger", "typing", _id) }, 3000, { trailing: false }));

    // search form
    $(document).on("submit", ".search-form", function (e) {
        e.preventDefault();

        var $form = $(this);
        var $inputs = $("input", $form);
        var $q = $("input[name=q]", $form);

        // special case for sending selected ids in people-search
        var $target = $($form.data("target"));
        if ($target.length) {
            var $selected = $("[type=checkbox]", $target);
            $inputs = $inputs.add($selected);
        }

        // perform search 
        _searchxhr = $.ajax({
            method: "GET",
            url: $form.attr("action") + "?" + $inputs.serialize(),
            beforeSend: function (xhr) {
                // add .searching class to show spinner (after a small delay)
                if (!_searchtimer) {
                    _searchtimer = setTimeout(function () { $form.addClass("searching").removeClass("reset"); }, 150);
                }

                if (_searchxhr && _searchxhr.readyState < 4) {
                    // abort previous search to prevent ui updates that will be overwritten by this search anyway
                    _searchxhr.abort();
                }
            }
        }).done(function (html) {
            // stop timer that displays spinner
            clearTimeout(_searchtimer);
            _searchtimer = 0;

            $form.removeClass("searching");
            if ($q.val().length > 0) {
                $form.addClass("reset");
            } else {
                $form.removeClass("reset");
            }

            $($form.data("target")).html(html);

        }).fail(function (xhr, status, error) {
            if (error !== 'abort') {
                console.error(error);
            }
        });

    });

    // live search on typing (debounce to avoid immediately sending every keypress to the server)
    $(document).on("input", ".search-form input[name=q]", _.debounce(function (e) {
        e.preventDefault();
        $(this).closest("form").submit();
    }, 150));

    // click on reset search button
    $(document).on("click", ".search-form .btn-reset", function (e) {
        $(this).siblings("input[name=q]").val("").closest(".search-form").submit();
    });

    // ESC in search field
    $(document).on("keydown", ".search-form input[name=q]", function (e) {
        if (e.which === 27) {
            $(this).val("").closest(".search-form").submit();
        }
    });

    // select people for new conversation or for adding people to existing conversation
    $(document).on("click", ".table-people tr", function (e) {
        var $checkbox = $(".btn-checkbox [type=checkbox]", $(this));
        if ($checkbox.prop("checked")) {
            $checkbox.prop("checked", false);
        } else {
            $checkbox.prop("checked", true);
        }

        // enable/disable submit button
        var target = $checkbox.closest("form").prop("id");
        var $button = $("[data-action=submit][data-form='#" + target + "']")
        if ($checkbox.closest("form").find(":checked").length) {
            $button.addClass("btn-primary").prop("disabled", false);
        } else {
            $button.removeClass("btn-primary").prop("disabled", true);
        }
    });

    // load content for new-message-modal and add-people-modal
    $(document).on("show.bs.modal", "#new-message-modal, #add-people-modal", function (e) {
        var $modal = $(this);

        // disable submit button (until at least one person has been selected)
        $(".btn[data-action=submit]").removeClass("btn-primary").prop("disabled", true);

        var $form = $modal.find(".search-form");
        $($form.data("target")).empty();
        $form[0].reset();
        $form.submit();
    });

    // add people to conversation
    $(document).on("submit", "#add-people-form", function (e) {
        e.preventDefault();
        var $form = $(this);
        $.post({
            url: $form.attr("action"),
            data: $form.serialize()
        }).fail(function (xhr, status, error) {
            console.error(error);
        }).always(function () {
            $("#add-people-modal").modal("hide");
        });
    });

    // intercept links to user profiles and open modal instead
    $(document).on("click", "a[href^='/people/']", function (e) {
        // verify that href matches /people/{id}
        var match = $(this).attr("href").match(/^\/people\/(-?\d+)$/i);
        if (match) {
            // stop navigation
            e.preventDefault();

            // save user id
            _uid = match[1];

            // open profile modal
            $('#profile-modal').modal();
        } else {
            _uid = null;
        }
    });

    // load content for profile modal
    $(document).on("show.bs.modal", "#profile-modal", function (e) {
        if (_uid) {
            // clear modal content and show spinner
            var $modal = $(this);
            var $content = $(".modal-content:not(.loading)", $modal).addClass("d-none");
            var $loading = $(".modal-content.loading", $modal).removeClass("d-none");
            var $spinner = $(".spinner", $loading).addClass("spin");

            // get modal content from server
            $.ajax({
                url: wvy.url.resolve(_prefix + "/people/" + _uid),
                type: "GET"
            }).then(function (html) {
                $loading.addClass("d-none");
                $content.html(html).removeClass("d-none");
            }).always(function () {
                // stop spinner
                $spinner.removeClass("spin");
            });
        }
    });

    // update settings
    $(document).on("change submit", "#settings-form", function (e) {
        e.preventDefault();
        var $form = $(this);
        $.ajax({
            method: $form.attr("method"),
            url: wvy.url.resolve($form.attr("action")),
            data: $form.serialize()
        }).done(function (data) {
            // update relevant client context settings
            wvy.settings.enter = data.enter_to_send || false;
            wvy.settings.notify = data.desktop_notifications || false;
        });
    });

    // set conversation name
    $(document).on("blur", ".edit-form .form-control", function (e) {
        $(".edit-form").removeClass("edit");
    });

    // rename conversation
    $(document).on("change submit", ".edit-form", function (e) {
        e.preventDefault();
        var $form = $(this);
        var $input = $form.find(".form-control");
        var oldname = $(".name-label div", $form).text();
        var newname = $input.val();

        $.ajax({
            method: $form.attr("method"),
            url: wvy.url.resolve($form.attr("action")),
            data: $form.serialize(),
            beforeSend: function (xhr) {
                // update ui with what we think is the new name
                $(".name-label", $form).find("div").text(newname);
                $(".conversation[data-id=" + _id + "] .media-title").text(newname);
                $(".conversation[data-id=" + _id + "] .pane-title .typing-hide a").text(newname);
            }
        }).done(function (data) {
            // update ui with the actual new name
            $(".name-label", $form).find("div").text(data.name);
            $(".conversation[data-id=" + _id + "] .media-title").text(data.name);
            $(".conversation[data-id=" + _id + "] .pane-title .typing-hide a").text(data.name);

            // remove invalid class
            $input.removeClass("is-invalid");
        }).fail(function (xhr) {
            // restore old name on error
            $(".name-label", $form).find("div").text(oldname);
            $(".conversation[data-id=" + _id + "] .media-title").text(oldname);
            $(".conversation[data-id=" + _id + "] .pane-title .typing-hide a").text(oldname);

            // mark invalid
            $input.addClass("is-invalid");
        });
    });

    // submit message
    $(document).on("submit", ".message-form", function (e) {
        e.preventDefault();

        // check that message is not empty
        var $form = $(this);
        var json = $form.serializeObject(false);
        
        if (json.text || json.blobs || json.embeds || json.meetings) {
            
            // check meetings authentication            
            if (json.meetings) {                
                var auth = $("a[data-meeting-authenticated='0']");
                
                if (auth.length) {
                    wvy.alert.info(wvy.t("Please sign in to the meeting provider before you submit the message!"), 3000)
                    return false;
                }
            }
            
            // disable send button (to avoid double click)
            $form.find("[type=submit]").prop("disabled", true);

            // update #sending to make it look as close as possible to the server rendered message that will be displayed after reload
            var $s = $("#sending");

            if (json.blobs) {
                // TODO: add uploaded files to .sending message?
                // at least try to add an empty placeholder so that the .sending message gets the same size as the server rendered message
            }

            // update .text in .sending message
            var text = json.text;
            if (text) {
                // add .emoji class if text contains only emoji (and optionally whitespace)
                if (!json.blobs && emojiOnly(text)) {
                    $s.find(".message").addClass("emoji");
                }

                // convert emoji shortcodes and unicode to images
                text = convertEmoji(text);
            }
            $s.find(".text").html(text);

            // set sending class on body (which will display #sending)
            document.body.classList.add("sending");

            // scroll to bottom of messages
            scrollToBottomOfMessages();

            // reset scroll positions so that conversation list is scrolled to top after turbolinks:render
            _b1 = 0;
            _p1 = 0;
            
            // submit form with Turbolinks
            wvy.turbolinks.visit($form.attr("action"), $form.serialize(), $form.attr("method"))
        }
    });

    // only display the last modal when stacking modals on top of each other
    $(document).on({
        "show.bs.modal": function () {
            var modals = $(".modal.show");
            if (modals.length && modals.length === 1) {
                modals.last().css("display", "none");
            }
        },
        "hide.bs.modal": function () {
            var modals = $(".modal.show");
            if (modals.length && modals.length === 2) {
                modals.last().css("display", "none");
                modals.first().css("display", "block");
            }
        }
    }, ".modal");

    // desktop notification settings
    $(document).on("change", "input[name=DesktopNotifications]", function (evt) {
        if ($(this).is(":checked") && window.Notification.permission === "default") {
            $(".notification-required").removeClass("d-none");
            $(".notification-required").trigger("click");
        }
    });

    $(document).on("click", ".notification-required", function (evt) {
        evt.preventDefault();
        window.Notification.requestPermission(function (result) {
            if (result === "granted") {
                $(".desktop-notification-settings").addClass("d-none");
            } else if (result === "denied") {
                $(".notification-required").addClass("d-none");
                $(".notification-denied").removeClass("d-none");
            } else if (result === "default") {
                // do nothing
            }
        });
    });

    ////////// Realtime events //////////

    // reload after reconnect to get fresh data
    wvy.connection.default.on("reconnected.connection", reload);

    // called by server to let client know about typing events
    wvy.connection.default.on("typing.weavy", function (event, data) {
        // remove existing typing events by this user (can only type in one conversation at a time)
        _typing.forEach(function (item, index) {
            if (item.user.id === data.user.id) {
                _typing.splice(index, 1);
            }
        });

        // track time when we received this event
        data.time = Date.now();
        _typing.push(data);

        // finally update gui
        updateTyping();
    });

    // update gui because a message was received
    wvy.connection.default.on("message-inserted.weavy", function (event, message) {
        console.debug("received message " + message.id + " in conversation " + message.conversation);

        if (message.createdBy.id !== wvy.context.user) {
            if (_id === message.conversation && wvy.presence.isActive() && document.hasFocus()) {
                // mark conversation as read (also tells server that message was delivered)
                console.debug("marking conversation " + message.conversation + " as read");
                $.post(wvy.url.resolve(_prefix + "/c/" + message.conversation + "/read"));
            } else {
                // let server know that we received the message
                console.debug("marking conversation " + message.conversation + " as delivered");
                $.post(wvy.url.resolve(_prefix + "/c/" + message.conversation + "/delivered"));
            }

            // remove typing indicator for message sender
            _typing.forEach(function (item, index) {
                if (item.user.id === message.createdBy.id) {
                    _typing.splice(index, 1);
                }
            });
            updateTyping();
        }

        // get html for conversation in the conversation list (if needed)
        var d0 = $.Deferred();
        if (document.body.classList.contains("single") && document.body.classList.contains("two")) {
            d0.resolve();
        } else {
            d0 = $.get({ url: wvy.url.resolve(_prefix + "/c/" + message.conversation), cache: false });
        }

        // get html for #messages 
        var d1 = $.Deferred();
        if (message.conversation === _id && $("#main").is(":visible")) {
            d1 = $.get({ url: wvy.url.resolve(_prefix + "/c/" + message.conversation + "/messages"), cache: false });
        } else {
            d1.resolve();
        }

        // get html for #info-modal since members could have been added/removed (ideally we should have a separate realtime event for this)
        var d2 = $.Deferred();
        if (message.conversation === _id && message.createdBy.id < 0 && $("#main").is(":visible")) {
            d2 = $.get({ url: wvy.url.resolve(_prefix + "/c/" + message.conversation + "/info"), cache: false });
        } else {
            d2.resolve();
        }

        // wait for all ajax requests to complete
        $.when(d0, d1, d2).then(function (a0, a1, a2) {
            if (a0) {
                console.debug("updating #conversations (" + event.type + ")");
                var $html = $(a0[0]);
                if (_id === message.conversation) {
                    $html.addClass("active");
                } else {
                    $html.removeClass("active");
                }

                var $cnv = $("#conversations .conversation[data-id=" + message.conversation + "]");
                var $pinned = $("#conversations .conversation.pinned:not([data-id=" + message.conversation + "])").last();
                var isSearching = $("input[name=q]", ".search-form").val().length > 0;

                if (isSearching) {
                    if ($cnv.length) {
                        $cnv.replaceWith($html);
                    }
                } else {
                    if ($cnv.length) {
                        if ($cnv.hasClass("pinned")) {
                            // replace with new html
                            $cnv.replaceWith($html);
                        } else if ($pinned.length) {
                            // move immediately after last pinned conversation and replace with new html
                            $cnv.insertAfter($pinned).replaceWith($html);
                        } else {
                            // move conversation to top of list and replace with new html
                            $cnv.prependTo($("#conversations")).replaceWith($html);
                        }
                    } else if ($pinned.length) {
                        // insert after last pinned conversation
                        $html.insertAfter($pinned);
                    } else {
                        // insert first
                        $html.prependTo($("#conversations"));
                    }
                }
            }

            if (a1) {
                console.debug("updating #messages (" + event.type + ")");

                // remove temporary sending message
                if (message.createdBy.id === wvy.context.user) {
                    $("#sending").remove();
                    document.body.classList.remove("sending");
                }


                $("#messages").html(a1[0]);
                scrollToBottomOfMessages();
            }


            if (a2) {
                console.debug("updating members (" + event.type + ")");
                $("#info-modal .modal-body").html($(".modal-body", $(a2[0])).html());
            }

            if (message.createdBy.id !== wvy.context.user) {
                updateBadge();
                notify(message);
            }
        });

    });

    // update gui because a message was updated
    wvy.connection.default.on("message-updated.weavy", function (event, message) {
        console.debug("received updated message " + message.id + " in conversation " + message.conversation);
                
        // get html for message        
        if (message.conversation === _id && $("#main").is(":visible")) {
            $.get({ url: wvy.url.resolve(_prefix + "/m/" + message.id), cache: false }).then(function (html) {
                var $existing = $("div[data-message='" + message.id + "']");
                if ($existing.length) {
                    $existing.next(".status").remove();
                    $existing.replaceWith(html)
                }
            });
        }   
    });

    // update gui because message was delivered
    wvy.connection.default.on("conversation-delivered.weavy", function (event, data) {
        console.debug("conversation " + data.conversation.id + " was delivered to user " + data.user.id);

        // update #messages if needed
        if (_id === data.conversation.id && $("#messages .status-sent").length) {
            $.get({ url: wvy.url.resolve(_prefix + "/c/" + data.conversation.id + "/messages"), cache: false }).done(function (data) {
                console.debug("updating #messages (" + event.type + ")");
                $("#messages").html(data);
                scrollToBottomOfMessages();
            });
        }
    });

    // update gui because a conversation was read/unread
    wvy.connection.default.on("conversation-read.weavy", function (event, data) {
        var conversation = data.conversation;
        var user = data.user;

        console.debug("conversation " + conversation.id + " was " + (conversation.isRead ? "read" : "unread") + " by " + (user.id === wvy.context.user ? "me" : "user " + user.id));

        if (user.id === wvy.context.user) {
            // update gui (since conversation could have been read/unread in another browser window)
            conversation.isRead ? read(conversation.id, false) : unread(conversation.id, false);
        }

        if (_id === conversation.id && $("#main").is(":visible")) {
            // get html for #messages (to render updated status indicators)
            $.get({ url: wvy.url.resolve(_prefix + "/c/" + conversation.id + "/messages"), cache: false }, function (html) {
                console.debug("updating #messages (" + event.type + ")");
                $("#messages").html(html);
                scrollToBottomOfMessages();
            });
        }
    });

    // update gui because a conversation was pinned/unpinned
    wvy.connection.default.on("conversation-pinned.weavy", function (event, conversation) {
        //console.debug("conversation " + conversation.id + " was " + (conversation.isPinned ? "pinned" : "unpinned"));

        // update gui (since conversation could have been pinned/unpinned in another browser window)
        conversation.isPinned ? pin(conversation.id, false) : unpin(conversation.id, false);
    });

    // update gui because a conversation was starred
    wvy.connection.default.on("star.weavy", function (event, data) {
        if (data.type === "conversation") {
            // update gui (since conversation could have been starred in other browser window)
            star(data.id, false);
        }
    });

    // update gui because a conversation was unstarred
    wvy.connection.default.on("unstar.weavy", function (event, data) {
        if (data.type === "conversation") {
            // update gui (since conversation could have been unstarred in other browser window)
            unstar(data.id, false);
        }
    });

    ////////// Postal events (sent from outer frame) //////////
    wvy.postal.on("open-conversation", function (e) {
        if (e.data.id) {
            // set active conversation
            load(e.data.id);
        }
    });
        
    ////////// helper functions //////////

    function load(id) {
        //console.debug("loading conversation " + id);

        // save scroll position so that conversation list is scrolled to correct position after turbolinks:render
        var el = getScrollParent(document.getElementById("conversations"));
        if (el === document.scrollingElement) {
            _b1 = el.scrollTop;
            //console.debug("_b1 = " + _b1);
        } else if (el) {
            _p1 = el.scrollTop;
            //console.debug("_p1 = " + _p1);
        }

        // update some stuff on #main before loading the page (for better perceived peformance)
        var $c = $("#conversations .conversation[data-id=" + id + "]");

        // hide badge to avoid quick flash with potentially wrong number
        if ($c.hasClass("unread")) {
            hideBadge();
        }

        var $m = $("#main");
        var $h = $m.find(".pane-header");

        // update avatar
        $h.find(".btn-avatar").find("img").attr("src", $c.find(".avatar").attr("src"));

        // update title
        var $t = $h.find(".pane-title");
        $t.find("a").text($c.find(".media-title").text());

        // toggle star so that text is properly aligned
        if ($c.hasClass("starred")) {
            $m.addClass("starred");
            $t.find("[data-toggle=star]").addClass("on").removeClass("d-none");
        } else {
            $m.removeClass("starred");
            $t.find("[data-toggle=star]").addClass("d-none").removeClass("on");
        }

        // switch visible pane from #sidebar to #main
        document.body.classList.remove("one");
        document.body.classList.add("two");

        // let turbolinks fetch the page (will show loading spinner etc.)
        Turbolinks.visit($c.attr("href"));
    }

    function star(id, ajax) {
        $(".conversation[data-id=" + id + "]").addClass("starred");
        $("[data-toggle=star][data-type=conversation][data-id=" + id + "]").addClass("on").removeClass("d-none");

        if (ajax) {
            $.post({ url: wvy.url.resolve(_prefix + "/c/" + id + "/star") });
        }
    }

    function unstar(id, ajax) {
        $(".conversation[data-id=" + id + "]").removeClass("starred");
        $("[data-toggle=star][data-type=conversation][data-id=" + id + "]").removeClass("on");

        if (ajax) {
            $.post({ url: wvy.url.resolve(_prefix + "/c/" + id + "/unstar") });
        }
    }

    function read(id, ajax) {
        $(".conversation[data-id=" + id + "]").removeClass("unread");
        if (ajax) {
            $.post({ url: wvy.url.resolve(_prefix + "/c/" + id + "/read") });
        }
        updateBadge();
    }

    function unread(id, ajax) {
        $(".conversation[data-id=" + id + "]").addClass("unread");
        if (ajax) {
            $.post({ url: wvy.url.resolve(_prefix + "/c/" + id + "/unread") });
        }
        updateBadge();
    }

    function pin(id, ajax) {
        // set pinned class
        $(".conversation[data-id=" + id + "]").addClass("pinned");

        // move to top of conversations list
        var $c = $("#conversations .conversation[data-id=" + id + "]");
        $c.parent().prepend($c);

        if (ajax) {
            $.post({ url: wvy.url.resolve(_prefix + "/c/" + id + "/pin") });
        }
    }

    function unpin(id, ajax) {
        $(".conversation[data-id=" + id + "]").removeClass("pinned");
        if (ajax) {
            $.post({ url: wvy.url.resolve(_prefix + "/c/" + id + "/unpin") });
        }
    }

    function removeBlob(id) {
        $(".blob[data-id=" + id + "]").remove();
        saveMessageForm(false);
    }

    function removeMeeting(el) {
        $(el).closest("tr").remove();
        saveMessageForm(false);
    }

    function removeMember(id) {
        var $tr = $("tr[data-member=" + id + "]").addClass("d-none");
        $.ajax({
            method: "DELETE",
            url: wvy.url.resolve(_prefix + "/c/" + _id + "/members"),
            data: "user=" + id
        }).done(function (data, status, xhr) {
            $tr.remove();
        }).fail(function (xhr, status, error) {
            console.error(error);
            $tr.removeClass("d-none");
        });
    }

    function leave(id) {
        var url = wvy.url.resolve(_prefix + "/c/" + id + "/leave");
        if (document.body.classList.contains("single") && document.body.classList.contains("two")) {

            // make ajax request to leave
            $.post(url);

            // and remove all modals, but keep the .modal-backdrop as an indicator that we have left the conversation
            $(".modal").remove();

        } else {
            wvy.turbolinks.visit(url, null, "POST")
        }
    }

    // get the closest ancestor element that is scrollable (adapted from https://stackoverflow.com/a/42543908/891843)
    function getScrollParent(element, includeHidden) {
        if (element) {
            var style = getComputedStyle(element);
            var excludeStaticParent = style.position === "absolute";
            var overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;

            if (style.position === "fixed") {
                return document.scrollingElement;
            }

            for (var parent = element; (parent = parent.parentElement);) {
                style = getComputedStyle(parent);
                if (excludeStaticParent && style.position === "static") {
                    continue;
                }
                if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
                    return parent;
                }
            }
        }

        return document.scrollingElement;
    }

    // restore scroll positions after opening/closing panes and/or turbolinks navigation
    function restoreScroll() {
        var el = getScrollParent(document.getElementById("conversations"));
        if (el === document.scrollingElement) {
            if (document.body.classList.contains("one")) {
                _b1 = _b1 || 0;
                //console.debug("scrolling document to " + _b1);
                el.scrollTop = _b1;
            } else if (document.body.classList.contains("two")) {
                _b2 = _b2 || document.scrollingElement.scrollHeight;
                //console.debug("scrolling document to " + _b2);
                el.scrollTop = _b2;

            }
        } else if (el) {
            _p1 = _p1 || 0;
            //console.debug("scrolling #conversations to " + _p1);
            if (el.classList.contains("os-viewport")) {
                $(el).closest(".os-host").overlayScrollbars().scroll({ y: _p1 });
            } else {
                el.scrollTop = _p1;
            }
        }
    }

    // scroll to bottom of messages
    function scrollToBottomOfMessages() {
        var el = getScrollParent(document.getElementById("sending"));
        if (el === document.scrollingElement) {
            if (document.body.classList.contains("two")) {
                //console.debug("scrolling document to " + el.scrollHeight);
                el.scrollTop = el.scrollHeight;
            }
        } else if (el) {
            //console.debug("scrolling #messages to " + el.scrollHeight, el);
            if (el.classList.contains("os-viewport")) {
                $(el).closest(".os-host").overlayScrollbars().scroll({ y: el.scrollHeight });
            } else {
                el.scrollTop = el.scrollHeight;
            }
            
        }
    }

    // update typing indicators
    function updateTyping() {

        if (_typingTimeout) {
            clearTimeout(_typingTimeout);
            _typingTimeout = null;
        }

        // discard typing events older than 5 seconds
        var now = Date.now();
        _typing.forEach(function (item, index) {
            if (now - item.time > 5 * 1000) {
                _typing.splice(index, 1);
            }
        });

        // remove old typing indicators
        $(".typing").removeClass("typing");

        if (_typing.length) {

            // group typing events by conversation
            var grouped = _.groupBy(_typing, "conversation");

            // loop over all typing events and update the gui
            for (var id in grouped) {
                // find elements to update
                var $c = $(".conversation[data-id=" + id + "]");
                if ($c.length) {

                    // use age of typing event to animate ellipsis...
                    var dots = (Math.round((now - Math.max.apply(null, grouped[id].map(x => x.time))) / 1000) % 3) + 1;
                    var ellipsis = (".").repeat(dots) + "<span class=invisible>" + (".").repeat(3 - dots) + "</span>";

                    // merge names of people typing
                    var names = _.sortBy(_.map(grouped[id], function (item) { return "@" + item.user.username; }), function (x) { return x });
                    var text = "";
                    for (var i = 0; i < names.length; i++) {
                        if (i > 0) {
                            if (i === (names.length - 1)) {
                                text += " " + wvy.t("and") + " ";
                            } else {
                                text += ", ";
                            }
                        }
                        text += names[i];
                    }
                    if (names.length === 1) {
                        text += " " + wvy.t("is typing");
                    } else {
                        text += " " + wvy.t("are typing");
                    }

                    // update gui
                    $c.find(".typing-show").html(text + ellipsis);
                    $c.addClass("typing");
                }
            }

            // schedule another call to updateTyping in 1 second
            _typingTimeout = setTimeout(updateTyping, 1000);
        }
    }

    // update badge
    function updateBadge() {
        var badge = $("#conversations .conversation.unread[data-id!='" + _id + "']").length;
        if (badge > 0) {
            $(".pane-actions .badge").text(badge);
        } else {
            hideBadge();
        }
    }

    // hide badge
    function hideBadge() {
        $(".pane-actions .badge").text("");
    }      

    // convert emoji shortcodes and unicode to images
    function convertEmoji(str) {
        if (emojione) {
            if (str && str.length > 0) {
                str = emojione.toImage(str);
                str = str.replace(/class="emojione"/g, 'class="eo"');
            }
        }
        return str;
    }

    // returns a value indicating whether the specified string contains only emoji (and whitespace)
    function emojiOnly(str) {
        if (emojione) {
            if (str && str.length > 0) {
                str = emojione.toShort(str);
                str = str.replace(emojione.regShortNames, '');
                str = str.replace(/\s+/g, '');
                return str.length === 0;
            }
        }
        return false;
    }

    // save pending message to local storage and clear message form
    function saveMessageForm(clearForm) {
        if (_textarea) {
            if (storageAvailable()) {

                // save text
                var key = "text:" + _id;
                var value = _textarea.getText();

                if (value && value.length) {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.removeItem(key);
                }

                // save uploads
                key = "blobs:" + _id;
                value = $(".table-uploads").html();
                if (value && value.length) {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.removeItem(key);
                }

                // save meetings
                key = "meetings:" + _id;
                value = $(".table-meetings").html();
                if (value && value.length) {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.removeItem(key);
                }
            }

            // clear form after saving it
            if (clearForm) {
                _textarea.setText("");
                $(".table-uploads").empty();
                $(".table-meetings").empty();
            }

        }
    }

    // restore pending message from local storage
    function restoreMessageForm() {
        if (_textarea) {
            if (storageAvailable()) {
                // restore text
                var key = "text:" + _id;
                var value = localStorage.getItem(key);

                if (value && value.length) {
                    _textarea.setText(value);
                } else {
                    _textarea.setText("");
                }


                // restore uploads
                key = "blobs:" + _id;
                value = localStorage.getItem(key);
                if (value && value.length) {
                    $(".table-uploads").html(value);
                } else {
                    $(".table-uploads").empty();
                }

                // restore meetings
                key = "meetings:" + _id;
                value = localStorage.getItem(key);
                if (value && value.length) {
                    $(".table-meetings").html(value);
                } else {
                    $(".table-meetings").empty();
                }
            }

            // focus textarea
            if (!wvy.browser.mobile) {

                // focus textarea
                _textarea.setFocus();

                // set caret position at end of text
                var editor = _textarea.editor[0];
                var range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    // remove text, meetings and uploads from gui and local storage
    function clearMessageForm() {
        if (_textarea) {
            // clear form
            _textarea.setText("");
            $(".table-uploads").empty();
            $(".table-meetings").empty();

            if (storageAvailable()) {
                localStorage.removeItem("text:" + _id);
                localStorage.removeItem("blobs:" + _id);
                localStorage.removeItem("meetings:" + _id);
            }
        }
    }

    // remove meetings from gui and local storage
    function clearMeetings(provider) {
        if (_textarea) {
            // clear form
            if (provider == null) {
                $(".table-meetings").empty();
                if (storageAvailable()) {
                    localStorage.removeItem("meetings:" + _id);
                }
            } else {
                $(".table-meetings tr[data-meeting-provider='" + provider + "']").remove();
                saveMessageForm();
            }
        }
    }

    // check if localStorage is available (https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API)
    function storageAvailable() {
        try {
            var storage = window["localStorage"];
            var x = "__storage_test__";
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') && (storage && storage.length !== 0);
        }
    }

    // display desktop notification for specified message
    function notify(message) {

        // NOTE: avoid playing sound for now (to avoid multiple tabs playing the sound simultaneously)
        // wvy.audio.play("#message-sound");

        if (window.Notification) {

            if (Notification.permission === "granted" && wvy.settings.notify) {
                var title = wvy.t("Message from") + " " + (message.createdBy.name || message.createdBy.username);
                var options = {
                    body: message.text,
                    // tag notification with message id to avoid multiple open tabs displaying individual notifications for the same message
                    tag: message.id,
                    // there aren't any solid guidelines for what type and size image to use for an icon, but a 192px png seems to work well in most browsers
                    icon: message.createdBy.thumb.replace("{options}", "192").replace(".svg", ".png")
                }

                // modify title and body if message was in a room
                var $room = $(".conversation.room[data-id=" + message.conversation + "]");
                if ($room.length) {
                    title = ($(".media-title", $room) || $(".pane-title .typing-hide", $room)).text().trim();
                    options.body = (message.createdBy.name || message.createdBy.username) + ": " + message.text;
                }

                var notification = new Notification(title, options);

                // handle click on the notification
                notification.addEventListener("click", function () {
                    // TODO: figure out how to navigate on click since the behaviour should be different depending on the view being displayed (messenger, conversations, conversation etc) and if we are embedded or not.
                    //location.href = wvy.url.resolve(_prefix);
                    window.focus();
                    this.close();
                });

                // most browsers and operating system close notifications automatically so we probably don't need the following
                //setTimeout(notification.close.bind(notification), 4000);
            }
        }
    }

    function reload() {
        document.body.classList.add("reloading");
        Turbolinks.visit(document.location.href, { action: 'replace' });
    }

    var showUploadedBlobs = function (blobs) {
        return new Promise(function (resolve, reject) {
            // call server to get partial html for uploaded files
            var qs = "?" + blobs.map(x => "ids=" + x.id).join("&");
            $.get(wvy.url.resolve("/content/blobs" + qs), function (html) {
                $(".table-uploads").append(html);
                saveMessageForm(false);
                resolve();
            });
        });
    }

    return {
        reload: reload,
        showUploadedBlobs: showUploadedBlobs
    };
})(jQuery);


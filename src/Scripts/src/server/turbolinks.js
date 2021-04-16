/*global Turbolinks */
var wvy = wvy || {};

wvy.turbolinks = (function ($) {

    // prevent ie caching jquery xhr get requests
    if (wvy.browser["browser"] === "IE") {
        $.ajaxSetup({
            cache: false
        });
    }

    var restorationVisit;

    // gets a value indicating whether turbolinks is enabled or not
    var enabled = typeof Turbolinks !== "undefined" && Turbolinks !== undefined && Turbolinks.supported !== undefined && Turbolinks.supported;

    // Opens url in _blank if possible
    function openExternal(url, force) {
        var link = wvy.url.hyperlink(url);
        var isSameDomain = wvy.url.sameDomain(window.location.origin, url);
        var isJavascript = link.protocol === "javascript:";
        var isHashLink = url.charAt(0) === '#';
        var isHttp = link.protocol.indexOf("http") === 0;

        // force, external domain and not javascript
        if (force || !(isSameDomain || isJavascript || isHashLink)) {
            console.log("wvy.turbolinks: external navigation");

            if (typeof window.parent.Native !== "undefined") {
                window.parent.Native('linkCallback', { url: url });
            } else {
                if (isHttp) {
                    // Open http/https links in a new tab
                    window.open(url, "_blank");
                } else {
                    // Open custom protocols in the top browser window
                    window.open(url, "_top");
                }

            }
            return true;
        }

        return false;
    }

    // Open downloads natively in mobile
    function openDownload(url, force) {
        var link = wvy.url.hyperlink(url);
        var isHttp = link.protocol.indexOf("http") === 0;
        var isDownload = link.searchParams.has("d");

        if (force || isDownload && isHttp) {
            console.log("wvy.turbolinks: download url");

            // Open download links using system in Android webview
            if (typeof window.parent.Native !== "undefined" && wvy.browser.platform === "Android") {
                window.parent.Native('linkCallback', { url: url });
                return "native";
            }
            return true;
        }

        return false;
    }

    function sendData(url, data, method, action) {
        restorationVisit = false;

        if (!method || method === "get") {
            // append data to querystring
            if (data) {
                if (url.indexOf('?') === -1) {
                    url = url + "?" + data;
                } else {
                    url = url + "&" + data;
                }
            }

            if (openExternal(url)) {
                return;
            }

            // visit url
            if (wvy.navigation) {
                wvy.navigation.bypassUrl(url);
            }

            var turbolinksAction;

            if (action) {
                console.debug("turbolinks: visit using action:", action);
                turbolinksAction = { action: action };
            }

            Turbolinks.visit(url, turbolinksAction);
        } else {

            // intercept request so that we can set form data and the Turbolinks-Referrer header
            $(document).one("turbolinks:request-start", function (event) {
                var xhr = event.originalEvent.data.xhr;
                xhr.open(method, url, true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.setRequestHeader("Turbolinks-Referrer", document.location);
                xhr.data = data;
            });

            // visit url, i.e. post data to server
            if (wvy.navigation) {
                wvy.navigation.bypassUrl(url);
            }
            Turbolinks.visit(url);
        }
    }

    // submit the specified form and data to the server via ajax adding the Turbolinks-Referrer header
    function submitFormWithData($form, data, $submit) {
        var url = $submit && $submit.attr("formaction") || $form.attr("action");
        var method = $submit && $submit.attr("formmethod") || $form.attr("method");

        if ($form.hasClass("tab-content")) {
            // add active tab to data (so that we can activate the correct tab when the page reloads)
            var $tab = $form.find(".tab-pane.active");
            data = data + "&tab=" + encodeURIComponent($tab.attr('id'));
        }

        sendData(url, data, method);
    }

    function reload() {
        if (wvy.navigation) {
            wvy.navigation.bypassUrl(window.location.toString());
        }
        Turbolinks.visit(window.location.toString(), { action: 'replace' });
    }

    if (enabled) {

        // monkey patch turbolinks to render error pages, see https://github.com/turbolinks/turbolinks/issues/179
        Turbolinks.HttpRequest.prototype.requestLoaded = function () {
            return this.endRequest(function (t) {
                return function () {
                    var e;
                    return 200 <= (e = t.xhr.status) && 300 > e || t.xhr.getResponseHeader("Turbolinks-Status") === "OK" ? t.delegate.requestCompletedWithResponse(t.xhr.responseText, t.xhr.getResponseHeader("Turbolinks-Location")) : (t.failed = !0, t.delegate.requestFailedWithStatusCode(t.xhr.status, t.xhr.responseText))
                }
            }(this));
        };

        // monkey patch turbolinks send function with data enabled send
        Turbolinks.HttpRequest.prototype.send = function () {
            var t;
            return this.xhr && !this.sent ? (this.notifyApplicationBeforeRequestStart(), this.setProgress(0), this.xhr.send(this.xhr.data), this.sent = !0, "function" === typeof (t = this.delegate).requestStarted ? t.requestStarted() : void 0) : void 0;
        };

        // Catch navigating links before turbolinks:click
        $(document).on("click", "a[href]", function (e) {
            var nearestClickable = $(e.target).closest("A, BUTTON, .btn, input[type='button']").get(0);

            if (!e.isPropagationStopped() && !e.isDefaultPrevented() && (!nearestClickable || nearestClickable === this)) {
                var href = this.href || $(this).attr("href");
                var target = this.target || $(this).attr("target");

                // Turbolinks listens to a[href]:not([target]):not([download])
                // Turbolinks filters out extensions ending on other than .htm .html .xhtml

                var targetIsBlank = target === '_blank';
                var targetIsTop = target === '_top';
                var targetIsDownload = $(this).is("[download]");
                var isWebView = $("html").is(".webview");

                var forceExternal = targetIsBlank || isWebView && targetIsTop;
                var forceDownload = targetIsDownload;
                
                if (openExternal(href, forceExternal)) { // Check if url can open in new window
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    // Check if url is a download-url
                    var hasOpenedDownload = openDownload(href, forceDownload);
                    if (hasOpenedDownload) {
                        if (hasOpenedDownload === "native") {
                            e.preventDefault();
                        }
                        e.stopPropagation();
                    }
                }

            }
        })

        document.addEventListener("turbolinks:click", function (e) {
            console.log("turbolinks:click")
            // anchors in same page should not be requested with turbolinks
            if (e.target.getAttribute("href").charAt(0) === '#') {
                console.log("Cancelling turbolinks navigation");
                return e.preventDefault();
            }
        });

        document.addEventListener("turbolinks:before-visit", function (e) {
            // Clicked external links will never reach this, but Turbolinks.visit() will
            if (openExternal(e.data.url) || openDownload(e.data.url)) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });

        // External domain links will never reach turbolinks:visit, so we check them on click
        // Catch all links that Turbolinks ignores, needs to be in bubbling phase
        document.addEventListener("click", function (e) {
            var eventTarget = $(e.target).closest("a[href]").get(0);

            if (eventTarget === e.target) {
                console.debug("wvy.turbolinks: link click ignored by turbolinks?");
            }
        })


        // print state changes (for debugging purposes), see https://javascript.info/onload-ondomcontentloaded
        //console.debug("document:" + document.readyState);
        //document.addEventListener("readystatechange", function () { console.debug("document:" + document.readyState); });
        //document.addEventListener("DOMContentLoaded", function () { console.debug("document:ready"); });



        document.addEventListener("turbolinks:request-start", function (e) {

            // prevent ie caching xhr get requests
            if (wvy.browser.browser === "IE") {
                e.data.xhr.setRequestHeader("Cache-Control", "no-cache");
                e.data.xhr.setRequestHeader("Cache-Control", "no-store");
                e.data.xhr.setRequestHeader("Pragma", "no-cache");
                e.data.xhr.setRequestHeader("Expires", "0");
            }
        });

        //document.addEventListener("turbolinks:visit", function (e) { console.debug(e.type);  });
        //document.addEventListener("turbolinks:request-end", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:before-cache", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:before-render", function (e) {console.debug(e.type); });
        //document.addEventListener("turbolinks:render", function (e) { console.debug(e.type); });

        document.addEventListener("turbolinks:load", function (e) {
            // if url has #fragment, we should scroll target element into view
            if (window.location.hash) {
                setTimeout(function () {
                    var element = document.getElementById(window.location.hash.substring(1));
                    if (element) {
                        console.debug("scrolling into view", window.location.hash.substring(1))
                        var os = $("body").overlayScrollbars();
                        if (os) {
                            os.scroll(element);
                        } else {
                            element.scrollIntoView();
                        }
                    }
                }, 1)
            }
        });

        //window.addEventListener("load", function (e) { console.debug("window:" + e.type); });
        //window.addEventListener("beforeunload", function (e) { console.debug("window:" + e.type); });
        //window.addEventListener("unload", function (e) { console.debug("window:" + e.type); });

        // submit form through turbolinks by clicking submit button
        $(document).on("click", "form[data-turboform] [type=submit][name][value], form[data-turboform] [type=submit][data-formtarget-panel], form[data-turboform] [type=submit][formaction]", function (e) {
            e.preventDefault();

            // serialize form
            var $submit = $(this);
            var $form = $submit.closest("form[data-turboform]");
            var data = $form.serialize();

            // add button name and value
            if ($submit.attr("name") && $submit.attr('value')) {
                data = data + (data.length === 0 ? "" : "&") + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));
            }

            // submit form with data
            submitFormWithData($form, data, $submit);
        });


        // submit form through turbolinks without clicking submit button
        $(document).on("submit", "form[data-turboform]", function (e) {
            e.preventDefault();

            // serialize form
            var $form = $(this);
            var data = $form.serialize();

            // check if we have exactly one submit button, in that case include the name and value of the button
            var $submits = $form.find("[type=submit][name][value]");
            if ($submits.length === 1) {
                var $submit = $($submits[0]);
                data = data + "&" + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));
                submitFormWithData($form, data, $submit);
            } else {
                submitFormWithData($form, data);
            }
        });

        // opening link with data-bubble-target
        $(document).on("click", "a[href][data-target-panel]", function (e) {
            e.preventDefault();
            var $link = $(this);
            sendData($link.attr('href'), null, "get", this.dataset.targetPanel);
        });

        wvy.postal.on("turbolinks-visit", function (e) {
            var sameUrl = wvy.url.equal(e.data.url, window.location.href);
            var hasData = !!e.data.data;
            var hasMethod = e.data.method && e.data.method !== "GET";
            if (!restorationVisit || restorationVisit && !sameUrl || hasData || hasMethod) {
                sendData(e.data.url, e.data.data, e.data.method, e.data.action);
            } else {
                console.debug("turbolinks: performing restoration, ignoring visit-request")
            }
        })
        
        wvy.postal.on("turbolinks-reload", function (e) {
            reload();
        });

        $(document).on("turbolinks:load", function (e) {
            if (wvy.postal) {
                wvy.postal.postToParent({ name: "ready", location: window.location.href });
            }
            restorationVisit = false;
        });

        // Restoration visits does not generate any visit URL, which we use for restoration detection

        $(document).on("turbolinks:before-visit", function (e) {
            restorationVisit = false;
            //console.log("turbolinks:before-visit", e);
        });
        $(window).on("popstate", function (e) {
            restorationVisit = true;
            //console.log("turbolinks popstate", e);
        });
    }


    return {
        enabled: enabled,
        visit: sendData,
        reload: reload
    };
})(jQuery);

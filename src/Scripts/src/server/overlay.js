/*global Turbolinks, Native */
var wvy = wvy || {};
wvy.overlay = (function ($) {

    wvy.postal.whenLeader().then(function (isLeader) {
        if (isLeader) {
            $(document).on("keyup", function (e) {
                if (e.which === 27) { // Esc
                    var closeBack = $(".btn.close-back").get(0);
                    if (closeBack) {
                        e.stopImmediatePropagation();
                        closeBack.click();
                    }
                }
                if (e.which === 37) { // Left
                    if (allowedKeyTarget(e)) {
                        navPrev();
                    } else {
                        requestPrev(e)
                    }
                }
                if (e.which === 39) { // Right
                    if (allowedKeyTarget(e)) {
                        navNext();
                    } else {
                        requestNext(e);
                    }
                }
            })
        } else {
            wvy.postal.on("request:prev", function (e) {
                console.log("prev requested");
                navPrev();
            });

            wvy.postal.on("request:next", function (e) {
                console.log("next requested");
                navNext();
            });

            $(document).on("keyup", function (e) {
                if (allowedKeyTarget(e)) {
                    if (e.which === 27) { // Esc
                        e.stopImmediatePropagation();
                        wvy.postal.postToParent({ name: "request:close" })
                    }

                    if (e.which === 37) { // Left
                        e.stopImmediatePropagation();
                        wvy.postal.postToParent({ name: "request:prev" })
                    }

                    if (e.which === 39) { // Right
                        e.stopImmediatePropagation();
                        wvy.postal.postToParent({ name: "request:next" })
                    }
                }
            })
        }
    });

    function allowedKeyTarget(e) {
        var isPreviewController = $("body").is(".controller-attachment, .controller-content");
        var noModalOpen = !$("html").is(".modal-open");
        var notInputField = !$(e.target).is("input, textarea, select") && !$(e.target).closest('[contenteditable="true"]').length;
        return isPreviewController && noModalOpen && notInputField;
    }

    function requestPrev(e) {
        if ($("#previewPanel").hasClass("show")) {
            e.stopImmediatePropagation();
            wvy.postal.postToFrame("preview", true, { name: "request:prev" });
        } else if ($("#overlayPanel").hasClass("show")) {
            e.stopImmediatePropagation();
            wvy.postal.postToFrame("overlay", true, { name: "request:prev" });
        }
    }

    function requestNext(e) {
        if ($("#previewPanel").hasClass("show")) {
            e.stopImmediatePropagation();
            wvy.postal.postToFrame("preview", true, { name: "request:next" });
        } else if ($("#overlayPanel").hasClass("show")) {
            e.stopImmediatePropagation();
            wvy.postal.postToFrame("overlay", true, { name: "request:next" });
        }
    }

    function navPrev() {
        console.log("navigating prev", !!$(".nav-prev a").length);
        var prevLink = $(".nav-prev a").get(0);
        if (prevLink && prevLink.href) {
            wvy.turbolinks.visit(prevLink.href);
        }
    }

    function navNext() {
        console.log("navigating next", !!$(".nav-next a").length);
        var nextLink = $(".nav-next a").get(0);
        if (nextLink && nextLink.href) {
            wvy.turbolinks.visit(nextLink.href);
        }
    }

    function overlayLinkOpen(href) {
        // Check url validity
        var link = wvy.url.hyperlink(href);
        var isSameDomain = wvy.url.sameDomain(window.location.origin, href);
        var isDownload = isSameDomain && link.searchParams.has("d");

        if (!isSameDomain || isDownload) {
            console.warn("wvy.preview: invalid overlay url", href);
            return;
        }

        var overlayUrl = getOverlayUrl(href);
        href = overlayUrl || href;

        wvy.postal.whenLeader().then(function (isLeader) {
            if (isLeader) {
                console.log("overlay standalone open");
                var iOS = wvy.browser.platform === "iOS";
                if (document.body.classList.contains('controller-messenger')) {
                    window.location.href = href;
                } else {
                    wvy.turbolinks.visit(href);
                }
            } else {
                wvy.postal.postToParent({ name: overlayUrl && overlayUrl.includes("/attachments/") ? "preview-open" : "content-open", url: href });
            }
        });

        return href;
    }

    // check if the specified url could be an url that we want to open in our overlay
    function getOverlayUrl(url) {
        var link = wvy.url.hyperlink(url);
        var match = link.href.match("^(https?://[^/]+)/");
        if (match) {
            var origin = match[1];
            if (origin === window.location.origin) {
                var startPattern = "^" + origin + wvy.config.applicationPath + "(e/)?";

                // /attachment/id
                match = link.href.match(startPattern + "attachments/\\d+");
                if (match) {
                    return match[0];
                }

                // /content/id
                match = link.href.match(startPattern + "content/\\d+$");
                if (match) {
                    return match[0];
                }

                // /files/id
                match = link.href.match(startPattern + "files/\\d+");
                if (match) {
                    // return /content/id
                    return match[0].replace("files", "content");
                }
            }
        }
    }

    $(document).on("click", "a[href], [data-href]", function (e) {
        var nearestClickable = $(e.target).closest("A, BUTTON, .btn, input[type='button']").get(0);

        if (!e.isPropagationStopped() && !e.isDefaultPrevented() && (!nearestClickable || nearestClickable === this)) {
            var href = this.dataset.href || this.href || $(this).attr("href");
            if (href) {
                var target = this.dataset.target || this.target || $(this).attr("target");

                var link = wvy.url.hyperlink(href);
                var isHttp = link.protocol.indexOf("http") === 0;
                var isSameDomain = wvy.url.sameDomain(window.location.origin, href);
                var isDownload = $(this).is("[download]") || link.searchParams.has("d");
                var isHashLink = (this.dataset.href || $(this).attr("href")).charAt(0) === '#';

                if (isHttp && isSameDomain && !isDownload && !isHashLink) {
                    if (target === "overlay") {
                        e.preventDefault();
                        console.debug("wvy.overlay: should open", href);
                        overlayLinkOpen(href);
                    } else if (!target) {
                        var overlayUrl = getOverlayUrl(href);
                        if (overlayUrl) {
                            // let Navigation/Turbolinks do a link check
                            console.debug("wvy.overlay: maybe open", overlayUrl);
                            e.preventDefault();
                            Turbolinks.visit(overlayUrl);
                        }
                    }
                }
            }
        }
    });

    // Photoswipe legacy wrapper
    $(document).on("click", "[data-photoswipe]", function (e) {
        if (!e.isPropagationStopped() && !e.isDefaultPrevented) {
            e.preventDefault();
            e.stopPropagation();

            var $item = $(this);
            var href = $item.data("src") || $item.attr("href");
            console.debug("wvy.overlay: photoswipe click");
            overlayLinkOpen(href);
        }
    })

    function isOverlay() {
        return $("body").is(".controller-content, .controller-attachment");
    }

    function isContentOverlay() {
        return $("body").is(".controller-content");
    }

    function isAttachmentOverlay() {
        return $("body").is(".controller-attachment");
    }

    function inOtherOverlay(url) {
        var overlayUrl = getOverlayUrl(url);
        if (overlayUrl) {
            var isAttachmentUrl = overlayUrl.includes("/attachments/");
            if (isContentOverlay() && isAttachmentUrl || isAttachmentOverlay() && !isAttachmentUrl) {
                return true;
            }
        }
        return false;
    }

    function isEmbedded() {
        var embedded = true;
        try {
            embedded = window.parent.wvy.context.embedded;
        } catch (e) { }
        return embedded;
    }

    return {
        open: overlayLinkOpen,
        inOtherOverlay: inOtherOverlay,
        isOverlay: isOverlay,
        isContentOverlay: isContentOverlay,
        isAttachmentOverlay: isAttachmentOverlay,
        isEmbedded: isEmbedded,
    }
})(jQuery);


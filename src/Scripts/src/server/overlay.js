/*global Turbolinks, Native */
var wvy = wvy || {};
wvy.overlay = (function ($) {

    function getDataUrl(img, maxAreaPixels) {

        if (img) {
            // Check the image type
            var aImg = document.createElement("a");
            aImg.href = img.currentSrc || img.src;

            if (aImg.protocol === "data:") {
                return aImg.href;
            }

            var isJpeg = /(\.jpeg|\.jpg)$/.test(aImg.pathname);

            // Is the image loaded loaded?
            if (img.complete && img.naturalHeight !== 0) {
                // Create canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // calculate size
                var sWidth = img.naturalWidth || img.width;
                var sHeight = img.naturalHeight || img.height;

                var dWidth = sWidth;
                var dHeight = sHeight;

                // Scale down
                if (maxAreaPixels && maxAreaPixels < sWidth * sHeight) {
                    var ratio = sWidth / sHeight;

                    // Scale to a area of maxSize pixels
                    dWidth = Math.round(Math.sqrt(maxAreaPixels / (1 / ratio)));
                    dHeight = Math.round(Math.sqrt(maxAreaPixels / ratio));
                }

                // Set width and height
                canvas.width = dWidth;
                canvas.height = dHeight;

                // Draw the image
                ctx.drawImage(img, 0, 0, dWidth, dHeight);

                return canvas.toDataURL(isJpeg && 'image/jpeg');
            }
        }
    }

    function createPanel(name, className) {
        var panel = document.createElement("div");
        panel.id = name + "Panel";
        panel.className = "overlay-panel loading " + (className ? className : "");

        var overlay = document.createElement("iframe");
        overlay.id = name;
        overlay.name = name;
        overlay.className = "overlay";
        overlay.allow = "fullscreen *; autoplay *;"
        panel.frame = overlay;
        panel.appendChild(overlay);

        var close = document.createElement("div");
        close.className = "btn btn-icon btn-close";
        close.title = wvy.t("Close");
        close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="i"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
        panel.appendChild(close);

        $(close).on("click", function () {
            closeOverlay(name);
        });

        return panel;
    }

    wvy.postal.whenLeader.then(function () {
        var overlays = document.createElement("section");
        overlays.id = "overlays";
        overlays.className = "overlays";
        document.documentElement.appendChild(overlays);

        var contentPanel = createPanel("overlay", "overlay-light overlay-modal");
        overlays.appendChild(contentPanel);

        var previewPanel = createPanel("preview", "overlay-dark");
        overlays.appendChild(previewPanel);

        wvy.whenLoaded.then(function () {
            setTimeout(function () {
                if (!contentPanel.frame.loading && !contentPanel.frame.loaded) {
                    loadOverlay(wvy.url.resolve("/content/"), null, "overlay");
                }
                if (!previewPanel.frame.loading && !previewPanel.frame.loaded) {
                    loadOverlay(wvy.url.resolve("/attachments/"), null, "preview");
                }
            }, 1);
        })

        // Open from subframe
        wvy.postal.on("content-open", function (e, message) {
            console.log("opening content", message);
            openOverlay(message.url, message.thumb, "overlay")
        });

        wvy.postal.on("preview-open", function (e, message) {
            console.log("opening preview", message);
            openOverlay(message.url, message.thumb, "preview")
        });

        wvy.postal.on("ready", function (e) {
            loadReady(e.source.name);
        });

        wvy.postal.on("request:close", function (e) {
            if (closeTopOverlay()) {
                e.stopImmediatePropagation();
            }
        });

        wvy.postal.on("request:prev", function (e) {
            console.log("bouncing request:prev");
            requestPrev(e);
        });

        wvy.postal.on("request:next", function (e) {
            console.log("bouncing request:next");
            requestNext(e);
        });

        $(document).on("keyup", function (e) {
            if (e.which === 27) { // Esc
                if (closeTopOverlay()) {
                    e.stopImmediatePropagation();
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
    }).catch(function () {
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

    function loadReady(name) {
        $("#" + name + "Panel").removeClass("loading");
        var frame = $("#" + name).get(0);
        if (frame) {
            frame.loaded = true;
            frame.loading = false;
        }
    }

    function closeOverlay(name) {
        var hasClosed = false;
        var $panel = $("#" + name + "Panel");
        if ($panel.hasClass("show")) {
            wvy.postal.postToFrame(name, true, { name: "close" });

            $panel.removeClass("show");

            setTimeout(function () {
                if (!$panel.hasClass("show")) {
                    $("html").removeClass("block-scroll");
                    $panel.addClass("loading");
                    wvy.postal.postToFrame(name, true, { name: "closed" });
                }
            }, 201);

            hasClosed = true;
        }
        return hasClosed;
    }

    function closeTopOverlay() {
        return closeOverlay("preview") || closeOverlay("overlay");
    }

    function closeAllOverlays() {
        var previewClosed = closeOverlay("preview");
        var overlayClosed = closeOverlay("overlay");
        return previewClosed || overlayClosed;
    }

    function loadOverlay(href, thumb, panelName) {
        var hrefThumb = href;

        if (thumb) {
            // TODO: microthumb, find a better transfer
            //hrefThumb += "#thumb:" + encodeURIComponent(thumb);
        }

        var frame = $("#" + panelName).get(0);

        if (frame && frame.contentWindow) {
            if (frame.loaded && wvy.url.equal(frame.contentWindow.location.href.split("#")[0], href)) {
                console.debug("opening " + panelName + " by turbolinks-reload");
                //$("#" + panelName)[0].contentWindow.location.reload();
                wvy.postal.postToFrame(panelName, true, { name: "turbolinks-reload" });
            } else {
                if (frame.loaded) {
                    console.debug("opening " + panelName + " by turbolinks-visit");
                    wvy.postal.postToFrame(panelName, true, { name: 'turbolinks-visit', url: hrefThumb });
                } else {
                    console.debug("opening " + panelName + " by contentWindow.location");
                    frame.contentWindow.location.href = hrefThumb;
                }
            }
        } else {
            console.debug("opening " + panelName + " by window.open");
            window.open(hrefThumb, panelName);
        }

        if (frame) {
            frame.loading = true;
            $("#" + panelName + "Panel").addClass("loading");
        }
    }

    function openOverlay(href, thumb, panelName) {
        $("html").addClass("block-scroll");

        loadOverlay(href, thumb, panelName);

        requestAnimationFrame(function () {
            $("#" + panelName + "Panel").addClass("show");
        });
    }

    function overlayLinkOpen(href, thumbImage) {

        // Check url validity
        var link = wvy.url.hyperlink(href);
        var isSameDomain = wvy.url.sameDomain(window.location.origin, href);
        var isDownload = isSameDomain && link.searchParams.has("d");

        if (!isSameDomain || isDownload) {
            console.warn("wvy.preview: invalid overlay url", href);
            return;
        }

        // TODO: microthumb, find a better transfer
        var contentThumb = null; // getDataUrl(thumbImage, 128000);

        var overlayUrl = getOverlayUrl(href);
        href = overlayUrl || href;

        wvy.postal.whenLeader.then(function () {
            openOverlay(href, contentThumb, overlayUrl && overlayUrl.includes("/attachments/") ? "preview" : "overlay");
        }).catch(function () {
            wvy.postal.postToParent({ name: overlayUrl && overlayUrl.includes("/attachments/") ? "preview-open" : "content-open", url: href, thumb: contentThumb });
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
                        // TODO: microthumb, find a better transfer
                        var thumbImage = null; //$(this).find("img.content-thumb, img.content-thumb-hidden, img:not(.i)").get(0);
                        overlayLinkOpen(href, thumbImage);
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
            // TODO: microthumb, find a better transfer
            var thumbImage = null; //$item.find("> img") || $item.data("thumb-src") && $("<img src='" + $item.data("thumb-src") + "' />");
            console.debug("wvy.overlay: photoswipe click");
            overlayLinkOpen(href, thumbImage);
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

    function maybeOpen(url) {
        return !!getOverlayUrl(url);
    }

    return {
        open: overlayLinkOpen,
        close: closeOverlay,
        closeTop: closeTopOverlay,
        closeAll: closeAllOverlays,
        inOtherOverlay: inOtherOverlay,
        isOverlay: isOverlay,
        isContentOverlay: isContentOverlay,
        isAttachmentOverlay: isAttachmentOverlay,
        isEmbedded: isEmbedded,
        maybeOpen: maybeOpen
    }
})(jQuery);


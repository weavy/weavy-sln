// preview files in fullscreen overlay
var weavy = weavy || {};

weavy.preview = (function ($) {

    // default options
    var options = {
        locale: 'en-US',
        workerSrc: weavy.url.resolve("/scripts/vendor/pdfjs-dist/pdf.worker.min.js"),
        cMapUrl: weavy.url.resolve("/scripts/vendor/pdfjs-dist/cmaps/"),
        cMapPacked: true,
        pdfThumbnailViewer: null,
        isThumbnailViewEnabled: false,
        thumbnailContainer: null
    };

    // open pdf viewer on click
    $(document).on("click", "[data-preview]", function (e) {
        e.preventDefault();

        // open with options from data attributes
        open({
            preview: $(this).data("preview"), // url to pdf 
            name: $(this).data("name"), // name to display in header
            icon: $(this).data("icon"), // icon of item (used for open in office)
            download: $(this).data("download"), // url for downloading file
            office: $(this).data("office"), // url for opening document in office
            starred: $(this).data("starred"), // true|false indicating if document is starred (if starrable)
            comments: $(this).data("comments") // number of comments (if commentable)
        });
    });

    // close pdf viewer when clicking the close button
    $(document).on("click", "[data-preview-close]", function (e) {
        close();
    });

    // close pdf viewer when clicking the backdrop
    $(document).on("click", ".preview-container", function (e) {
        var $target = $(e.target);
        if ($target.attr("id") === "pdfViewer" || $target.hasClass("preview-container") || $target.hasClass("preview-document")) {
            close();
        }
    });

    // init/destroy pdf viewer
    if (weavy.turbolinks.enabled) {
        document.addEventListener("turbolinks:load", init);
        // REVIEW: we should probably do more to cleanup the pdf viewer here, do some research and figure out what...
        document.addEventListener("turbolinks:before-cache", close);
    } else {
        $(document).ready(init);
    }

    // init pdf viewer
    function init() {
        if (!document.getElementById('preview')) {
            // exit if no preview container
            return;
        }
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.initialize(options);
    }

    // open file preview for the specified file
    function open(opts) {
        // add event handle for closing preview on ESC
        $(document).on("keyup", keyup);

        // open up the document with pdf.js
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.open(opts.preview);

        // add navbar
        var $container = $(".preview-container");
        $container.find(".navbar-preview").remove();
        var $navbar = $('<nav class="navbar navbar-preview fixed-top"><div class="navbar-icons"><button type="button" class="btn btn-icon" title="Close" data-preview-close data-widget-event data-widget-name="close-preview"><svg class="i"><use xlink:href="#arrow-left" /></svg></button></div></nav>');
        var $middle = $('<div class="navbar-middle" />');
        $middle.append('<span class="navbar-text">' + opts.name + '</span>');
        $navbar.append($middle);

        // add star?
        if (opts.starred !== undefined) {
            // get id from url
            var match = opts.preview.match(/\/(files|attachments)\/([0-9]+)\//);
            var type = match[1] === "files" ? "content" : "attachment";
            var id = match[2];
            var $star = $('<button type="button" class="btn btn-icon" data-toggle="star" data-entity="' + type + '" data-id="' + id + '"><svg class="i d-block"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#star-outline"></use></svg><svg class="i d-none"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#star"></use></svg></button>');
            if (opts.starred) {
                $star.addClass("on");
            } else {
                $star.addClass("d-none");
            }
            $middle.append($star);

        }
        var $icons = $('<div class="navbar-icons"/>');
        if (opts.office) {
            $icons.append('<a href="' + opts.office + '" class="btn btn-icon" title="Open in Office"><svg class="i"><use xlink:href="#' + opts.icon + '" /></svg></a>');
        }
        if (opts.download) {
            $icons.append('<a href="' + opts.download + '" class="btn btn-icon" title="Download"><svg class="i"><use xlink:href="#download" /></svg></a>');
        }
        $navbar.append($icons);
        $container.append($navbar);

        // show preview container
        $container.show();

        if (weavy.browser.embedded) {
            // maximize widget window
            weavy.postal.post({ name: "open-preview" });
        }
    }

    // close file preview
    function close() {
        if (!document.getElementById('preview')) {
            // exit if no preview container
            return;
        }

        if (weavy.browser.embedded) {
            // close widget preview
            weavy.postal.post({ name: "close-preview" });
        }

        // remove event handler for ESC
        $(document).off("keyup", keyup);

        // hide container
        $(".preview-container").hide();

        // clear selection
        try {
            window.getSelection().removeAllRanges();
        } catch (e) { }

        // REVIEW: is this the correct way to close the viewer?
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.cleanup();
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.close();
        $(weavy.pdf.pdfjsWebApp.PDFViewerApplication.pdfViewer.viewer).find(".page:not(.loading)").remove();
    }

    // close preview on ESC
    function keyup(e) {
        if (e.keyCode === 27) {
            close();
        }
    }

    return {
        options: options,
        open: open,
        close: close
    };

})(jQuery);

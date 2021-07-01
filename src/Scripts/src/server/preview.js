// preview files in fullscreen overlay
var wvy = wvy || {};

wvy.preview = (function ($)  {

    // default options
    var options = {
        locale: 'en-US',
        workerSrc: wvy.url.resolve("/scripts/vendor/pdfjs-dist/pdf.worker.min.js"),
        cMapUrl: wvy.url.resolve("/scripts/vendor/pdfjs-dist/cmaps/"),
        cMapPacked: true,
        pdfThumbnailViewer: null,
        isThumbnailViewEnabled: false,
        thumbnailContainer: null
    };

    // open pdf viewer on click
    $(document).on("click", "[data-preview]", function (e) {
        e.preventDefault();

        var previewOptions = {
            preview: $(this).data("preview"), // url to pdf 
            name: $(this).data("name"), // name to display in header
            icon: $(this).data("icon"), // icon of item (used for open in office)
            download: $(this).data("download"), // url for downloading file
            office: $(this).data("office"), // url for opening document in office
            starred: $(this).data("starred"), // true|false indicating if document is starred (if starrable)
            comments: $(this).data("comments"), // number of comments (if commentable)
            type: $(this).data("type"), // the entity type (attachment or content)
            id: $(this).data("id") // the entity id
        };

        wvy.postal.whenLeader().then(function (isLeader) {
            if (isLeader) {
                // open with options from data attributes
                open(previewOptions);
            } else {
                openInParent(previewOptions);
            }
        });
    });

    // close pdf viewer when clicking the close button
    $(document).on("click", "[data-preview-close]", function (e) {
        close();
    });

    /*// close pdf viewer when clicking the backdrop
    $(document).on("click", ".preview-container", function (e) {
        var $target = $(e.target);
        if ($target.attr("id") === "pdfViewer" || $target.hasClass("preview-container") || $target.hasClass("preview-document")) {
            close();
        }
    });*/

    // init/destroy pdf viewer
    if (wvy.turbolinks.enabled) {
        document.addEventListener("turbolinks:load", init);
        // REVIEW: we should probably do more to cleanup the pdf viewer here, do some research and figure out what...
        document.addEventListener("turbolinks:before-cache", close);
    } else {
        $(document).ready(init);
    }

    // init pdf viewer
    function init() {
        if (!document.getElementById('pdfPreview')) {
            // exit if no preview container
            return;
        }
        wvy.pdf.pdfjsWebApp.PDFViewerApplication.initialize(options);
    }

    // open file preview for the specified file
    function open(opts) {
        // add event handle for closing preview on ESC
        $(document).on("keyup", keyup);

        $('html').addClass("preview-open");

        // open up the document with pdf.js
        wvy.pdf.pdfjsWebApp.PDFViewerApplication.open(opts.preview);

        var $container = $(".preview-container");

        // show preview container
        $container.show();
    }

    function openInParent(opts) {
        wvy.postal.postToParent({ name: "preview-open", options: opts });
    }

    // close file preview
    function close() {
        if (!document.getElementById('pdfPreview')) {
            // exit if no preview container
            return;
        }

        if (wvy.browser.framed) {
            // close weavy client preview
            wvy.postal.postToParent({ name: "preview-close" });
        }

        // remove event handler for ESC
        $(document).off("keyup", keyup);

        $('html').removeClass("preview-open");

        // hide container
        $(".preview-container").hide();

        // clear selection
        try {
            window.getSelection().removeAllRanges();
        } catch (e) { }

        // REVIEW: is this the correct way to close the viewer?
        wvy.pdf.pdfjsWebApp.PDFViewerApplication.cleanup();
        wvy.pdf.pdfjsWebApp.PDFViewerApplication.close();
        $(wvy.pdf.pdfjsWebApp.PDFViewerApplication.pdfViewer.viewer).find(".page:not(.loading)").remove();
    }

    // close preview on ESC
    function keyup(e) {
        if (e.keyCode === 27) {
            //close();
        }
    }

    return {
        options: options,
        open: open,
        close: close
    };

})(jQuery);

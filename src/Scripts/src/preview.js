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

        wvy.postal.whenLeader.then(function () {
            // open with options from data attributes
            open(previewOptions);
        }).catch(function () {
            openInParent(previewOptions);
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
        /*
        // add navbar
        $container.find(".navbar-preview").remove();
        var $navbar = $('<nav class="navbar navbar-preview fixed-top"><div class="navbar-icons"><button type="button" class="btn btn-icon" title="Close" data-preview-close data-weavy-event data-weavy-name="close-preview"><svg class="i i-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"></path></svg></button></div></nav>');
        var $middle = $('<div class="navbar-middle" />');
        $middle.append('<span class="navbar-text">' + opts.name + '</span>');
        $navbar.append($middle);

        // add star?
        if (opts.starred !== undefined) {
            var $star = $('<button type="button" class="btn btn-icon" data-toggle="star" data-type="' + opts.type + '" data-id="' + opts.id + '"><svg class="i i-star-outline d-block" height="24" viewBox="0 0 24 24" width="24"><path d="m12 15.39-3.76 2.27.99-4.28-3.32-2.88 4.38-.37 1.71-4.04 1.71 4.04 4.38.37-3.32 2.88.99 4.28m6.24-8.42-7.19-.61-2.81-6.63-2.81 6.63-7.19.61 5.45 4.73-1.63 7.03 6.18-3.73 6.18 3.73-1.64-7.03z"/></svg><svg class="i i-star d-none" height="24" viewBox="0 0 24 24" width="24"><path d="m12 17.27 6.18 3.73-1.64-7.03 5.46-4.73-7.19-.62-2.81-6.62-2.81 6.62-7.19.62 5.45 4.73-1.63 7.03z"/></svg></button>');
            if (opts.starred) {
                $star.addClass("on");
            } else {
                $star.addClass("d-none");
            }
            $middle.append($star);

        }
        var $icons = $('<div class="navbar-icons"/>');
        if (opts.office) {
            $icons.append('<a href="' + opts.office + '" data-type="' + opts.type + '" data-id="' + opts.id + '" class="btn btn-icon" title="Open in Office"><svg class="i i-office" height="24" viewBox="0 0 24 24" width="24"><path d="m3 18 4-1.25v-9.75l7-2v14.5l-10.5-1.25 10.5 3.75 6-1.25v-17.25l-6.05-1.5-10.95 3.75z" fill="#e64a19"/></svg></a>');
        }
        if (opts.download) {
            $icons.append('<a href="' + opts.download + '" class="btn btn-icon" title="Download"><svg class="i i-download" height="24" viewBox="0 0 24 24" width="24"><path d="m5 20h14v-2h-14m14-9h-4v-6h-6v6h-4l7 7z"/></svg></a>');
        }
        $navbar.append($icons);
        $container.append($navbar);

        */
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

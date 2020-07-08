/*global PhotoSwipe, PhotoSwipeUI_Default */

var wvy = wvy || {};

wvy.photoswipe = (function ($) {

    var _photoswipes = new Set();

    // open photoswipe on click
    $(document).on("click", "[data-photoswipe]", function (e) {
        e.preventDefault();

        var $element = $(this);
        var photoswipeId = $element.data("photoswipe");

        var $elements = $("[data-photoswipe=" + photoswipeId + "]");
        var slides = getSlides($elements);

        var index = 0;
        $elements.each(function (i, item) {
            var $item = $(item);
            // which image did we click
            if ($item[0] === $element[0]) {
                index = i;
            }
        });

        var photoOptions = {
            slides: slides,
            index: index
        };

        wvy.postal.whenLeader.then(function () {
            // open with options from data attributes
            open(photoOptions);
        }).catch(function () {

            photoOptions.slides.forEach(function (slide) { delete slide.thumb; })
            openInParent(photoOptions);
        });
    });

    // cleanup before cache (needed when clicking back in the browser)
    $(document).on("turbolinks:before-cache", function () {
        // close photoswipe
        $(".pswp--open").removeClass("pswp--open pswp--animate_opacity pswp--notouch pswp--css_animation pswp--svg pswp--animated-in pswp--has_mouse");
    });

    function openInParent(opts) {
        wvy.postal.postToParent({ name: "photoswipe-open", options: opts });
    }

    function open(photoOptions, noZoomAnimation) {
        var index = photoOptions.index;
        var slides = photoOptions.slides;

        // define options
        var options = {
            index: index,
            shareButtons: null,
            history: false,
            showHideOpacity: true,
            getThumbBoundsFn: function (index) {
                var thumb = slides[index].thumb;
                if (thumb) {
                    var rect = slides[index].thumb.getBoundingClientRect();
                    return { x: rect.left, y: rect.top + (window.pageYOffset || document.documentElement.scrollTop), w: rect.width };
                }
                return false;
            }
        };

        if (noZoomAnimation) {
            delete options.getThumbBoundsFn;
        }

        // init and open PhotoSwipe
        var pswpelement = document.querySelectorAll('.pswp')[0];
        var pswp = new PhotoSwipe(pswpelement, PhotoSwipeUI_Default, slides, options);
        _photoswipes.add(pswp);

        document.documentElement.classList.add("pswp-open");

        pswp.listen('destroy', function () {
            document.documentElement.classList.remove("pswp-open");
        });

        // Gallery unbinds events (triggers before closing animation)
        pswp.listen('unbindEvents', function () {
            // close weavy client preview
            if (wvy.browser.framed) {
                wvy.postal.postToParent({ name: "preview-close" });
            }
        });

        // inject custom header
        pswp.listen('beforeChange', function () {

            $(".pswp .navbar-preview").remove();
            var $navbar = $("<nav class='navbar fixed-top navbar-preview' />");

            var $left = $('<div class="navbar-icons" />');
            var $middle = $('<div class="navbar-middle" />');
            var $right = $('<div class="navbar-icons" />');

            if (pswp.currItem.name) {
                $middle.append('<span class="navbar-text">' + pswp.currItem.name + '</span>');
                if (pswp.currItem.starred !== undefined) {
                    var $star = $('<button type="button" class="btn btn-icon" data-toggle="star" data-entity="' + pswp.currItem.type + '" data-id="' + pswp.currItem.id + '"><svg class="i i-star-outline d-block" height="24" viewBox="0 0 24 24" width="24"><path d="m12 15.39-3.76 2.27.99-4.28-3.32-2.88 4.38-.37 1.71-4.04 1.71 4.04 4.38.37-3.32 2.88.99 4.28m6.24-8.42-7.19-.61-2.81-6.63-2.81 6.63-7.19.61 5.45 4.73-1.63 7.03 6.18-3.73 6.18 3.73-1.64-7.03z"/></svg><svg class="i i-star d-none" height="24" viewBox="0 0 24 24" width="24"><path d="m12 17.27 6.18 3.73-1.64-7.03 5.46-4.73-7.19-.62-2.81-6.62-2.81 6.62-7.19.62 5.45 4.73-1.63 7.03z"/></svg></button>');
                    if (pswp.currItem.starred) {
                        $star.addClass("on");
                    } else {
                        $star.addClass("d-none");
                    }
                    $middle.append($star);
                }
            }

            if (pswp.currItem.download) {
                $right.append('<a href="' + pswp.currItem.download + '" class="btn btn-icon" title="Download"><svg class="i i-download" height="24" viewBox="0 0 24 24" width="24"><path d="m5 20h14v-2h-14m14-9h-4v-6h-6v6h-4l7 7z"/></svg></a>');
            }

            var $close = $('<button type="button" class="btn btn-icon btn-close" title="Close"><svg class="i i-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"></path></svg></div>').on("click", function () {
                pswp.close();
            });
            $left.append($close);    

            $navbar.append($left);
            $navbar.append($middle);    
            $navbar.append($right);
            $navbar.appendTo(".pswp");
        });

        pswp.init();

        return pswp;
    }

    function getSlides($elements) {
        // build slides
        var slides = [];
        $elements.each(function (i, item) {
            var $item = $(item);

            // create slide
            var src = $item.data("src") || $item.attr("href");
            var thumb = $item.data("thumb-src") || $item.find("> img").attr("src");
            
            // get type and id from url
            var match = src.match(/\/(files|blobs|attachments)\/([0-9]+)\//);
            var type = /files|blobs/.test(match[1]) ? "content" : "attachment";
            var id = match[2];

            // get size
            var size = $item.data("size") && $item.data("size").split("x") || [0, 0];
            size[0] = parseInt(size[0]);
            size[1] = parseInt(size[1]);

            var slide = {
                id: id,
                type: type,
                name: $item.data("name"),
                href: $item.data("href") || $item.attr("href"),
                src: src,
                w: size[0],
                h: size[1],                
                msrc: thumb,



                download: $item.data("download"),
                starred: $item.data("starred"),
                comments: $item.data("comments"),
                thumb: $item.find("img.pswp-thumb, > img")[0] || $('<img src="' + thumb + '" class="pswp-thumb" />').appendTo(item)[0]
            };
            slides.push(slide);
        });

        return slides;
    }

    function close() {
        _photoswipes.forEach(function (pswp) {
            pswp.close();
        });
        _photoswipes.clear();
    }

    return {
        open: open,
        close: close
    };
})(jQuery);

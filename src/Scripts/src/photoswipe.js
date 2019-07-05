var wvy = wvy || {};

(function ($) {

    // open photoswipe on click
    $(document).on("click", "[data-photoswipe]", function (e) {
        // open weavy client preview
        if (wvy.browser.embedded) {
            document.documentElement.classList.add("pswp-transparent");
            wvy.postal.post({ name: "preview-open" });
        }

        e.preventDefault();
        if (wvy.browser.embedded) {
            // embedded: let weavy client apply styles before photoswipe init
            var $that = $(this);
            $(window).one("resize", function () { photoswipe($that, true); });

        } else {
            photoswipe($(this));
        }
    });

    // cleanup before cache (needed when clicking back in the browser)
    $(document).on("turbolinks:before-cache", function () {
        // close photoswipe
        $(".pswp--open").removeClass("pswp--open pswp--animate_opacity pswp--notouch pswp--css_animation pswp--svg pswp--animated-in pswp--has_mouse");
        document.documentElement.classList.remove("pswp-transparent");
    });

    function photoswipe(element, noZoomAnimation) {
        var $element = $(element);
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

        //// create variable that will store real size of viewport
        //var realViewportMax,
        //    useLargeImages = false,
        //    firstResize = true,
        //    imageSrcWillChange;

        document.documentElement.classList.add("pswp-open");

        pswp.listen('destroy', function () {
            document.documentElement.classList.remove("pswp-open");
        });

        // Gallery unbinds events (triggers before closing animation)
        pswp.listen('unbindEvents', function () {
            // close weavy client preview
            if (wvy.browser.embedded) {
                wvy.postal.post({ name: "preview-close" });
                $(window).one("resize", function () { requestAnimationFrame(function () { document.documentElement.classList.remove("pswp-transparent"); }) });
            }
        });

        //// beforeResize event fires each time size of gallery viewport updates
        //pswp.listen('beforeResize', function () {
        //    // gallery.viewportSize.x - width of PhotoSwipe viewport
        //    // gallery.viewportSize.y - height of PhotoSwipe viewport
        //    // window.devicePixelRatio - ratio between physical pixels and device independent pixels (Number)
        //    //                          1 (regular display), 2 (@2x, retina) ...


        //    // calculate real pixels when size changes
        //    realViewportMax = Math.max(pswp.viewportSize.x * window.devicePixelRatio, pswp.viewportSize.y * window.devicePixelRatio);

        //    // Code below is needed if you want image to switch dynamically on window.resize

        //    // Find out if current images need to be changed
        //    if (useLargeImages && realViewportMax <= 1920) {
        //        useLargeImages = false;
        //        imageSrcWillChange = true;
        //    } else if (!useLargeImages && realViewportMax > 1920) {
        //        useLargeImages = true;
        //        imageSrcWillChange = true;
        //    }

        //    // Invalidate items only when source is changed and when it's not the first update
        //    if (imageSrcWillChange && !firstResize) {
        //        // invalidateCurrItems sets a flag on slides that are in DOM,
        //        // which will force update of content (image) on window.resize.
        //        pswp.invalidateCurrItems();
        //    }

        //    if (firstResize) {
        //        firstResize = false;
        //    }

        //    imageSrcWillChange = false;

        //});

        //// gettingData event fires each time PhotoSwipe retrieves image source & size
        //pswp.listen('gettingData', function (index, item) {
        //    // It doesn't really matter what will you do here, 
        //    // as long as item.src, item.w and item.h have valid values.
        //    // 
        //    // Just avoid http requests in this listener, as it fires quite often

        //    // Set image source & size based on real viewport width
        //    var maxedSize, fullscreenTriggerSize = 1024;
        //    if (useLargeImages) {
        //        item.src = item.largeImage.src;
        //        maxedSize = { width: item.largeImage.w, height: item.largeImage.h };
        //        if (Math.max(item.largeImage.w, item.largeImage.h) >= fullscreenTriggerSize) {
        //            maxedSize = resizeLimit(item.largeImage.w, item.largeImage.h, realViewportMax, realViewportMax, true);
        //        }
        //    } else {
        //        item.src = item.mediumImage.src;
        //        maxedSize = { width: item.mediumImage.w, height: item.mediumImage.h };
        //        if (Math.max(item.mediumImage.w, item.mediumImage.h) >= fullscreenTriggerSize) {
        //            maxedSize = resizeLimit(item.mediumImage.w, item.mediumImage.h, realViewportMax, realViewportMax, true);
        //        }
        //    }
        //    item.w = maxedSize.width;
        //    item.h = maxedSize.height;
        //});

        // inject custom header
        pswp.listen('beforeChange', function () {

            $(".pswp .navbar-preview").remove();
            var $navbar = $("<nav class='navbar fixed-top navbar-preview' />");
            var $left = $('<div class="navbar-icons" />');
            var $close = $('<button type="button" class="btn btn-icon" title="Close"><svg class="i i-arrow-left" height="24" viewBox="0 0 24 24" width="24"><path d="m20 11v2h-12l5.5 5.5-1.42 1.42-7.92-7.92 7.92-7.92 1.42 1.42-5.5 5.5z"/></svg></div>').on("click", function () {
                pswp.close();
            });
            $left.append($close);    

            $navbar.append($left);

            var $middle = $('<div class="navbar-middle" />');
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
            $navbar.append($middle);    

            var $right = $('<div class="navbar-icons" />');
            if (pswp.currItem.download) {
                $right.append('<a href="' + pswp.currItem.download + '" class="btn btn-icon" title="Download"><svg class="i i-download" height="24" viewBox="0 0 24 24" width="24"><path d="m5 20h14v-2h-14m14-9h-4v-6h-6v6h-4l7 7z"/></svg></a>');
            }
            $right.appendTo($navbar);
            $navbar.appendTo(".pswp");
        });

        pswp.init();
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

            //var mediumSize = resizeLimit(size[0], size[1], 1920, 1920);
            var slide = {
                id: id,
                type: type,
                name: $item.data("name"),
                href: $item.data("href") || $item.attr("href"),
                src: src,
                w: size[0],
                h: size[1],                
                msrc: thumb,

                //largeImage: {
                //    src: src,
                //    w: size[0],
                //    h: size[1]
                //},
                //mediumImage: {
                //    src: urlProps[2] && urlProps[3] ? src.replace(urlMatch, "/$1/$2/1920x1920/") : src,
                //    w: mediumSize.width,
                //    h: mediumSize.height
                //},

                download: $item.data("download"),
                starred: $item.data("starred"),
                comments: $item.data("comments"),
                thumb: $item.find("> img")[0] || $('<img src="' + thumb + '" />').css({ position: "absolute", top: 0, left: 0, zIndex: -1000, opacity: 0, display: "none" }).appendTo(item)[0]
            };
            slides.push(slide);
        });

        return slides;
    }

    //function resizeLimit(width, height, limitWidth, limitHeight, useMinimum) {
    //    var ratio;
    //    if (useMinimum ? width < limitWidth : width > limitWidth) {
    //        ratio = limitWidth / width;
    //        width *= ratio;
    //        height *= ratio;
    //    }
    //    if (useMinimum ? height < limitHeight : height > limitHeight) {
    //        ratio = limitHeight / height;
    //        width *= ratio;
    //        height *= ratio;
    //    }
    //    return {
    //        width: width,
    //        height: height
    //    };
    //}

})(jQuery);

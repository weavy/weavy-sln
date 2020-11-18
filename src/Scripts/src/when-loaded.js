var wvy = wvy || {};

wvy.whenLoaded = (function ($) {

    var whenLoaded = $.Deferred();

    // Display error fallback for video and audio
    var mediaFallback = function (media) {
        if (media.classList.contains("loading")) {
            media.classList.add("loaded");
        }
        media.classList.add("error");
        media.outerHTML = media.outerHTML.replace(/<(video|audio)/, "<div").replace(/(video|audio)>/, "div>");
    };


    document.documentElement.addEventListener('error', function(event) {
        var src = event.target;
        var media;
        if (src.tagName === 'SOURCE') {
            media = src.parentNode;
            media.dataset.errors = (media.dataset.errors || 0) + 1;
            if (media.querySelectorAll("source").length >= media.dataset.errors) {
                console.warn(media.tagName.toLowerCase() + " source error, switching to fallback");
                mediaFallback(media);
            }
        }
    }, true); // needs capturing


    // Capture codec-error for video in firefox
    document.documentElement.addEventListener('loadedmetadata', function (event) {
        var src = event.target;
        if (src.tagName === 'VIDEO' || src.tagName === 'AUDIO') {
            if (src.classList.contains("loading")) {
                src.classList.add("loaded");
            }
            console.log("src loaded");
            console.dir(src);
            if (src.tagName === 'VIDEO' && !src.videoWidth || src.tagName === 'AUDIO' && !src.duration) {
                console.warn(src.tagName.toLowerCase() + " track not available, switching to fallback");
                mediaFallback(src);
            }
        }
    }, true); // needs capturing


    // IMG LOADING

    // Check already loaded images and display them instantly
    function checkImageLoad() {
        $("img.loading").each(function (index, img) {
            var isLoaded = img.complete && img.naturalHeight !== 0;
            if (isLoaded && !img.classList.contains("loaded")) {
                //console.log("already loaded img", img.src);
                //img.classList.remove("loading");
                img.classList.add("loaded");
            }
        });
    }
    checkImageLoad();

    $(function () {
        checkImageLoad();

        // Add .loaded class when img.loading onload
        document.documentElement.addEventListener(
            'load',
            function (event) {
                var img = event.target;
                if (img.tagName === 'IMG' && img.classList.contains("loading") && !img.classList.contains("loaded")) {
                    //console.log("loaded img", img.src);
                    img.classList.add("loaded");
                }
            },
            true // needs capturing
        );

    });

    // Object loading
    // Add .loaded class when object.loading onload
    document.documentElement.addEventListener(
        'load',
        function (event) {
            var obj = event.target;
            if (obj.tagName === 'OBJECT' && obj.classList.contains("loading") && !obj.classList.contains("loaded")) {
                //console.log("loaded img", img.src);
                obj.classList.add("loaded");
            }
        },
        true // needs capturing
    );

    // Additional exports
    whenLoaded.checkImageLoad = checkImageLoad;

    return whenLoaded;
})(jQuery);



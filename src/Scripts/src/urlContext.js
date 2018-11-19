var weavy = weavy || {};

weavy.urlContext = (function ($) {

    $(document).on("click", "a[data-context-url]", function (e) {
        
        if (weavy.browser.embedded) {
            e.preventDefault();

            var contextUrl = $(this).data("context-url");
            var weavySpaceId = $(this).data("weavy-context-space");
            var weavyUrl = $(this).data("weavy-context-url");

            localStorage.setItem("weavy-context", JSON.stringify({ space: weavySpaceId, url: weavyUrl, context: contextUrl }));

            weavy.postal.post({ name: 'set-context-url', context: contextUrl, weavyUrl: weavyUrl });
        } 

    });

    var init = function () {
        checkForContext();
    }

    var checkForContext = function () {
        var $input = $("input[name=contextUrl]");
        if ($input.length) {
            weavy.postal.post({ name: 'request-url', space: weavy.context.space });
        }
    }

    window.addEventListener("message", function (e) {
        switch (e.data.name) {
            case "context-url":
                // Add classes to html
                if (weavy.browser.embedded) {
                    if (e.data.type === "global") {
                        $(document.documentElement).addClass("connected");
                    } else {
                        $(document.documentElement).removeClass("connected");
                    }
                }
                
                var $url = $("input[name=contextUrl]");
                var $title = $("input[name=contextTitle]");
                var $hasContext = $("input[name=hasContext]");

                if ($url.length) {
                    $url.val(e.data.value);
                    $title.val(e.data.title);                   
                }

                var $displayText = $("span.context-url");
                var $displayIcon = $("img.context-icon");
                if ($displayText.length) {
                    $displayText.text(e.data.title);
                    $displayText.attr("title", "The url '" + e.data.value + "' will be added as context.");
                    $displayIcon.attr("src", "https://www.google.com/s2/favicons?domain=" + e.data.origin)
                }

                // check bubble type and opt in/out context
                if (e.data.type === "personal" && $url.length) {
                    $hasContext.val(false);
                    $url.attr("disabled", true);
                    $(".weavy-editor .context").removeClass("has-context");
                    $(".weavy-editor div.context").hide();
                }
                                
                break;
            
            default:
        }
    }, false);

    return {
        init: init,
        check: checkForContext
    }
})(jQuery);

(function ($) {
    if (weavy.turbolinks.enabled) {        
        document.addEventListener("turbolinks:load", weavy.urlContext.init);
    } else {        
        document.addEventListener("DOMContentLoaded", weavy.urlContext.init);
    }
})(jQuery)

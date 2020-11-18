var wvy = wvy || {};

wvy.url = (function ($) {

    // helper function for resolving url to api controller for entity type, e.g. "comment" -> "/a/comments/"
    function api(entityType) {
        return resolve("/a/" + (entityType === "content" ? entityType : entityType + "s") + "/");
    }

    // helper function for resolving url to mvc controller for entity type, e.g. "comment" -> "/comments/"
    function mvc(entityType) {
        return resolve("/" + (entityType === "content" ? entityType : entityType + "s") + "/");
    }

    // converts a URL into one that is usable on the requesting client
    function resolve(url) {
        if (url.length > 0) {
            if (url.indexOf("http") === 0 || url.indexOf(wvy.config.applicationPath) === 0) {
                // return unmodified
            } else {
                // remove ~ and leading / 
                if (url.charAt(0) === "~") {
                    url = url.substr(1);
                }
                if (url.charAt(0) === "/") {
                    url = url.substr(1);
                }
                // prepend app path
                url = wvy.config.applicationPath + url;
            }
        }
        return url;
    }

    // compare two urls, e.g. equal(document.location.origin, "/") -> true
    function equal(url1, url2) {
        // Links get the actual url used by the browser; 
        var a1 = document.createElement("a"), a2 = document.createElement("a");
        a1.href = url1;
        a2.href = url2;
        return a1.href === a2.href;
    }

    // compare two domains from urls, e.g. sameDomain(document.location.origin, "/test") -> true
    function sameDomain(url1, url2) {
        var urlParse = /^(https?:\/\/[^/]+)/;
        var sameOrigin = false;

        var a1 = document.createElement("a"), a2 = document.createElement("a");
        a1.href = url1;
        a2.href = url2;

        var urlExtract1, urlExtract2;

        try {
            urlExtract1 = urlParse.exec(a1.href);
            urlExtract2 = urlParse.exec(a2.href);
        } catch (e) {
            console.error("wvy.url: Unable to parse domain URL.")
        }

        if (urlExtract1 && urlExtract2) {
            sameOrigin = urlExtract1[1] === urlExtract2[1]
        }

        return sameOrigin;
    }

    // return a thumbnail url by replacing the "{options}" string in the specified placeholder with the specified options
    function thumb(placeholder, options) {
        if (placeholder.indexOf("{options}") !== -1) {
            return resolve(placeholder.replace("{options}", options));
        }
        return placeholder;
    }

    function hyperlink(url) {
        var a = document.createElement("a");
        a.href = url;
        return new URL(a.href) || new window.URL(a.href) || a;
    }

    return {
        api: api,
        equal: equal,
        hyperlink: hyperlink,
        mvc: mvc,
        resolve: resolve,
        sameDomain: sameDomain,
        thumb: thumb
    };
})(jQuery);

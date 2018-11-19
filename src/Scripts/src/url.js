var weavy = weavy || {};

weavy.url = (function ($) {

    // helper function for resolving url to api controller for entity type, e.g. "comment" -> "/api/comments/"
    function api(entityType) {
        return resolve("/api/" + (entityType === "content" ? entityType : entityType + "s") + "/");
    }

    // helper function for resolving url to mvc controller for entity type, e.g. "comment" -> "/comments/"
    function mvc(entityType) {
        return resolve("/" + (entityType === "content" ? entityType : entityType + "s") + "/");
    }

    // converts a URL into one that is usable on the requesting client
    function resolve(url) {
        if (url.length > 0) {
            if (url.indexOf("http") === 0 || url.indexOf(weavy.context.path) === 0) {
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
                url = weavy.context.path + url;
            }
        }
        return url;
    }

    // return a thumbnail url by replacing the "{options}" string in the specified placeholder with the specified options
    function thumb(placeholder, options) {
        if (placeholder.indexOf("{options}") !== -1) {
            return resolve(placeholder.replace("{options}", options));
        }
        return placeholder;
    }

    return {
        api: api, 
        mvc: mvc,
        resolve: resolve,
        thumb: thumb
    };
})(jQuery);

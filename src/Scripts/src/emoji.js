/*global emojione */
var wvy = wvy || {};

wvy.emoji = (function ($) {
    // configure emojione to use our premium svg assets
    emojione.imagePathPNG = wvy.url.resolve("/img/eo/"); 
    emojione.fileExtension = ".svg";
    emojione.imageType = "svg";
    // set legacy path required by emojionarea 
    emojione.imagePathSVG = wvy.url.resolve("/img/eo/");

    // extract emoji shortnames so that we can use them for autocomplete
    var shortnames = $.map(emojione.emojioneList, function (_, emoji) {
        return /tone[12345]/.test(emoji) ? null : emoji;
    });
    shortnames.sort();

    return {
        shortnames: shortnames
    }
})(jQuery);

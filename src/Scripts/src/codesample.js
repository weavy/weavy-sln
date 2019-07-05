/*global Prism */
var wvy = wvy || {};

wvy.codesample = (function ($) {

    document.addEventListener("turbolinks:load", function () {
        // highlight code
        var $code = $('pre > code');
        if ($code.length) {
            $.each($code, function (i, c) {         
                $(c).parent().addClass('line-numbers');
                Prism.highlightElement(c);
            });
        }            
    });

    document.addEventListener("turbolinks:before-cache", function () {
        // destroy highlight ?
    });

})(jQuery)

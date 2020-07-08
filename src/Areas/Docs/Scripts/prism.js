/*global Prism */
document.addEventListener("turbolinks:load", function () {
    var $code = $('pre > code[class*="language-"]');
    if ($code.length) {
        $.each($code, function (i, c) {
            Prism.highlightElement(c);
        });
    }
});


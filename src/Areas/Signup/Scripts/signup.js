//// script for signups
$(function () {
    $(".weavy-button").filter(":visible").each(function () {
        $(this).css("width", $(this).outerWidth() + 1);
    });

    if (window.self !== window.top) {
        $(".back").removeClass("d-none");
    }    
    $(".pincode").pincode();
});

$(document).on("click", "[data-message]", function(e) {    
    weavy.postal.post($(this).data("message"), null, true);
});

$(document).on("click", ".button", function (e) {
    var $btn = $(this);
    setTimeout(function () { $btn.attr("disabled", "") }, 1);

    if (!$("html").hasClass("ie")) {
        $btn.addClass("button-spin");
        $btn.html("<img src='/img/spinner.svg' />");
    }    
});

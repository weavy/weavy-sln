// restores any previous $ https://api.jquery.com/jquery.noconflict/
jQuery.noConflict();

if ($ && $.fn && $.fn.jquery && jQuery.fn.jquery !== $.fn.jquery) {
    console.log("Using jQuery in noConflict mode: " + jQuery.fn.jquery + ", Global $: " + $.fn.jquery);
} else if (this.$ === undefined) {
    this.$ = jQuery;
    console.log("Using jQuery: " + jQuery.fn.jquery);
} else {
    console.log("Using jQuery in noConflict mode: " + jQuery.fn.jquery)
}

// restores any previous $ https://api.jquery.com/jquery.noconflict/
jQuery.noConflict();
if ($ && $.fn && $.fn.jquery && jQuery.fn.jquery != $.fn.jquery) {
    console.log("Using jQuery: " + jQuery.fn.jquery + ", Global $: " + $.fn.jquery);
}

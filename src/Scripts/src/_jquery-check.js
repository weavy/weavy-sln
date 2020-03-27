/* global jQueryVersion */
if (jQuery && jQuery.fn && jQuery.fn.jquery && jQueryVersion) {
    try {
        var $version = jQuery.fn.jquery.split(".");
        var major = parseInt($version[0]);
        var minor = parseInt($version[1]);
        var patch = parseInt($version[2]);

        if (
            major < jQueryVersion.major || (
                major === jQueryVersion.major && (
                    minor < jQueryVersion.minor || (
                        minor === jQueryVersion.minor &&
                        patch < jQueryVersion.patch
                    )
                )
            )
        ) {
            console.error("Incorrect jQuery version: " + jQuery.fn.jquery + ", Required: " + jQueryVersion.version);
        } else {
            console.log("jQuery version:", jQuery.fn.jquery, "√")
        }


    } catch (e) {
        console.error("Could not check jQuery version");
    }
}

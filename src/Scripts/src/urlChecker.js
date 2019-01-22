var weavy = weavy || {};
if (weavy.urlChecker && weavy.urlChecker.destroy) {
    console.log("recreating weavy.urlChecker");
    weavy.urlChecker.destroy();
}
weavy.urlChecker = (function ($) {
    
    // default to the current location.
    var strLocation = window.location.href;
    var strHash = window.location.hash;
    var strPrevLocation = "";
    var strPrevHash = "";    
    var intIntervalTime = 100;
    var _checkInterval = null;

    // removes the pound from the hash.
    var fnCleanHash = function (strHash) {
        return (
            strHash.substring(1, strHash.length)
        );
    }
    
    // check for changes in the window location.
    var fnCheckLocation = function () {
    
        if (strLocation !== window.location.href) {

            // store the new and previous locations.
            strPrevLocation = strLocation;
            strPrevHash = strHash;
            strLocation = window.location.href;
            strHash = window.location.hash;

            
            // trigger event
            var event = $.Event("locationchanged.event.weavy");
            $(document).triggerHandler(event, {
                currentHref: strLocation,
                currentHash: fnCleanHash(strHash),
                previousHref: strPrevLocation,
                previousHash: fnCleanHash(strPrevHash)
            });
            
        }
    }

    // set an interval to check the location changes.
    _checkInterval = setInterval(fnCheckLocation, intIntervalTime);

    function destroy() {
        clearInterval(_checkInterval);
    }

    return {
        destroy: destroy
    }
})(jQuery);

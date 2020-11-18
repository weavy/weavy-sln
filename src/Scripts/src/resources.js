var wvy = wvy || {};
wvy.resourceManager = (function () {

    wvy.t = function (key) {
        return get(key);
    }

    var get = function (key) {
        var text = wvy.resources != null ? wvy.resources[key] : key;
        return text || key;
    }
    
})();

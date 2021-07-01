let root = typeof self !== 'undefined' ? self : this;
root.wvy = root.wvy || {};
root.wvy.t = (function (root) {

    // TODO: use scope instead of window

    var get = function (key) {
        var text = window.wvy && window.wvy.resources != null ? window.wvy.resources[key] : key;
        return text || key;
    }
    return get;

})(root);

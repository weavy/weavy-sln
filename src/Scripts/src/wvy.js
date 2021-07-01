/* eslint-env commonjs, amd */

// UMD based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
// TODO: move to ES6 and transpiler

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.wvy = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    //console.debug("wvy.js", window.name);

    /**
     * Module wrappper for wvy namespace
     * 
     * @module wvy
     * @returns {Object}
     */

    let root = self !== undefined ? self : window;
    let wvy = root.wvy || {};

    return wvy;
}));

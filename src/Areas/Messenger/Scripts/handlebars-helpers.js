'use strict';

Handlebars.registerHelper("thumb", function (placeholder, options) {
    if (placeholder.length) {
        return placeholder.replace("{options}", options);
    } else {
        return placeholder;
    }
});

Handlebars.registerHelper("if_expr", function (lvalue, operator, rvalue, opts) {
    switch (operator) {
        case "<":
            return lvalue < rvalue ? opts.fn(this) : opts.inverse(this);
        case ">":
            return lvalue > rvalue ? opts.fn(this) : opts.inverse(this);
        case "==":
            return lvalue === rvalue ? opts.fn(this) : opts.inverse(this);
        case "!=":
            return lvalue !== rvalue ? opts.fn(this) : opts.inverse(this);
    }
    return opts.inverse(this);
});

Handlebars.registerHelper("ellipsis", function (str, n) {
    var shortened = str.length < n ? str : str.substring(0, n) + "…";
    return shortened;
});

Handlebars.registerHelper("transparent_emoji", function (str) {
    if (emojione) {
        if (str && str.length > 0) {
            str = emojione.toShort(str);
            str = str.replace(emojione.regShortNames, '');
            str = str.replace(/s+/g, "");
            return str.length === 0 ? " emoji" : "";
        }
    }
    return "";
});

Handlebars.registerHelper("emojione", function (str) {
    if (emojione) {
        return new Handlebars.SafeString(emojione.toImage(str));
    }
    return str;
});

Handlebars.registerHelper("file_size", function (bytes) {
    // http://stackoverflow.com/a/20463021/891843
    //return (b = Math, c = b.log, d = 1024, e = c(bytes) / c(d) | 0, bytes / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'KMGTPEZY'[--e] + 'B' : 'B');
    var exp = Math.log(bytes) / Math.log(1024) | 0;
    var result = (bytes / Math.pow(1024, exp)).toFixed(2);

    return result + ' ' + (exp == 0 ? 'bytes': 'KMGTPEZY'[exp - 1] + 'B');
});

// serializes a form to an object, optionally snake_casing the property names
jQuery.fn.serializeObject = function (snake_case) {
    snake_case = snake_case || false;
    var o = {};
    var a = this.serializeArray();

    $.each(a, function () {
        var n = snake_case ? this.name.snakecase() : this.name;
        if (o[n] !== undefined) {
            if (!o[n].push) {
                o[n] = [o[n]];
            }
            o[n].push(this.value || '');
        } else {
            o[n] = this.value || '';
        }
    });
    return o;
};

// truncates a string
String.prototype.trunc = String.prototype.trunc || function (n) {
    if (this.length > n) {
        // remove non-word characters from the end before appending ellipsis
        return this.substr(0, n - 1).replace(/\W+$/i, "") + "…";
    } else {
        return this;
    }
};

// returns the "snake_cased" version of a string
String.prototype.snakecase = String.prototype.snakecase || function () {
    if (this.length > 0) {
        return this.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/-|\s+/g, '_').toLowerCase();
    } else {
        return this;
    }
};

// returns the "Title Cased" version of a string
String.prototype.titlecase = String.prototype.titlecase || function () {
    return this.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

// Polyfill for String.startsWith, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        return this.substr(position || 0, searchString.length) === searchString;
    };
}

// Polyfill for Array.includes, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
        value: function (searchElement, fromIndex) {

            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            // 1. Let O be ? ToObject(this value).
            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ≥ 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return true.
                if (sameValueZero(o[k], searchElement)) {
                    return true;
                }
                // c. Increase k by 1. 
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}


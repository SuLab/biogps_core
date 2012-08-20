// template.js
// Created: Mar 8, 2010

// Extracted and slightly modified from Underscore.js

(function($) {
    // Establish the object that gets thrown to break out of a loop iteration.
    var breaker = typeof StopIteration !== 'undefined' ? StopIteration : '__break__';

    // Quick regexp-escaping function, because JS doesn't have RegExp.escape().
    var escapeRegExp = function(s) { return s.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1'); };


    // ------------------------ Template Functions: ---------------------------

    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    $.templateSettings = {
        start : '<%',
        end : '%>',
        interpolate : /<%=(.+?)%>/g
    };

    // JavaScript templating a-la ERB, pilfered from John Resig's
    // "Secrets of the JavaScript Ninja", page 83.
    // Single-quote fix from Rick Strahl's version.
    // With alterations for arbitrary delimiters.
    $.template = function(str, data) {
        var c = $.templateSettings;
        var endMatch = new RegExp("'(?=[^"+c.end.substr(0, 1)+"]*"+escapeRegExp(c.end)+")","g");
        var fn = new Function('obj',
            'var p=[],print=function(){p.push.apply(p,arguments);};' +
            'with(obj){p.push(\'' +
            str.replace(/[\r\t\n]/g, " ")
                 .replace(endMatch,"\t")
                 .split("'").join("\\'")
                 .split("\t").join("'")
                 .replace(c.interpolate, "',$1,'")
                 .split(c.start).join("');")
                 .split(c.end).join("p.push('")
                 + "');}return p.join('');");
        return data ? fn(data) : fn;
    };

})(jQuery);
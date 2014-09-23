var test = require("prova");
var Fusa = require("..");
var hl = require("highland");

// prova throws seems broken
function throws(t, fn) {
    var args = [].slice.call(arguments, 2);
    t.throws(function() {
        return fn.apply(null, args);
    }, args);
}

test("Supports standard stream interface stubs", function(t) {



    t.end();
});

test("Throws an exception if its in an obviously invalid state", function(t) {

    throws(t, Fusa, {
        bufferLength: 1
    });

    throws(t, function() {
        new Fusa();
    });

    // no stream with a check
    throws(t, Fusa, {
        stream: hl([1, 2, 3])
    }, {
        stream: hl([1, 2, 3])
    });

    throws(t, Fusa, {
        stream: hl([1, 2, 3]),
        check: true
    }, {
        stream: hl([1, 2, 3]),
        key: "smt"
    });

    throws(t, Fusa, {
        stream: hl([1, 2, 3]),
        key: "smt"
    }, {
        stream: hl([1, 2, 3]),
        key: "smt"
    });

    t.end();
});
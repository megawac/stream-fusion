"use strict";

var test = require("prova");
var Fusa = require("..");
var _ = require("lodash");
var hl = require("highland");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

// prova throws seems broken
function throws(t, fn) {
    var args = [].slice.call(arguments, 2);
    t.throws(function() {
        return fn.apply(null, args);
    }, args);
}

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


test("can pause and resume the stream", function(t) {
    t.plan(1);

    var x = hl(_.times(5, nextItem));
    var y = pipeItemsAtFreq(_.times(7, nextItem), 4);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp"
    }, {
        stream: y,
        key: "timestamp",
        check: true
    });

    mixed.transform = function(stream) {
        this.push(stream[0][0].data);
    };

    var paused = true;
    var data = [];
    mixed.pause();
    mixed.on("data", function(x) {
        if (paused) t.ok(false, "Should not emit data while paused");
        else data.push(x);
    });
    mixed.on("finish", function() {
        t.deepEqual(data, [0, 1, 2, 3, 4]);
        t.end();
    });

    _.delay(function() {
        paused = false;
        mixed.resume();
    }, 500);
});


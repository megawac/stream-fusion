var test = require('prova');
var Fusa = require("..");
var _ = require("underscore");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("max rechecks out of check range", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([14], nextItem), 1);
    var y = pipeItemsAtFreq(_.map(_.range(0, 14.1, 2), nextItem), 2);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        bufferLeft: 2,
        maxRechecks: 5
    });

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, []);
        t.end();
    });
});

test("max rechecks inside check range", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([14], nextItem), 1);
    var y = pipeItemsAtFreq(_.map(_.range(0, 14.1, 2), nextItem), 2);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        bufferLeft: 2,
        maxRechecks: 10
    });

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [[nextItem(10), nextItem(12), nextItem(14)]]);
        t.end();
    });
});

test("max rechecks out of check range as option", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([14], nextItem), 1);
    var y = pipeItemsAtFreq(_.map(_.range(0, 14.1, 2), nextItem), 2);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        bufferLeft: 2
    }, {maxRechecks: 5});

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, []);
        t.end();
    });
});

test("max rechecks inside check range as option", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([14], nextItem), 1);
    var y = pipeItemsAtFreq(_.map(_.range(0, 14.1, 2), nextItem), 2);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        bufferLeft: 2
    }, {maxRechecks: 10});

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [[nextItem(10), nextItem(12), nextItem(14)]]);
        t.end();
    });
});
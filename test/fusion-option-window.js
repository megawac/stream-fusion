"use strict";

var test = require("prova");
var Fusa = require("..");
var _ = require("underscore");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("fusion of streams with a set fixed window", function(t) {
    t.plan(1);

    var xitems = [1, 2, 3, 5, 6, 8, 11, 13, 14, 17, 20, 22, 24, 27, 31];
    var x = pipeItemsAtFreq(_.map(xitems, nextItem), 30);
    var y = pipeItemsAtFreq(_.map(_.range(0, 20, 2), nextItem), 20);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 2,
        bufferLength: 20
    });

    var data = [];
    mixed.on("data", function(streams) {
        data.push(streams);
    });
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [nextItem(3), nextItem(4)],
            [nextItem(5), nextItem(6)],
            [nextItem(6), nextItem(6)],
            [nextItem(8), nextItem(8)],
            [nextItem(11), nextItem(12)],
            [nextItem(13), nextItem(14)],
            [nextItem(14), nextItem(14)]
        ]);

        t.end();
    });
});

test("transform with a fixed window", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 30);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 20);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 2,
        bufferLength: 20
    });

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        var stream0 = streams[0],
            stream1 = streams[1];
        data.push([stream0[0], stream1[4]]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [nextItem(3), nextItem(8)],
            [nextItem(5), nextItem(10)],
            [nextItem(6), nextItem(10)],
            [nextItem(8), nextItem(12)]
        ]);

        t.end();
    });

});


test("transform with a buffer window of 3", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 30);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 20);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 3,
        bufferLength: 30
    });

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [nextItem(0),nextItem(2),nextItem(4),nextItem(6),nextItem(8),nextItem(10),nextItem(12)],
            [nextItem(0),nextItem(2),nextItem(4),nextItem(6),nextItem(8),nextItem(10),nextItem(12)],
            [nextItem(2),nextItem(4),nextItem(6),nextItem(8),nextItem(10),nextItem(12),nextItem(14)]
        ]);

        t.end();
    });
});

test("transform with a buffer window of 1", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 30);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 20);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 1,
        bufferLength: 30
    });

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [nextItem(0), nextItem(2), nextItem(4)] ,
            [nextItem(0), nextItem(2), nextItem(4)] ,
            [nextItem(2), nextItem(4), nextItem(6)] ,
            [nextItem(4), nextItem(6), nextItem(8)] ,
            [nextItem(4), nextItem(6), nextItem(8)] ,
            [nextItem(6), nextItem(8), nextItem(10)] 
        ]);

        t.end();
    });
});

test("transform with a buffer window of 2", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 30);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 20);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 2,
        bufferLength: 30
    });

    var data = [];
    // do something weird/stupid
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [nextItem(0), nextItem(2), nextItem(4), nextItem(6), nextItem(8)],
            [nextItem(2), nextItem(4), nextItem(6), nextItem(8), nextItem(10)],
            [nextItem(2), nextItem(4), nextItem(6), nextItem(8), nextItem(10)],
            [nextItem(4), nextItem(6), nextItem(8), nextItem(10), nextItem(12)] 
        ]);
        t.end();
    });
});

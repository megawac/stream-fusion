"use strict";

var test = require('prova');
var Fusa = require("..");
var _ = require("lodash");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("transform with a fixed left of 2 and right window of 0", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 10);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 15);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        bufferLeft: 2,
        bufferRight: 0
    });

    var data = [];
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [{"data":0,"timestamp":0},{"data":2,"timestamp":10},{"data":4,"timestamp":20}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40}]
        ]);

        t.end();
    });
});




test("transform with a fixed left of 2 and right window of 1", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 10);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 15);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        // same as buffer: 2 in options
        bufferLeft: 2,
        bufferRight: 1
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
            [{"data":0,"timestamp":0},{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40}],
            [{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}]
        ]);

        t.end();
    });
});

test("transform with a fixed left and right window of 2", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 10);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 15);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        // same as buffer: 2 in options
        bufferLeft: 2,
        bufferRight: 2
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
            [{"data":0,"timestamp":0},{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}],
            [{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50},{"data":12,"timestamp":60}]
        ]);

        t.end();
    });
});

test("transform with a fixed left of 0 and right window of 2", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 10);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 15);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        // same as buffer: 2 in options
        bufferLeft: 0,
        bufferRight: 2
    });

    var data = [];
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40}],
            [{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}],
            [{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}],
            [{"data":8,"timestamp":40},{"data":10,"timestamp":50},{"data":12,"timestamp":60}]
        ]);

        t.end();
    });
});

test("transform with a fixed left of 1 and right window of 2", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 10);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 15);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp",
        // same as buffer: 2 in options
        bufferLeft: 1,
        bufferRight: 2
    });

    var data = [];
    mixed.transform = function(streams) {
        data.push(streams[1]);
        this.push(data[data.length - 1]);
    };

    mixed.on("data", function() {});
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [{"data":0,"timestamp":0},{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":0,"timestamp":0},{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30}],
            [{"data":2,"timestamp":10},{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40}],
            [{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}],
            [{"data":4,"timestamp":20},{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50}],
            [{"data":6,"timestamp":30},{"data":8,"timestamp":40},{"data":10,"timestamp":50},{"data":12,"timestamp":60}]
        ]);

        t.end();
    });
});
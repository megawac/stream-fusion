var test = require("prova");
var Fusa = require("..");
var _ = require("underscore");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("fusion of streams with a set fixed window", function(t) {
    t.plan(2);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8, 11, 13, 14, 17, 20, 22,
        24, 27, 31
    ], nextItem), 140);
    var y = pipeItemsAtFreq(_.map(_.range(0, 20, 2), nextItem), 135);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 3,
        bufferLength: 20
    });

    var data = [];
    mixed.on("data", function(streams) {
        data.push(streams);
    });
    mixed.on("finish", function() {
        t.equal(data.length, 6);
        t.deepEqual(data, [
            [nextItem(5), nextItem(4)],
            [nextItem(6), nextItem(6)],
            [nextItem(8), nextItem(8)],
            [nextItem(11), nextItem(10)],
            [nextItem(13), nextItem(12)],
            [nextItem(14), nextItem(14)]
        ]);
        t.end();
    });
});

test("transform with a fixed window", function(t) {
    t.plan(1);

    var x = pipeItemsAtFreq(_.map([1, 2, 3, 5, 6, 8], nextItem), 140);
    var y = pipeItemsAtFreq(_.map(_.range(0, 16, 2), nextItem), 135);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp",
        check: true
    }, {
        stream: y,
        key: "timestamp"
    }, {
        buffer: 3,
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
            [nextItem(5), nextItem(8)],
            [nextItem(6), nextItem(10)],
            [nextItem(8), nextItem(12)]
        ]);
        t.end();
    });
});

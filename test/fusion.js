var test = require("prova");
var Fusa = require("..");
var _ = require("underscore");
var hl = require("highland");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("basic (out of sync) direct fusion", function(t) {
    t.plan(10);

    var xtimestamps = _.times(5, nextItem);
    var x = hl(_.map(xtimestamps, _.clone));

    var ytimestamps = _.times(7, nextItem);
    var y = pipeItemsAtFreq(_.map(ytimestamps, _.clone), 100);

    var mixed = new Fusa({
        stream: x,
        key: function(item) {
            xtimestamps = _.filter(xtimestamps, _.matches(item));
            return item.timestamp;
        }
    }, {
        stream: y,
        key: function(item) {
            t.deepEqual(item, ytimestamps.shift(),
                "y called with the correct data");
            return item.timestamp;
        },
        check: true
    }, {
        buffer: 0
    });

    var data = [];
    mixed.on("data", function(streams) {
        data.push(streams);
    });
    mixed.on("finish", function() {
        t.equal(data.length, 7, "Called on every item");
        t.deepEqual(xtimestamps, [], "Reads x entire stream");
        t.deepEqual(ytimestamps, [], "Reads y entire stream");
        t.end();
    });
});

test("transpose on window length 1", function(t) {
    t.plan(8);

    var x = hl(_.times(5, nextItem));
    var y = pipeItemsAtFreq(_.times(7, nextItem), 20);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp"
    }, {
        stream: y,
        key: "timestamp",
        check: true
    }, {
        buffer: 0
    });

    var data = [];
    mixed.transform = function(streams) {
        data.push(streams);
        this.push(streams);
    };
    mixed.on("data", function(streams) {
        t.deepEqual(streams, data[data.length - 1]);
    });
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [[nextItem(0)], [nextItem(0)]],
            [[nextItem(1)], [nextItem(1)]],
            [[nextItem(2)], [nextItem(2)]],
            [[nextItem(3)], [nextItem(3)]],
            [[nextItem(4)], [nextItem(4)]],
            [[nextItem(4)], [nextItem(5)]],
            [[nextItem(4)], [nextItem(6)]]
        ]);
        t.end();
    });
});

test("not publishing in the transform does not publish the value to the stream", function(t) {
    t.plan(5);

    var x = hl(_.times(5, nextItem));
    var y = pipeItemsAtFreq(_.times(7, nextItem), 15);

    var mixed = new Fusa({
        stream: x,
        key: "timestamp"
    }, {
        stream: y,
        key: "timestamp",
        check: true
    }, {
        buffer: 0
    });

    var data = [];
    mixed.transform = function(streams) {
        if (streams[0][0].data !== 4) {
            data.push(streams);
            this.push(streams);
        }  
    };
    mixed.on("data", function(streams) {
        t.deepEqual(streams, data[data.length - 1]);
    });
    mixed.on("finish", function() {
        t.deepEqual(data, [
            [[nextItem(0)], [nextItem(0)]],
            [[nextItem(1)], [nextItem(1)]],
            [[nextItem(2)], [nextItem(2)]],
            [[nextItem(3)], [nextItem(3)]]
        ]);
        t.end();
    });
});

test("can publish multiple items", function(t) {
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
    }, {
        buffer: 0
    });

    var data = [];
    mixed.transform = function(streams) {
        if (streams[0][0].data <= 2) {
            this.push(1);
            this.push(2);
            this.push(3);
        }
    };
    mixed.on("data", function(x) {
        data.push(x);
    });
    mixed.on("finish", function() {
        t.deepEqual(data, [1, 2, 3, 1, 2, 3, 1, 2, 3]);
        t.end();
    });
});

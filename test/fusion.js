var test = require("prova");
var Fusa = require("..");
var hl = require("highland");
var _ = require("underscore");

test("basic (out of sync) direct fusion", function(t) {
    function nextItem(index) {
        return {data: index, timestamp: 5 * index};
    }
    var x = hl([
        nextItem(1),
        nextItem(2),
        nextItem(3),
        nextItem(4),
        nextItem(5)
    ]);

    var items = 7;
    var timestamps = _.times(items, nextItem);
    var y = hl(function(push, next) {
        var index = 0;
        var interval = setInterval(function() {
            if (index < items) {
                push(null, nextItem(index++));
            } else {
                push(null, hl.nil);
                clearInterval(interval);
            }
        }, 100);
    });

    var mixed = new Fusa({stream: x, key: "timestamp"}, {
        stream: y,
        key: function(item) {
            t.deepEqual(item, timestamps.shift(), "Called with the correct data");
            return item.timestamp;
        },
        check: true
    }, {buffer: 1});

    var called = 0;
    mixed.on("data", function(streams) {
        var stream0 = streams[0], stream1 = streams[1];
        t.deepEqual(stream0, stream1, 'called with the correct data');
        called++;
    });
    mixed.on("finish", function() {
        t.equal(called, 2);
        t.deepEqual(timestamps, []);
        t.end();
    });
});

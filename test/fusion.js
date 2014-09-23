var test = require("prova");
var Fusa = require("..");
var _ = require("underscore");
var hl = require("highland");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("basic (out of sync) direct fusion", function(t) {
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
        buffer: 1
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

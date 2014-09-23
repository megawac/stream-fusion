var test = require("prova");
var Fusa = require("..");
var _ = require("underscore");

var nextItem = require("./utils").nextItem;
var pipeItemsAtFreq = require("./utils").pipeItemsAtFreq;

test("fusion of streams with a set fixed window", function(t) {
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

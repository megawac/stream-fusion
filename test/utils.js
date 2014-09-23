var hl = require("highland");

module.exports = {
	nextItem: function nextItem(index) {
		return {
			data: index,
			timestamp: 5 * index
		};
	},

	pipeItemsAtFreq: function pipeItemsAtFreq(items, freq) {
		return hl(function(push, next) {
			var index = -1;
			var interval = setInterval(function() {
				if (++index < items.length) {
					push(null, items[index]);
				} else {
					push(null, hl.nil);
					clearInterval(interval);
				}
			}, freq);
		});
	}
};

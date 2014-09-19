var TransformStream = require("stream").Transform;
var _ = require("underscore");
var CBuffer = require("CBuffer");
var utils = require("util");

/**
 *
 *
 * @param {Array} streams of streams
 * @param {Object} [options]
 */
function Fusa(/* **streams, [options] */) {
    var args = _.flatten([arguments]);
    var streams = _.chain(args).filter("stream").filter("key").value();

    var options = _.difference(args, streams)[0];
    options = _.extend({objectMode: true, bufferLength: 1000, buffer: 2}, options);

    TransformStream.call(this, options);

    if (options.transposer) {
        this.transposer = options.transposer;
    }

    this._streams = [];
    this._closed = 0;
    this.objectMode = !!options.objectMode;
    this._bufferLength = +options.bufferLength;
    this.bufferMatch = +options.buffer;

    if (!streams.length) {
        throw new Error("This stream will never emit data");
    }

    for (var index = 0; index < streams.length; index++) {
        this.addStream(streams[index]);
    }
}

utils.inherits(Fusa, TransformStream);

/**
 * Add a stream to the watched items.
 *
 *
 */
Fusa.prototype.addStream = function(stream) {
    var getter = _.iteratee(stream.key);
    var context = {
        stream: stream.stream,
        getter: getter,
        // Circular buffer to store stream contents as we receive them
        // Used to match old items
        buffer: new CBuffer(this._bufferLength),
        comparitor: function(a, b) {
            // >= so equal items are included in the window
            return a >= getter(b) ? 1 : -1;
        },
        check: stream.check,
        pending: 0
    };
    var thisIndex = this._streams.push(context) - 1;
    var self = this;

    function check(data) {
        // will be a multi dimensional array: [[stream1b4, stream1aft], [stream2b4, stream2aft], [watchedstream]]
        var buffer = self.bufferMatch;
        for (var index = 0, length = self._streams.length, streamData = Array(length); index < length; index++) {
            if (index === thisIndex) continue;
            var currentStream = self._streams[index];
            var sidx = currentStream.buffer.sortedIndex(context.getter(data), currentStream.comparitor);

            // outside of the buffer range
            if (sidx <= buffer || currentStream.buffer.size <= sidx + buffer) {
                currentStream.pending++;
                return;
            }
            streamData[index] = currentStream.buffer.slice(sidx - buffer, sidx + buffer - 1);
        }
        streamData[thisIndex] = [data];
        var computed = self.transposer(streamData);
        if (computed !== false) {
            self.push(computed);
        }
    }

    function onFlushed() {
        // remove from _streams? that will lose data... Still thinking about how to handle
        if (++self._closed >= self._streams.length) {
            self.end();
        }
        // Help out our friendly gc
        context = stream = null;
    }

    context.stream
    .on("data", function(data) {
        context.buffer.push(data);
        if (context.check || (context.pending > 0 && context.pending--)) {
            check(data);
        }
    })
    .once("end", onFlushed)
    .once("finish", onFlushed);

    return this;
};

/**
 * Base transposer. Aggregates stream data in an array
 * Supports streams that produce Objects and Arrays
 */
Fusa.prototype.transposer = function baseTransposer(streamData) {
    var transposed = [];
    for (var i = 0, length = streamData.length; i < length; i++) {
        transposed.push(streamData[i][this.bufferMatch >>> 1]);
    }
    return transposed;
};

Fusa.prototype.end = function() {
    this._streams = null;
    TransformStream.prototype.end.call(this);
};

module.exports = Fusa;

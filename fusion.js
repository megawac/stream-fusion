"use strict";

var TransformStream = require("stream").Transform;
var utils = require("util");
var assert = require("assert");

// @TODO: Switch to offical version after the following are merged
//     - https://github.com/trevnorris/cbuffer/pull/14
//     - https://github.com/trevnorris/cbuffer/pull/15
//     - https://github.com/trevnorris/cbuffer/pull/17
var CBuffer = require("CBuffer");
var _ = require("underscore");
var logging = require("logging").from("stream-fusion");

/**
 * Docs Docs Docs
 *
 * @param stream*|Array[stream*] streams to fuse
 * @param {Object} [options]
 */
function Fusa( /* **streams, [options] */ ) {
    if (!(this instanceof Fusa)) return new Fusa(arguments);

    var args = _.flatten(arguments);
    var streams = _.filter(args, "stream");
    var options = _.difference(args, streams)[0];
    options = _.extend({
        objectMode: true,
        bufferLength: 1000,
        buffer: 2
    }, options);

    TransformStream.call(this, options);

    if (options.transform) {
        this.transform = options.transform;
    }

    this._streams = [];
    this._closed = 0;
    this.bufferLength = +options.bufferLength;
    this.bufferWindow = +options.buffer;
    this._maxRechecks = options.maxRechecks != null ? +options.maxRechecks : this.bufferWindow;

    assert(_.any(streams, "check"), "This stream will never emit data.\n" +
        "Ensure a `check` bool is set on one of the streams");

    for (var index = 0; index < streams.length; index++) {
        this.addStream(streams[index]);
    }

    _.defer(function transposerWarning(fusa) {
        if (fusa.transform === Fusa.prototype.transform) {
            logging("Note: you probably should reimplement the base transform");
        }
    }, this);
}

utils.inherits(Fusa, TransformStream);

/**
 * Add a stream to the watched items.
 */
Fusa.prototype.addStream = function(stream) {
    assert(_.has(stream, "stream"), "A `stream` property must be set");
    assert(_.has(stream, "key"), "A `key` function or string must be set");
    var getter = _.iteratee(stream.key);
    var context = {
        stream: stream.stream,
        getter: getter,
        // Circular buffer to store stream contents as we receive them
        // Used to match old items
        buffer: new CBuffer(this.bufferLength),
        comparitor: function(a, b) {
            // >= so equal items are included in the window
            return a >= getter(b) ? 1 : -1;
        },
        pendingQueue: []
    };
    var self = this;
    var thisIndex = this._streams.push(context) - 1;
    function onFlushed() {
        // remove from _streams? that will lose data... Still thinking about how to handle
        if (++self._closed >= self._streams.length) {
            self.end();
        }
    }

    if (stream.check) {
        // Set up the method for checking and merging all the streams
        // when a "data" event occurs on a watched item
        context.check = function check(data, recheckAttempts) {
            // will be a multi dimensional array:
            //  [[stream1b4, stream1aft], [stream2b4, stream2aft], [watchedstream]]
            var buffer = self.bufferWindow;
            var index = 0, length = self._streams.length;
            var streamData = Array(length);
            for (; index < length; index++) {
                if (index === thisIndex) continue;
                var currentStream = self._streams[index];
                // Could avoid looking up if it is obviously out of bounds
                var sidx = currentStream.buffer.sortedIndex(context.getter(data), currentStream.comparitor);

                // outside of the buffer range. Check again some other time
                if (sidx < buffer || currentStream.buffer.size + 1 < sidx + buffer) {
                    if (recheckAttempts < self._maxRechecks) {
                        currentStream.pendingQueue.push({
                            context: context,
                            data: data,
                            checked: recheckAttempts + 1
                        });
                    }
                    return;
                }
                streamData[index] = currentStream.buffer.slice(sidx - buffer, sidx + buffer - 1);
            }
            streamData[thisIndex] = [data];
            self.transform(streamData);
        };
    }

    context.stream.on("data", function(data) {
        context.buffer.push(data);
        if (context.check) {
            context.check(data, -1);
        }
        if (context.pendingQueue.length) {
            // Recheck a item that got placed in the queue as we got new data now...
            // inefficent - could be made smarter.
            // Careful though or you'll wind up in an infinite loop on the current item
            var pendingQueue = context.pendingQueue;
            context.pendingQueue = [];
            for (var index = 0, length = pendingQueue.length; index < length; index++) {
                var pendingItem = pendingQueue[index];
                pendingItem.context.check(pendingItem.data, pendingItem.checked);
            }
        }
    })
    .once("end", onFlushed)
    .once("finish", onFlushed);

    return this;
};

/**
 * Base transform. Aggregates stream data in an array
 * Supports streams that produce Objects and Arrays
 */
Fusa.prototype.transform = function baseTransposer(streamData) {
    var window = this.bufferWindow;
    this.push(_.map(streamData, function(data) {
        return data[Math.min(data.length, window) - 1];
    }));
};

// Fusa.prototype.resume = function() {
//     _.chain(this._streams).pluck("stream").invoke("resume");
//     return TransformStream.prototype.resume.call(this);
// };

// Fusa.prototype.pause = function() {
//     _.chain(this._streams).pluck("stream").invoke("pause");
//     return TransformStream.prototype.pause.call(this);
// };

// Defer temporarily in case theres about to be something written
// Docs claim this shouldn't be necessary (http://nodejs.org/api/stream.html#stream_events_finish_and_end)
// but couldn't get it working without some logic here :/
// Alternatively we can pause all the streams being observed (uncomment lines above)
function endAfterDeque(stream) {
    if (stream._readableState.buffer.length) {
        _.defer(endAfterDeque, stream);
    } else {
        stream._streams = null;
        return TransformStream.prototype.end.call(stream);
    }
}

Fusa.prototype.end = function() {
    return endAfterDeque(this);
};

module.exports = Fusa;

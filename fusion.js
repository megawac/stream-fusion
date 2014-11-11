"use strict";

var TransformStream = require("stream").Transform;
var utils = require("util");
var assert = require("assert");

// @TODO: Switch to offical version after the following are merged
//     - https://github.com/trevnorris/cbuffer/pull/14
//     - https://github.com/trevnorris/cbuffer/pull/15
//     - https://github.com/trevnorris/cbuffer/pull/17
var CBuffer = require("CBuffer-fusion");
var _ = require("underscore");
var logging = require("logging").from("stream-fusion");

/**
 * Docs Docs Docs
 *
 * @param [stream config]* streams to fuse
 * @param {Object} [options]
 */
function Fusa( /* **streams, [options] */ ) {
    if (!(this instanceof Fusa)) return new Fusa(arguments);

    var args = _.flatten(arguments);
    var streams = _.filter(args, "stream");
    var options = _.difference(args, streams)[0];
    this.options = _.extend({
        objectMode: true,
        bufferLength: 1000,
        buffer: 0
    }, options);

    if (_.isFunction(this.options.transform)) {
        this.transform = this.options.transform;
    }

    this._streams = [];
    this._closed = 0;
    TransformStream.call(this, _.pick(this.options, "objectMode"));

    assert(_.any(streams, "check"), "This stream will never emit data.\n" +
        "Ensure a `check` bool is set on one of the streams");

    _.each(streams, this.addStream, this);

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
        // Used to match old items and compute buffered windows
        buffer: new CBuffer(_.result(stream, "bufferLength", this.options.bufferLength)),
        bufferLeft: _.result(stream, "bufferLeft", this.options.buffer),
        // + 1 to account for the current index
        bufferRight: _.result(stream, "bufferRight", this.options.buffer) + 1,
        comparitor: function(a, b) {
            // >= so equal items are included in the window
            var computed = getter(b);
            // if (a == computed) console.log(a, b);
            return a > computed ? 1 : computed > a ? -1 : 0;
        },
        pendingQueue: [],
        maxRechecks: stream.maxRechecks
    };
    var self = this;
    var thisIndex = this._streams.push(context) - 1;

    _.defaults(context, {
        maxRechecks: _.result(this.options, "maxRechecks", (context.bufferLeft + context.bufferRight) * 2)
    });

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
            var index = 0, length = self._streams.length;
            var streamData = Array(length);
            var computedVal = context.getter(data);
            for (; index < length; index++) {
                if (index === thisIndex) continue;
                var currentStream = self._streams[index];
                
                // Compute the appropriate index of the data via comparitor
                // @TODO Could avoid looking up if it is obviously out of bounds
                var sidx = currentStream.buffer.sortedIndex(computedVal, currentStream.comparitor);

                // outside of the buffer range. Check again some other time
                if (sidx < currentStream.bufferLeft ||
                    currentStream.buffer.size < sidx + currentStream.bufferRight) {
                    if (recheckAttempts < currentStream.maxRechecks) {
                        currentStream.pendingQueue.push({
                            context: context,
                            data: data,
                            checked: recheckAttempts + 1
                        });
                    }
                    return;
                }
                // Circular slice to get the window
                streamData[index] = currentStream.buffer.slice(sidx - currentStream.bufferLeft,
                                                                sidx + currentStream.bufferRight);
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
    var streams = this._streams;
    this.push(_.map(streamData, function(data, index) {
        return data[Math.min(data.length - 1, streams[index].bufferLeft)];
    }));
};

// Defer temporarily in case theres about to be something written
// Docs claim this shouldn't be necessary (http://nodejs.org/api/stream.html#stream_events_finish_and_end)
// but couldn't get it working without some logic here :/
// Alternatively we can pause all the streams being observed (uncomment lines above)
function endAfterDeque(stream) {
    if (stream._readableState.buffer.length) {
        _.defer(endAfterDeque, stream);
    } else {
        stream._streams = stream.options = null;
        TransformStream.prototype.end.call(stream);
    }
    return stream;
}

Fusa.prototype.end = function() {
    return endAfterDeque(this);
};

module.exports = Fusa;

"use strict";

var TransformStream = require("stream").Transform;
var _ = require("underscore");
var CBuffer = require("CBuffer");
var utils = require("util");
var assert = require("assert");
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

    if (options.transposer) {
        this.transposer = options.transposer;
    }

    this._streams = [];
    this._closed = 0;
    this.objectMode = !!options.objectMode;
    this.bufferLength = +options.bufferLength;
    this.bufferWindow = +options.buffer;
    this._maxRechecks = options.maxRechecks != null ? +options.maxRechecks : this.bufferWindow;

    assert(_.any(streams, "check"), "This stream will never emit data.\n" +
        "Ensure a `check` bool is set on one of the streams");

    for (var index = 0; index < streams.length; index++) {
        this.addStream(streams[index]);
    }

    _.defer(function transposerWarning(fusa) {
        if (fusa.transposer === Fusa.prototype.transposer) {
            logging("Note: you probably should reimplement the base transposer");
        }
    }, this);
}

utils.inherits(Fusa, TransformStream);

/**
 * Add a stream to the watched items.
 *
 *
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
        context = null;
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
            var computed = self.transposer(streamData);
            if (computed !== false) {
                self.push(computed);
            }
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
 * Base transposer. Aggregates stream data in an array
 * Supports streams that produce Objects and Arrays
 */
Fusa.prototype.transposer = function baseTransposer(streamData) {
    var transposed = [];
    for (var i = 0, length = streamData.length; i < length; i++) {
        transposed.push(streamData[i][Math.min(streamData[i].length, this.bufferWindow) - 1]);
    }
    return transposed;
};

Fusa.prototype.resume = function() {
    console.warn("todo: resume");
    // _.chain(this._streams).pluck("stream").invoke("resume");
    return TransformStream.prototype.resume.call(this);
};

Fusa.prototype.pause = function() {
    console.warn("todo: pause");
    // _.chain(this._streams).pluck("stream").invoke("pause");
    return TransformStream.prototype.pause.call(this);
};

Fusa.prototype.end = function() {
    this._streams = null;
    TransformStream.prototype.end.call(this);
};

module.exports = Fusa;

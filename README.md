Stream-Fusion
==========

Relationally join streams.

## Use case

[Sensor fusion](http://en.wikipedia.org/wiki/Sensor_fusion) - combining multiple streams of timestamped sensor data.

## Contract and usage

`var fuser = new StreamFusion([stream*], [options])`

Where a stream is an object such that

```js
{
  stream: /* a Node.js compatiable stream */
  key: /* how to compare a stream to another stream (should return a integer or string). See http://underscorejs.org/#iteratee */
  check: /* [default=false] whether the fusion stream should (try to) emit data whenever this stream emits data */
}
```

And options is of the form

```js
{
  objectMode: /* [default=true] should the stream be in objectMode */
  buffer: /* [default=2] the window to the left and right closest to the value being checked (i.e. if buffer is 2 then transposer will be called with `[valueBelowCheck, valueAboveCheck]`). Note: values will be buffered internally until there is enough info to the left and right of the window. Implementation note: the value in the middle will always be `<=` the value being checked */
  bufferLength: /* [default=1000] how much historical data should be kept. If streams are in sync you should definetely set this to a low value */
  maxRechecks: /* [default=options.buffer] The num of times to fit any piece of data in the window (see options.buffer) */
}
```

You can create a `transposer` to decide how the fused stream should emit data. The transposer will be called with (in the case that stream 1 is being checked) `[[stream0Window], [valueBeingChecked], [stream2Window]]`. Where window refers to an array of size `options.buffer * 2 - 1` of the values `buffer` len to the left and right of the closest value in each stream.

By default (in the case that stream 1 is the stream being checked) it will be called with `[[closestValueFromStream0], [valueBeingChecked], [closestValueFromStream2]]`

----------------

The fused stream is simply a [`Node.js Stream`](http://nodejs.org/api/stream.html) and should be used as such

## Example

```js
var Fuse = require('stream-fusion')

var fused = new Fuse({
    stream: streamA,
    key: "timestamp"
  },
  {
      stream: streamB,
      key: function(streamedItem) {
        return streamedItem.timestamp
      },
      check: true
  },
  {
      bufferLength: 20
});

fused.on("data", function(streamWindows) {
  /* work */
});

fused.pipe(process.stdout);
```

Closer to realistic example

```js
var Ros = require("roslibjs/src/core/Ros");
var ros = new Ros("connect to rosbridge");

var mruStream = ros.Topic({
    name: "/kf/mru"
});

var gpsStream = ros.Topic({
    name: "/kf/gps"
});

var sonarStream = ros.Topic({
    name: "/kf/sonar"
});

var fusionStream = ros.Topic({
    name: "/kf/sonar"
});

var Fusion = require("stream-fusion");

var fused = new Fusion({stream: mruStream, key: "timestamp"},
                {stream: gpsStream, key: "timestamp"},
                {stream: sonarStream, key: "timestamp", check: true},
                {bufferLength: 50, buffer: 5});

fused.transposer = function(streamData) {
    var mruWindow = streamData[0];
    var gpsWindow = streamData[1];
    var sonarValue = streamData[2][0];

    return /* computed value in window */
};

fused.on("data", function(fusedData) {
    fusionStream.publish(fusedData);
});
```
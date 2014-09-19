Stream-Fusion
==========

Relationally Style join streams.

## Use case

[Sensor fusion](http://en.wikipedia.org/wiki/Sensor_fusion) - combining multiple streams of timestamped sensor data.

## Contract and usage

`var fuser = new StreamFusion([stream*], [options])`

Where a stream is an object such that

```
{
  stream: /* a Node.js compatiable stream */
  key: /* how to compare a stream to another stream (should return a integer or string). See http://underscorejs.org/#iteratee */
  check: /* [default=false] whether the fusion stream should (try to) emit data whenever this stream emits data */
}
```

And options is of the form

```
{
  objectMode: /* [default=true] should the stream be in objectMode */
  buffer: /* [default=2] the window to the left and right closest to the value being checked (i.e. if buffer is 2 then transposer will be called with `[valueBelowCheck, valueAboveCheck]`) */
  bufferLength: /* [default=1000] how much historical data should be kept. If streams are in sync you should definetely set this to a low value */

}
```

You can create a `transposer` to decide how the fused stream should emit data. The transposer will be called with (in the case that stream 1 is being checked) `[[stream0Window], [valueBeingChecked], [stream2Window]]`. Where window refers to an array of size `options.buffer * 2 - 1` of the values `buffer` len to the left and right of the closest value in each stream.

By default (in the case that stream 1 is the stream being checked) it will be called with `[[closestValueFromStream0], [valueBeingChecked], [closestValueFromStream2]]`

----------------

The fused stream is simply a [`Node.js Stream`](http://nodejs.org/api/stream.html) and should be used as such

## Example

``` js
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

Stream-Fusion [![](https://magnum.travis-ci.com/megawac/stream-fusion.svg?token=oSwrxUEG4V38qpMqB1xp)](https://magnum.travis-ci.com/megawac/stream-fusion)
==========
Relationally join streams based on some computated, comparable (but not necessarily equal) `key` (e.g. a time stamp). For instance, this is useful for [sensor fusion](http://en.wikipedia.org/wiki/Sensor_fusion) - combining multiple streams of timestamped sensor data.
This project was developed for [Clearpath Robotics](http://www.clearpathrobotics.com/).

Terrible documentation incoming...

## Contract and usage

`var fuser = new StreamFusion([stream*], [options])`

Where a stream is an object such that

```js
{
  stream: /* a Node.js compatiable stream */
  key: /* how to compare a stream to another stream (should return a integer or string). See http://lodashjs.org/#iteratee */
  check: /* [default=false] whether the fusion stream should (try to) emit data whenever this stream emits data */
  bufferLeft: [default=options.buffer] how many items to the left of the current item to include in the window
  bufferRight: [default=options.buffer] how many items to the right of the current item to include in the window
  // Note if bufferLeft and bufferRight is unset we'll use options.buffer and the closest value will be in the middle
  maxRechecks: /* [default=options.buffer * 2] The num of times to fit any piece of data in the window (see options.buffer) */
  bufferLength: /* [default=options.bufferLength] how much historical data should be kept. If streams are in sync you should definetely set this to a low value */
}
```

And options is of the form

```js
{
  objectMode: /* [default=true] should the stream be in objectMode */
  buffer: /* [default=2] the window to the left and right closest to the value being checked (i.e. if buffer is 1 then transform will be called with `[valueBelowCheck, valueAboveCheck]`). Note: values will be buffered internally until there is enough info to the left and right of the window. Implementation note: the value in the middle will always be `<=` the value being checked */
  bufferLength: /* [default=1000] useful for post processing */
  maxRechecks: see above
}
```

You can create a `transform` to decide how the fused stream should emit data. The transform will be called with (in the case that stream 1 is being checked) `[[stream0Window], [valueBeingChecked], [stream2Window]]`. Where window for a given stream refers to an array of size `leftBuffer + rightBuffer + 1` of the values, (obviously `bufferLeft` len to the left and `bufferRight` items to the right of the closest value in each stream. Call `this.push` in `transform` to publish data

```js
fusionStream.transform = function(streams) {
  var stream0 = streams[0],
      streams1 = streams[1];

  this.push({"cat": streams0[0].id, "time": streams1[1].time});
  // Call push as many times as you want doing whatever u want to publish to the stream
};
```

By default (in the case that stream 1 is the stream being checked) it will be called with `[[closestValueFromStream0], [valueBeingChecked], [closestValueFromStream2]]`

----------------

The fused stream is simply a [`Node.js Stream`](http://nodejs.org/api/stream.html) and should be used as such

# Algorithm

I spent a good amount of time developing an optimal algorithm for processing this problem, while still leaving a powerful and flexible API. Under the hood, we leverage many of the features of the [Node stream API](http://nodejs.org/api/stream.html), [circular lists](https://github.com/megawac/cbuffer)

- Create a circular list of length `bufferLength` for each provided list
- Start listening for data from each stream or finished events on each stream

#### Non watched streams new data
- Append an item to the corresponding circular buffer
- Check if any watch streams have data buffered dependent on new messages from this stream. For example if the `buffer` is `3` and the key is based on timestamp, we would have to wait for 2 to 3 (depending if the messages fire on the same millisecond) new messages for enough data to have give a window of 2 items to the right (2 to the left) of the closest value
    - If there is data being buffered dependent on this stream proceed to the checked stream algorithm

#### Checked stream new data
- For each stream (besides the one being checked)
    - Do a [circular binary search](https://github.com/trevnorris/cbuffer/pull/14) to find the index of the comparitively closest value in the streams (sorted) circular buffer. Note: smaller `bufferLength`s will yield fewer the iterations in the search
    - If there are enough (`buffer` size) items to the left and right of the `index`
        - Do a circular `slice` on the items `buffer` indexs to the left and right of the `index`
        - `continue` looping through the streams 
    - Otherwise enqueue the current data from this stream to be checked later (see above). (Abort)
- If enough data has been seen from each stream call the `transform` stream with the data in each window

## Example <sub>(see tests for more examples)</sub>

Using [roslibjs](https://github.com/RobotWebTools/roslibjs) and [node-serialport](https://github.com/voodootikigod/node-serialport) we can create fusion windows based on timestamps (in different time formats).

```js
var Ros = require("roslibjs/src/core/Ros");
var ros = new Ros("connect to rosbridge");
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var through = require("through2")

var accelerometerStream = ros.Topic({
  name: "/accelerometer/data"
}).toStream();

var gpsStream = ros.Topic({
  name: "/navsat/fix"
}).toStream();

// Connect to some serial device (e.g. GPS) and pipe through nmea transform
var compassStream = new SerialPort("/dev/tty-usbserial1", {
  parser: serialport.parsers.raw
})
.pipe(require("nmea").createDefaultTransformer())
.pipe(through.obj(function(chunk, enc, callback) {
  chunk.timestamp = Date.now();
  callback();
}));

var Fusion = require("stream-fusion");

// Convert time in nanosecs to ms
function headerToTimestamp(item) {
  return item.header.stamp.secs * 10e2 + item.header.stamp.nsecs / 10e5;
}

var fused = new Fusion(
    // inherit options
    {stream: accelerometerStream, key: headerToStamp, bufferLength: 50},
    // explictly set buffer sizes
    {stream: gpsStream, key: headerToStamp, bufferLeft: 5, bufferRight: 2, bufferLength: 10},
    {stream: compassStream, key: "timestamp", check: true},
    // Options
    {bufferLength: 50, buffer: 2}
);

fused.transform = function(streamData) {
  var accelerometerWindow = streamData[0];
  var gpsWindow = streamData[1];
  var compassValue = streamData[2][0];

  this.push( /* computed value in window */ );
  // can push as many times as desired but only one item per push
};

// Pipe the live data out
fused.pipe(fusionTopic.toStream());
```

#### Post processing stream fusion example

For post processing, it's important to set a large `bufferLength` and high `maxRetries` value in order to prevent losing data. Otherwise the API remains the same :)

```js
var fs = require("fs");
var http = require("http");
var csv = require("csv-stream");
var Fusion = require("stream-fusion");

var marketStream = fs.readFile("../transactions.log").pipe(csv);
var exchangeRateStream = http.get(/* exchange rate service */).pipe(csv)

var fused = new Fusion(
  // Use a large buffer so we don't lose any transactions
  {stream: marketStream, key: "timestamp", check: true, bufferLength: 10e5, maxRetries: 10e3, buffer: 1},
  {stream: exchangeRateStream, key: function(row) {
    // for instance
    return new Date(row.year, row.month, row.day, row.hour, row.minute);
  }, check: false, bufferLength: 10e4, bufferLeft: 1, bufferRight: 1}
);

fused.transform = function(window) {
  var marketItem = window[0][0];
  var exchangeData = window[1];

  // Do a IDW calculation or something to match the data to the time stamp of the transaction
  var computed = f();

  this.push(computed);
}

fused.pipe(/* wherever*/ );
```

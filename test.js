const HLS = require('hls-parser');
var request = require('sync-request')
var lastKnownSegment = -1;
var timeMaps = {
  // contains {segment_name/url: time} pairs 
  // time = 0 is reference to first segment seen by this app.
};

// THis is just for testing. For live all the segments need to be mapped for time and it has to be an ongoing process.
// It does not mean that for each segment to be mapped with time , we have to mark with system timestamp. 
// Once we have marked 1 segment/ 2 segments with availability time . 
// the further segments after that can be marked by using previous segment's time.
const MAX_SEGMENTS_TO_MAP = 5;  
const REQUEST_AHEAD_TIME = 250; // milliseconds
var secondSegmentNoted = false;
var lastSegmentDuration = 0;
var segmentsMapped = 0;

function updateStreamStamps() {
  // This is just a sample live stream. Has a chance to fail!
  var data = request('GET', "http://scheduler.prolivestream.net:8080/streams/322/out_0.m3u8");
  const playlist = HLS.parse(data.getBody().toString());
  // You can access the playlist as a JS object
  if (playlist.isMasterPlaylist) {
    // Master playlist
    // We may need to add option to do this operation from master playlist URL if the live URL is something that can be
    // randomly given/provided by a client or some other subsystem not under our control.
  } else {
    // Media playlist
    if(lastKnownSegment === -1) {   // Identifying first entry segment 
      lastKnownSegment = playlist.segments.slice(-1)[0].uri;
      timeMaps[lastKnownSegment] = 0 ;      // THis segment might have been available well before we found it
      setTimeout(updateStreamStamps, 0);    // We poll continuously to get the second segment , so that it is as accurate as possible.
    }
    else {
      if(playlist.segments.slice(-1)[0].uri === lastKnownSegment) {
        setTimeout(updateStreamStamps, 0);    // If Next segment identification request timed at segmentDuration - REQUEST_AHEAD_TIME 
                                              // then next polling requests are made with 0 timeout continuously to avoid much delay.
      }
      else {
        const currentSegment = playlist.segments.slice(-1)[0];  // Get the last segment from the playlist - this is our current reference point to start with. 
                                                                // noting previous segments will be of no use 
        var lastSegmentTime = timeMaps[lastKnownSegment];
        lastKnownSegment = currentSegment.uri;
        if(secondSegmentNoted){
          timeMaps[lastKnownSegment] = (new Date()).getTime() ;   // Note time for second segment - our base time that will be used for time calc of other segments.
          secondSegmentNoted = true;
        }
        else {
          timeMaps[lastKnownSegment] = lastSegmentDuration + lastSegmentTime; // millis
        }
        if(segmentsMapped < MAX_SEGMENTS_TO_MAP ) 
          setTimeout(updateStreamStamps, currentSegment.targetDuration * 1000 - REQUEST_AHEAD_TIME); 
        else {
          console.log(JSON.stringify(timeMaps));
          process.exit(); // This is test program so we dont want this to run for ever. YOu can change the behavior to run forever printing the timemap as its noted.
        }
        segmentsMapped++;
        lastSegmentDuration = currentSegment.targetDuration * 1000;
      }
    }
  }
}

updateStreamStamps();

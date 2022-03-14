const HLS = require('hls-parser');
var request = require('sync-request')
var lastKnownSegment = -1;
var timeMaps = {
  // contains segment_name: time pairs 
  // time = 0 is reference to first segment seen by this app.
};

const MAX_SEGMENTS_TO_MAP = 5;
var segmentsMapped = 0;

function updateStreamStamps() {
  var data = request('GET', "http://scheduler.prolivestream.net:8080/streams/322/out_0.m3u8");
  const playlist = HLS.parse(data.getBody().toString());
  // You can access the playlist as a JS object
  if (playlist.isMasterPlaylist) {
    // Master playlist
  } else {
    // Media playlist
    if(lastKnownSegment === -1) {
      lastKnownSegment = playlist.segments.slice(-1)[0].uri;
      timeMaps[lastKnownSegment] = 0 ;      // THis segment might have been available well before we found it
      setTimeout(updateStreamStamps, 0);
    }
    else {
      if(playlist.segments.slice(-1)[0].uri === lastKnownSegment) {
        setTimeout(updateStreamStamps, 0);
      }
      else {
        const currentSegment = playlist.segments.slice(-1)[0];
        lastKnownSegment = currentSegment.uri;
        timeMaps[lastKnownSegment] = (new Date()).getTime() ;
        if(segmentsMapped < MAX_SEGMENTS_TO_MAP ) 
         setTimeout(updateStreamStamps, currentSegment.targetDuration * 1000); 
        else {
          console.log(JSON.stringify(timeMaps));
          process.exit();
        }
        segmentsMapped++;
      }
    }
  }
}

updateStreamStamps();

/*
YouTubeAPI.videos.list({
  part: "snippet",
  id: videoID
}, function (err, data) {});
 */

 // https://developers.google.com/youtube/v3/docs/videos

const YouTubeAPI = {
  videos: {
    list: (obj, callback) => {
      if (obj.videoID === "knownWrongID") {
        callback(undefined, {
          pageInfo: {
            totalResults: 0
          },
          items: []
        });
      } else {
        callback(undefined, {
          pageInfo: {
            totalResults: 1
          },
          items: [
            {
              contentDetails: {
                duration: "PT1H23M30S"
              }
            }
          ]
        });
      }
    }
  }
};

module.exports = YouTubeAPI;
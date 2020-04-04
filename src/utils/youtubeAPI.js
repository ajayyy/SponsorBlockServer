var config = require('../config.js');

// YouTube API
const YouTubeAPI = require("youtube-api");

var exportObject;
// If in test mode, return a mocked youtube object
//   otherwise return an authenticated youtube api
if (config.mode === "test") {
    exportObject = require("../../test/youtubeMock.js");
} else {
    YouTubeAPI.authenticate({
        type: "key",
        key: config.youtubeAPIKey
    });
    exportObject = YouTubeAPI;
}

module.exports = exportObject;
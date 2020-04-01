var config = require('../config.js');

// YouTube API
const YouTubeAPI = require("youtube-api");
YouTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey
});
module.exports = YouTubeAPI;
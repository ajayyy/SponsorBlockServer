var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));

// YouTube API
const YouTubeAPI = require("youtube-api");
YouTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey
});
module.exports = YouTubeAPI;
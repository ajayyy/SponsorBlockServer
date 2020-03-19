// YouTube API
const YouTubeAPI = require("youtube-api");
YouTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey
});
module.exports = YouTubeAPI;
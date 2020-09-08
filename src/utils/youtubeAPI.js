var config = require('../config.js');

// YouTube API
const YouTubeAPI = require("youtube-api");
const redis = require('./redis.js');
const logger = require('./logger.js');

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

    // YouTubeAPI.videos.list wrapper with cacheing
    exportObject.listVideos = (videoID, part, callback) => {
        let redisKey = "youtube.video." + videoID + "." + part;
        redis.get(redisKey, (getErr, result) => {
            if (getErr || !result) {
                logger.debug("redis: no cache for video information: " + videoID);
                YouTubeAPI.videos.list({
                    part,
                    id: videoID
                }, (ytErr, data) => {
                    if (!ytErr) {
                        // Only set cache if data returned
                        if (data.items.length > 0) {
                            redis.set(redisKey, JSON.stringify(data), (setErr) => {
                                if(setErr) {
                                    logger.warn(setErr);
                                } else {
                                    logger.debug("redis: video information cache set for: " + videoID);
                                }
                                callback(false, data); // don't fail
                            });
                        } else {
                            callback(false, data); // don't fail
                        }
                    } else {
                        callback(ytErr, data)
                    }
                });
            } else {
                logger.debug("redis: fetched video information from cache: " + videoID);
                callback(getErr, JSON.parse(result));
            }
        });
    };
}

module.exports = exportObject;
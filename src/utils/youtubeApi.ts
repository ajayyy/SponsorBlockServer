import {config} from '../config';
import {Logger} from './logger';
import * as redis from './redis';
// @ts-ignore
import YouTubeAPI from 'youtube-api';

import {YouTubeAPI as youtubeApiTest} from '../../test/youtubeMock';

let _youtubeApi: {
    listVideos: (videoID: string, callback: (err: string | boolean, data: any) => void) => void
};
// If in test mode, return a mocked youtube object
//   otherwise return an authenticated youtube api
if (config.mode === "test") {
    _youtubeApi = youtubeApiTest;
}
else {
    _youtubeApi = YouTubeAPI;

    YouTubeAPI.authenticate({
        type: "key",
        key: config.youtubeAPIKey,
    });

    // YouTubeAPI.videos.list wrapper with cacheing
    _youtubeApi.listVideos = (videoID: string, callback: (err: string | boolean, data: any) => void) => {
        const part = 'contentDetails,snippet';
        if (videoID.length !== 11 || videoID.includes(".")) {
            callback("Invalid video ID", undefined);
            return;
        }

        const redisKey = "youtube.video." + videoID;
        redis.get(redisKey, (getErr: string, result: string) => {
            if (getErr || !result) {
                Logger.debug("redis: no cache for video information: " + videoID);
                YouTubeAPI.videos.list({
                    part,
                    id: videoID,
                }, (ytErr: boolean | string, data: any) => {
                    if (!ytErr) {
                        // Only set cache if data returned
                        if (data.items.length > 0) {
                            redis.set(redisKey, JSON.stringify(data), (setErr: string) => {
                                if (setErr) {
                                    Logger.warn(setErr);
                                } else {
                                    Logger.debug("redis: video information cache set for: " + videoID);
                                }
                                callback(false, data); // don't fail
                            });
                        } else {
                            callback(false, data); // don't fail
                        }
                    } else {
                        callback(ytErr, data);
                    }
                });
            } else {
                Logger.debug("redis: fetched video information from cache: " + videoID);
                callback(getErr, JSON.parse(result));
            }
        });
    };
}

export {
    _youtubeApi as YouTubeAPI
}

import {config} from '../config';
import {Logger} from './logger';
import * as redis from './redis';
// @ts-ignore
import _youTubeAPI from 'youtube-api';

_youTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey,
});

export class YouTubeAPI {
    static listVideos(videoID: string, callback: (err: string | boolean, data: any) => void) {
        const part = 'contentDetails,snippet';
        if (!videoID || videoID.length !== 11 || videoID.includes(".")) {
            callback("Invalid video ID", undefined);
            return;
        }

        const redisKey = "youtube.video." + videoID;
        redis.get(redisKey, (getErr: string, result: string) => {
            if (getErr || !result) {
                Logger.debug("redis: no cache for video information: " + videoID);
                _youTubeAPI.videos.list({
                    part,
                    id: videoID,
                }, (ytErr: boolean | string, { data }: any) => {
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

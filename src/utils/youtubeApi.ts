import {config} from '../config';
import {Logger} from './logger';
import redis from './redis';
// @ts-ignore
import _youTubeAPI from 'youtube-api';

_youTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey,
});

export class YouTubeAPI {
    static async listVideos(videoID: string, ignoreCache = false): Promise<{err: string | boolean, data?: any}> {
        const part = 'contentDetails,snippet';
        if (!videoID || videoID.length !== 11 || videoID.includes(".")) {
            return { err: "Invalid video ID" };
        }

        const redisKey = "youtube.video." + videoID;
        if (!ignoreCache) {
            const {err, reply} =  await redis.getAsync(redisKey);

            if (!err && reply) {
                Logger.debug("redis: no cache for video information: " + videoID);

                return { err: err?.message, data: JSON.parse(reply) }
            }
       }

        try {
            const { ytErr, data } = await new Promise((resolve) => _youTubeAPI.videos.list({
                part,
                id: videoID,
            }, (ytErr: boolean | string, result: any) => resolve({ytErr, data: result?.data})));

            if (!ytErr) {
                // Only set cache if data returned
                if (data.items.length > 0) {
                    const { err: setErr } = await redis.setAsync(redisKey, JSON.stringify(data));

                    if (setErr) {
                        Logger.warn(setErr.message);
                    } else {
                        Logger.debug("redis: video information cache set for: " + videoID);
                    }

                    return { err: false, data }; // don't fail
                } else {
                    return { err: false, data }; // don't fail
                }
            } else {
                return { err: ytErr, data };
            }
        } catch (err) {
            return {err, data: null}
        }       
    }
}

import fetch from 'node-fetch';
import {config} from '../config';
import {Logger} from './logger';
import redis from './redis';
import { APIVideoData, APIVideoInfo } from '../types/youtubeApi.model';

export class YouTubeAPI {
    static async listVideos(videoID: string, ignoreCache = false): Promise<APIVideoInfo> {
        if (!videoID || videoID.length !== 11 || videoID.includes(".")) {
            return { err: "Invalid video ID" };
        }

        const redisKey = "yt.newleaf.video." + videoID;
        if (!ignoreCache) {
            const {err, reply} =  await redis.getAsync(redisKey);

            if (!err && reply) {
                Logger.debug("redis: no cache for video information: " + videoID);

                return { err: err?.message, data: JSON.parse(reply) }
            }
        }

        if (!config.newLeafURL) return {err: "NewLeaf URL not found", data: null};

        try {
            const result = await fetch(config.newLeafURL + "/api/v1/videos/" + videoID, { method: "GET" });

            if (result.ok) {
                const data = await result.json();
                if (data.error) {
                    Logger.warn("CloudTube API Error: " + data.error)
                    return { err: data.error, data: null };
                }

                redis.setAsync(redisKey, JSON.stringify(data)).then((result) => {
                    if (result?.err) {
                        Logger.warn(result?.err.message);
                    } else {
                        Logger.debug("redis: video information cache set for: " + videoID);
                    }
                });
                
                return { err: false, data };
            } else {
                return { err: result.statusText, data: null };
            }
        } catch (err) {
            return {err, data: null}
        }       
    }
}

export function getMaxResThumbnail(apiInfo: APIVideoData): string | void {
    return apiInfo?.videoThumbnails?.find((elem) => elem.quality === "maxres")?.second__originalUrl;
}
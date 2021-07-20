import fetch from "node-fetch";
import {config} from "../config";
import {Logger} from "./logger";
import { APIVideoData, APIVideoInfo } from "../types/youtubeApi.model";
import DiskCache from "./diskCache";

export class YouTubeAPI {
    static async listVideos(videoID: string, ignoreCache = false): Promise<APIVideoInfo> {
        if (!videoID || videoID.length !== 11 || videoID.includes(".")) {
            return { err: "Invalid video ID" };
        }

        const cacheKey = `yt.newleaf.video.${videoID}`;
        if (!ignoreCache) {
            try {
                const data = await DiskCache.get(cacheKey);

                if (data) {
                    Logger.debug(`YouTube API: cache used for video information: ${videoID}`);
                    return { err: null, data: JSON.parse(data) };
                }
            } catch (err) {
                return { err };
            }
        }

        if (!config.newLeafURLs || config.newLeafURLs.length <= 0) return {err: "NewLeaf URL not found", data: null};

        try {
            const result = await fetch(`${config.newLeafURLs[Math.floor(Math.random() * config.newLeafURLs.length)]}/api/v1/videos/${videoID}`, { method: "GET" });

            if (result.ok) {
                const data = await result.json();
                if (data.error) {
                    Logger.warn(`NewLeaf API Error for ${videoID}: ${data.error}`);
                    return { err: data.error, data: null };
                }

                DiskCache.set(cacheKey, JSON.stringify(data))
                    .catch((err: any) => Logger.warn(err))
                    .then(() => Logger.debug(`YouTube API: video information cache set for: ${videoID}`));

                return { err: false, data };
            } else {
                return { err: result.statusText, data: null };
            }
        } catch (err) {
            return {err, data: null};
        }
    }
}

export function getMaxResThumbnail(apiInfo: APIVideoData): string | void {
    return apiInfo?.videoThumbnails?.find((elem) => elem.quality === "maxres")?.second__originalUrl;
}
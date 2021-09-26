import { config } from "../config";
import { Logger } from "./logger";
import { APIVideoData, APIVideoInfo } from "../types/youtubeApi.model";
import DiskCache from "./diskCache";
import axios from "axios";

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
                return { err: err as string | boolean, data: null };
            }
        }

        if (!config.newLeafURLs || config.newLeafURLs.length <= 0) return { err: "NewLeaf URL not found", data: null };

        try {
            const result = await axios.get(`${config.newLeafURLs[Math.floor(Math.random() * config.newLeafURLs.length)]}/api/v1/videos/${videoID}`);

            if (result.status === 200) {
                const data = result.data;
                if (data.error) {
                    Logger.warn(`NewLeaf API Error for ${videoID}: ${data.error}`);
                    return { err: data.error, data: null };
                }
                const apiResult = data as APIVideoData;
                DiskCache.set(cacheKey, JSON.stringify(apiResult))
                    .catch((err: any) => Logger.warn(err))
                    .then(() => Logger.debug(`YouTube API: video information cache set for: ${videoID}`));

                return { err: false, data: apiResult };
            } else {
                return { err: result.statusText, data: null };
            }
        } catch (err) {
            return { err: err as string | boolean, data: null };
        }
    }
}

export function getMaxResThumbnail(apiInfo: APIVideoData): string | void {
    return apiInfo?.videoThumbnails?.find((elem) => elem.quality === "maxres")?.second__originalUrl;
}
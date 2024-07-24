import axios from "axios";
import { Logger } from "./logger";
import { innerTubeVideoDetails } from "../types/innerTubeApi.model";
import DiskCache from "./diskCache";

const privateResponse = (videoId: string, reason: string): innerTubeVideoDetails => ({
    videoId,
    title: reason,
    channelId: "",
    // exclude video duration
    isOwnerViewing: false,
    shortDescription: "",
    isCrawlable: false,
    thumbnail: {
        thumbnails: [{
            url: "https://s.ytimg.com/yts/img/meh7-vflGevej7.png",
            width: 140,
            height: 100
        }]
    },
    allowRatings: false,
    viewCount: "0", // yes, don't ask
    author: "",
    isPrivate: true,
    isUnpluggedCorpus: true,
    isLiveContent: false,
    publishDate: ""
});

export async function getFromITube (videoID: string): Promise<innerTubeVideoDetails> {
    // start subrequest
    const url = "https://www.youtube.com/youtubei/v1/player";
    const data = {
        context: {
            client: {
                clientName: "WEB",
                clientVersion: "2.20221215.04.01"
            }
        },
        videoId: videoID
    };
    const result = await axios.post(url, data, {
        timeout: 3500
    });
    /* istanbul ignore else */
    if (result.status === 200) {
        return result.data?.videoDetails ?? privateResponse(videoID, result.data?.playabilityStatus?.reason ?? "Bad response");
    } else {
        return Promise.reject(`Innertube returned non-200 response: ${result.status}`);
    }
}

export async function getPlayerData (videoID: string, ignoreCache = false): Promise<innerTubeVideoDetails> {
    if (!videoID || videoID.length !== 11 || videoID.includes(".")) {
        return Promise.reject("Invalid video ID");
    }

    const cacheKey = `yt.itube.video.${videoID}`;
    if (!ignoreCache) { // try fetching from cache
        try {
            const data = await DiskCache.get(cacheKey);
            if (data) {
                Logger.debug(`InnerTube API: cache used for video information: ${videoID}`);
                return data as innerTubeVideoDetails;
            }
        } catch (err) {
            /* istanbul ignore next */
            return Promise.reject(err);
        }
    }
    try {
        const data = await getFromITube(videoID)
            .catch(/* istanbul ignore next */ err => {
                Logger.warn(`InnerTube API Error for ${videoID}: ${err}`);
                return Promise.reject(err);
            });
        DiskCache.set(cacheKey, data)
            .then(() => Logger.debug(`InnerTube API: video information cache set for: ${videoID}`))
            .catch(/* istanbul ignore next */ (err: any) => Logger.warn(err));
        return data;
    } catch (err) {
        /* istanbul ignore next */
        return Promise.reject(err);
    }
}
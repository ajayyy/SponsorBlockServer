import redis from "../utils/redis";
import { tempVIPKey } from "../utils/redisKeys";
import { HashedUserID } from "../types/user.model";
import { YouTubeAPI } from "../utils/youtubeApi";
import { APIVideoInfo } from "../types/youtubeApi.model";
import { VideoID } from "../types/segments.model";
import { config } from "../config";
import { Logger } from "./logger";

function getYouTubeVideoInfo(videoID: VideoID, ignoreCache = false): Promise<APIVideoInfo> {
    return config.newLeafURLs ? YouTubeAPI.listVideos(videoID, ignoreCache) : null;
}

export const isUserTempVIP = async (hashedUserID: HashedUserID, videoID: VideoID): Promise<boolean> => {
    const apiVideoInfo = await getYouTubeVideoInfo(videoID);
    const channelID = apiVideoInfo?.data?.authorId;
    try {
        const reply = await redis.get(tempVIPKey(hashedUserID));
        return reply && reply == channelID;
    } catch (e) {
        Logger.error(e as string);
        return false;
    }
};
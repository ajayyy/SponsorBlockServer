import redis from "../utils/redis";
import { tempVIPKey } from "../utils/redisKeys";
import { HashedUserID } from "../types/user.model";
import { VideoID } from "../types/segments.model";
import { Logger } from "./logger";
import { getVideoDetails } from "./getVideoDetails";

export const isUserTempVIP = async (hashedUserID: HashedUserID, videoID: VideoID): Promise<boolean> => {
    const apiVideoDetails = await getVideoDetails(videoID);
    const channelID = apiVideoDetails?.authorId;
    try {
        const reply = await redis.get(tempVIPKey(hashedUserID));
        return reply && reply == channelID;
    } catch (e) /* istanbul ignore next */ {
        Logger.error(e as string);
        return false;
    }
};
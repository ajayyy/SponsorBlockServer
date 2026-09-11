import redis from "../utils/redis.js";
import { tempVIPKey } from "../utils/redisKeys.js";
import { HashedUserID } from "../types/user.model.js";
import { VideoID } from "../types/segments.model.js";
import { Logger } from "./logger.js";
import { getVideoDetails } from "./getVideoDetails.js";

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

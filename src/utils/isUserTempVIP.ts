import redis from "#utils/redis";
import { tempVIPKey } from "#utils/redisKeys";
import { Logger } from "#utils/logger";
import { getVideoDetails } from "#utils/getVideoDetails";

import { HashedUserID } from "#types/user";
import { VideoID } from "#types/segments";

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

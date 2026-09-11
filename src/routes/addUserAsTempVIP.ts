import { Request, Response } from "express";

import { VideoID } from "../types/segments.model.js";
import { getVideoDetails } from "../utils/getVideoDetails.js";
import { getHashCache } from "../utils/getHashCache.js";
import { privateDB } from "../databases/databases.js";
import { isUserVIP } from "../utils/isUserVIP.js";
import { HashedUserID } from "../types/user.model.js";
import redis from "../utils/redis.js";
import { tempVIPKey } from "../utils/redisKeys.js";
import { Logger } from "../utils/logger.js";

interface AddUserAsTempVIPRequest extends Request {
    query: {
        userID: HashedUserID;
        adminUserID: string;
        enabled: string;
        channelVideoID: string;
    }
}

const getChannelInfo = async (videoID: VideoID): Promise<{id: string | null, name: string | null }> => {
    const videoInfo = await getVideoDetails(videoID);
    return {
        id: videoInfo?.authorId,
        name: videoInfo?.authorName
    };
};

export async function addUserAsTempVIP(req: AddUserAsTempVIPRequest, res: Response): Promise<Response> {
    const userID = req.query.userID;
    let adminUserID = req.query.adminUserID;

    const enabled = req.query?.enabled === "true";
    const channelVideoID = req.query?.channelVideoID as VideoID;

    if ((!userID || !adminUserID || (!channelVideoID && enabled))) {
        // invalid request
        return res.sendStatus(400);
    }

    // hash the issuer userID
    adminUserID = await getHashCache(adminUserID);
    // check if issuer is VIP
    const issuerIsVIP = await isUserVIP(adminUserID as HashedUserID);
    if (!issuerIsVIP) {
        return res.sendStatus(403);
    }

    // check to see if this user is already a vip
    const targetIsVIP = await isUserVIP(userID);
    if (targetIsVIP) {
        return res.sendStatus(409);
    }

    const startTime = Date.now();

    if (enabled) {
        const dayInSeconds = 86400;
        const channelInfo = await getChannelInfo(channelVideoID);
        if (!channelInfo?.id) {
            return res.status(404).send(`No channel found for videoID ${channelVideoID}`);
        }

        try {
            await redis.setEx(tempVIPKey(userID), dayInSeconds, channelInfo?.id);
            await privateDB.prepare("run", `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`, [adminUserID, userID, + enabled, startTime]);
            return res.status(200).send(`Temp VIP added on channel ${channelInfo?.name}`);
        } catch (e) {
            Logger.error(e as string);
            return res.status(500).send();
        }
    }
    try {
        await redis.del(tempVIPKey(userID));
        await privateDB.prepare("run", `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`, [adminUserID, userID, + enabled, startTime]);
        return res.status(200).send(`Temp VIP removed`);
    } catch (e) {
        Logger.error(e as string);
        return res.status(500).send();
    }
}

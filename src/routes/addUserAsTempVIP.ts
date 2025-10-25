import { VideoID } from "../types/segments.model";
import { getVideoDetails } from "../utils/getVideoDetails";
import { getHashCache } from "../utils/getHashCache";
import { vipRepository } from "../databases/databases";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { HashedUserID } from "../types/user.model";
import redis from "../utils/redis";
import { tempVIPKey } from "../utils/redisKeys";
import { Logger } from "../utils/logger";
import { PrivateTempVipLog } from "../databases/models/private";

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

    const tempVipLog = new PrivateTempVipLog({
        issuerUserID: adminUserID,
        targetUserID: userID,
        enabled: enabled
    });

    if (enabled) {
        const dayInSeconds = 86400;
        const channelInfo = await getChannelInfo(channelVideoID);
        if (!channelInfo?.id) {
            return res.status(404).send(`No channel found for videoID ${channelVideoID}`);
        }

        try {
            await redis.setEx(tempVIPKey(userID), dayInSeconds, channelInfo?.id);
            await vipRepository.addTempVipLog(tempVipLog);
            return res.status(200).send(`Temp VIP added on channel ${channelInfo?.name}`);
        } catch (e) {
            Logger.error(e as string);
            return res.status(500).send();
        }
    }
    try {
        await redis.del(tempVIPKey(userID));
        await vipRepository.addTempVipLog(tempVipLog);
        return res.status(200).send(`Temp VIP removed`);
    } catch (e) {
        Logger.error(e as string);
        return res.status(500).send();
    }
}

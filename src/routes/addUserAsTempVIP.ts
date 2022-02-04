import { VideoID } from "../types/segments.model";
import { YouTubeAPI } from "../utils/youtubeApi";
import { APIVideoInfo } from "../types/youtubeApi.model";
import { config } from "../config";
import { getHashCache } from "../utils/getHashCache";
import { privateDB } from "../databases/databases";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { HashedUserID } from "../types/user.model";
import redis from "../utils/redis";
import { tempVIPKey } from "../utils/redisKeys";

interface AddUserAsTempVIPRequest extends Request {
    query: {
        userID: HashedUserID;
        adminUserID: string;
        enabled: string;
        channelVideoID: string;
    }
}

function getYouTubeVideoInfo(videoID: VideoID, ignoreCache = false): Promise<APIVideoInfo> {
    return (config.newLeafURLs) ? YouTubeAPI.listVideos(videoID, ignoreCache) : null;
}

const getChannelInfo = async (videoID: VideoID): Promise<{id: string | null, name: string | null }> => {
    const videoInfo = await getYouTubeVideoInfo(videoID);
    return {
        id: videoInfo?.data?.authorId,
        name: videoInfo?.data?.author
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
        await redis.setAsyncEx(tempVIPKey(userID), channelInfo?.id, dayInSeconds);
        await privateDB.prepare("run", `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`, [adminUserID, userID, + enabled, startTime]);
        return res.status(200).send(`Temp VIP added on channel ${channelInfo?.name}`);
    }

    await redis.delAsync(tempVIPKey(userID));
    await privateDB.prepare("run", `INSERT INTO "tempVipLog" VALUES (?, ?, ?, ?)`, [adminUserID, userID, + enabled, startTime]);
    return res.status(200).send(`Temp VIP removed`);
}
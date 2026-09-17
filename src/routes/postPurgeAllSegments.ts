import { Request, Response } from "express";

import { Logger } from "#utils/logger";
import { getHashCache } from "#utils/getHashCache";
import { isUserVIP } from "#utils/isUserVIP";
import { db } from "#databases/databases";
import { QueryCacher } from "#utils/queryCacher";

import { HashedUserID, UserID } from "#types/user";
import { Service, VideoID, VideoIDHash } from "#types/segments";

export async function postPurgeAllSegments(req: Request, res: Response): Promise<Response> {
    if (req.body == null) return res.status(400).json({ "message": "No request body found" });
    const userID = req.body.userID as UserID;
    const service = req.body.service as Service ?? Service.YouTube;
    const videoID = req.body.videoID as VideoID;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    const hashedUserID: HashedUserID = await getHashCache(userID);

    try {
        const vipState = await isUserVIP(hashedUserID);
        if (!vipState) {
            return res.status(403).json({
                message: "Must be a VIP to perform this action.",
            });
        }

        await db.prepare("run", `UPDATE "sponsorTimes" SET "hidden" = 1 WHERE "videoID" = ?`, [videoID]);

        const hashedVideoID: VideoIDHash = await getHashCache(videoID, 1);
        QueryCacher.clearSegmentCache({
            videoID,
            hashedVideoID,
            service
        });

    } catch (err) /* istanbul ignore next */ {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
    return res.sendStatus(200);
}

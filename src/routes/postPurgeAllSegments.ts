import {Logger} from "../utils/logger";
import {getHash} from "../utils/getHash";
import {isUserVIP} from "../utils/isUserVIP";
import {Request, Response} from "express";
import {HashedUserID, UserID} from "../types/user.model";
import {VideoID} from "../types/segments.model";
import {db} from "../databases/databases";

export async function postPurgeAllSegments(req: Request, res: Response): Promise<Response> {
    const userID = req.body.userID as UserID;
    const videoID = req.body.videoID as VideoID;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    const hashedUserID: HashedUserID = getHash(userID);

    try {
        const vipState = await isUserVIP(hashedUserID);
        if (!vipState) {
            return res.status(403).json({
                message: "Must be a VIP to perform this action.",
            });
        }

        await db.prepare("run", `UPDATE "sponsorTimes" SET "hidden" = 1 WHERE "videoID" = ?`, [videoID]);

    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
    return res.sendStatus(200);
}

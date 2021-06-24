import {Logger} from '../utils/logger';
import {getHash} from '../utils/getHash';
import {isUserVIP} from '../utils/isUserVIP';
import {Request, Response} from 'express';
import {HashedUserID, UserID} from '../types/user.model';
import {VideoID} from "../types/segments.model";
import {db} from '../databases/databases';

export async function postPurgeAllSegments(req: Request, res: Response): Promise<void> {
    const userID = req.body.userID as UserID;
    const videoID = req.body.videoID as VideoID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    const hashedUserID: HashedUserID = getHash(userID);

    try {
        let vipState = await isUserVIP(hashedUserID);
        if (!vipState) {
            res.status(403).json({
                message: 'Must be a VIP to perform this action.',
            });
            return;
        }

        await db.prepare('run', `UPDATE "sponsorTimes" SET "hidden" = 1 WHERE "videoID" = ?`, [videoID]);
    
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }

    res.sendStatus(200);
}

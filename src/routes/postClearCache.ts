import { Logger } from '../utils/logger';
import { db } from '../databases/databases';
import { getHash } from '../utils/getHash';
import { Request, Response } from 'express';
import { Service, VideoID } from '../types/segments.model';
import { QueryCacher } from '../utils/queryCacher';
import { UserID } from '../types/user.model';

export async function postClearCache(req: Request, res: Response) {
    const videoID = req.query.videoID as VideoID;
    let userID = req.query.userID as UserID;
    let service = req.query.service as Service ?? Service.YouTube;

    const invalidFields = [];
    if (typeof videoID !== 'string') {
      invalidFields.push('videoID');
    }
    if (typeof userID !== 'string') {
      invalidFields.push('userID');
    }

    if (invalidFields.length !== 0) {
      // invalid request
      const fields = invalidFields.reduce((p, c, i) => p + (i !== 0 ? ', ' : '') + c, '');
      res.status(400).send(`No valid ${fields} field(s) provided`);
      return false;
    }

    // hash the userID
    userID = getHash(userID);
    // hash videoID
    const hashedVideoID = getHash(videoID, 1);

    const isVIP = (await db.prepare("get", `SELECT count(*) as "userCount" FROM "vipUsers" WHERE "userID" = ?`, [userID])).userCount > 0;
    // Ensure user is a VIP
    if (!isVIP) {
        Logger.warn("Permission violation: User " + userID + " attempted to clear cache for video " + videoID + ".");
        res.status(403).json({"message": "Not a VIP"});
        return false;
    }

    try {
        QueryCacher.clearVideoCache({
            videoID,
            hashedVideoID,
            service
        });
        res.status(200).json({
            message: "Cache cleared on video " + videoID
        });
    } catch(err) {
        res.status(500).send()
        return false;
    }
}

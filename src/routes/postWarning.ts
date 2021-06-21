import {Request, Response} from 'express';
import {Logger} from '../utils/logger';
import {db} from '../databases/databases';
import {isUserVIP} from '../utils/isUserVIP';
import {getHash} from '../utils/getHash';
import { HashedUserID, UserID } from '../types/user.model';

export async function postWarning(req: Request, res: Response) {
    // Collect user input data
    let issuerUserID: HashedUserID = getHash(<UserID> req.body.issuerUserID);
    let userID: UserID = req.body.userID;
    let issueTime = new Date().getTime();
    let enabled: boolean = req.body.enabled ?? true;

    // Ensure user is a VIP
    if (!await isUserVIP(issuerUserID)) {
        Logger.warn("Permission violation: User " + issuerUserID + " attempted to warn user " + userID + ".");
        res.status(403).json({"message": "Not a VIP"});
        return;
    }

    let resultStatus = "";

    if (enabled) {
        let previousWarning = await db.prepare('get', 'SELECT * FROM "warnings" WHERE "userID" = ? AND "issuerUserID" = ?', [userID, issuerUserID]);

        if (!previousWarning) {
            await db.prepare('run', 'INSERT INTO "warnings" ("userID", "issueTime", "issuerUserID", "enabled") VALUES (?, ?, ?, 1)', [userID, issueTime, issuerUserID]);
            resultStatus = "issued to";
        } else {
            res.status(409).send();
            return;
        }
    } else {
        await db.prepare('run', 'UPDATE "warnings" SET "enabled" = 0 WHERE "userID" = ?', [userID]);
        resultStatus = "removed from";
    }

    res.status(200).json({
        message: "Warning " + resultStatus + " user '" + userID + "'.",
    });
}

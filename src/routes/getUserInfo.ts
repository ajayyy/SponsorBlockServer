import {db} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {isUserVIP} from '../utils/isUserVIP';
import {Request, Response} from 'express';
import {Logger} from '../utils/logger';
import { HashedUserID, UserID } from '../types/user.model';

async function dbGetSubmittedSegmentSummary(userID: HashedUserID): Promise<{ minutesSaved: number, segmentCount: number }> {
    try {
        let row = await db.prepare("get", `SELECT SUM((("endTime" - "startTime") / 60) * "views") as "minutesSaved",
                                            count(*) as "segmentCount" FROM "sponsorTimes" 
                                            WHERE "userID" = ? AND "votes" > -2 AND "shadowHidden" != 1`, [userID]);
        if (row.minutesSaved != null) {
            return {
                minutesSaved: row.minutesSaved,
                segmentCount: row.segmentCount,
            };
        } else {
            return {
                minutesSaved: 0,
                segmentCount: 0,
            };
        }
    } catch (err) {
        return null;
    }
}

async function dbGetUsername(userID: HashedUserID) {
    try {
        let row = await db.prepare('get', `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID]);
        if (row !== undefined) {
            return row.userName;
        } else {
            //no username yet, just send back the userID
            return userID;
        }
    } catch (err) {
        return false;
    }
}

async function dbGetViewsForUser(userID: HashedUserID) {
    try {
        let row = await db.prepare('get', `SELECT SUM("views") as "viewCount" FROM "sponsorTimes" WHERE "userID" = ? AND "votes" > -2 AND "shadowHidden" != 1`, [userID]);
        return row?.viewCount ?? 0;
    } catch (err) {
        return false;
    }
}

async function dbGetWarningsForUser(userID: HashedUserID): Promise<number> {
    try {
        let row = await db.prepare('get', `SELECT COUNT(*) as total FROM "warnings" WHERE "userID" = ? AND "enabled" = 1`, [userID]);
        return row?.total ?? 0;
    } catch (err) {
        Logger.error('Couldn\'t get warnings for user ' + userID + '. returning 0');
        return 0;
    }
}

export async function getUserInfo(req: Request, res: Response) {
    let userID = req.query.userID as UserID;

    if (userID == undefined) {
        //invalid request
        res.status(400).send('Parameters are not valid');
        return;
    }

    //hash the userID
    const hashedUserID: HashedUserID = getHash(userID);

    const segmentsSummary = await dbGetSubmittedSegmentSummary(hashedUserID);
    if (segmentsSummary) {
        res.send({
            userID: hashedUserID,
            userName: await dbGetUsername(hashedUserID),
            minutesSaved: segmentsSummary.minutesSaved,
            segmentCount: segmentsSummary.segmentCount,
            viewCount: await dbGetViewsForUser(hashedUserID),
            warnings: await dbGetWarningsForUser(hashedUserID),
            vip: await isUserVIP(hashedUserID),
        });
    } else {
        res.status(400).send();
    }
}

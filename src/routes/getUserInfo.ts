import {db} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {Request, Response} from 'express';
import {Logger} from '../utils/logger'

async function dbGetSubmittedSegmentSummary(userID: string): Promise<{ minutesSaved: number, segmentCount: number }> {
    try {
        let row = await db.prepare("get", "SELECT SUM(((endTime - startTime) / 60) * views) as minutesSaved, count(*) as segmentCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
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

async function dbGetUsername(userID: string) {
    try {
        let row = await db.prepare('get', "SELECT userName FROM userNames WHERE userID = ?", [userID]);
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

async function dbGetViewsForUser(userID: string) {
    try {
        let row = await db.prepare('get', "SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
        //increase the view count by one
        if (row.viewCount != null) {
            return row.viewCount;
        } else {
            return 0;
        }
    } catch (err) {
        return false;
    }
}

async function dbGetWarningsForUser(userID: string): Promise<number> {
    try {
        let rows = await db.prepare('all', "SELECT * FROM warnings WHERE userID = ?", [userID]);
        return rows.length;
    } catch (err) {
        Logger.error('Couldn\'t get warnings for user ' + userID + '. returning 0');
        return 0;
    }
}

export async function getUserInfo(req: Request, res: Response) {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        res.status(400).send('Parameters are not valid');
        return;
    }

    //hash the userID
    userID = getHash(userID);

    const segmentsSummary = await dbGetSubmittedSegmentSummary(userID);
    if (segmentsSummary) {
        res.send({
            userID,
            userName: await dbGetUsername(userID),
            minutesSaved: segmentsSummary.minutesSaved,
            segmentCount: segmentsSummary.segmentCount,
            viewCount: await dbGetViewsForUser(userID),
            warnings: await dbGetWarningsForUser(userID),
        });
    } else {
        res.status(400).send();
    }
}

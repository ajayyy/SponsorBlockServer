import {db} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {Request, Response} from 'express';
import {Logger} from '../utils/logger'

function dbGetSubmittedSegmentSummary(userID: string): any {
    try {
        let row = db.prepare("get", "SELECT SUM(((endTime - startTime) / 60) * views) as minutesSaved, count(*) as segmentCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
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
        return false;
    }
}

function dbGetUsername(userID: string) {
    try {
        let row = db.prepare('get', "SELECT userName FROM userNames WHERE userID = ?", [userID]);
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

function dbGetViewsForUser(userID: string) {
    try {
        let row = db.prepare('get', "SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
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

function dbGetWarningsForUser(userID: string): number {
    try {
        let rows = db.prepare('all', "SELECT * FROM warnings WHERE userID = ?", [userID]);
        return rows.length;
    } catch (err) {
        Logger.error('Couldn\'t get warnings for user ' + userID + '. returning 0');
        return 0;
    }
}

export function getUserInfo(req: Request, res: Response) {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        res.status(400).send('Parameters are not valid');
        return;
    }

    //hash the userID
    userID = getHash(userID);

    const segmentsSummary = dbGetSubmittedSegmentSummary(userID);
    res.send({
        userID,
        userName: dbGetUsername(userID),
        minutesSaved: segmentsSummary.minutesSaved,
        segmentCount: segmentsSummary.segmentCount,
        viewCount: dbGetViewsForUser(userID),
        warnings: dbGetWarningsForUser(userID),
    });
}

import {db} from '../databases/databases';
import {Request, Response} from 'express';
import {getHash} from '../utils/getHash';
import {config} from '../config';
import { Logger } from '../utils/logger';

const maxRewardTimePerSegmentInSeconds = config.maxRewardTimePerSegmentInSeconds ?? 86400;

export async function getSavedTimeForUser(req: Request, res: Response) {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    try {
        let row = await db.prepare("get", 'SELECT SUM(((CASE WHEN "endTime" - "startTime" > ' + maxRewardTimePerSegmentInSeconds + ' THEN ' + maxRewardTimePerSegmentInSeconds + ' ELSE "endTime" - "startTime" END) / 60) * "views") as "minutesSaved" FROM "sponsorTimes" WHERE "userID" = ? AND "votes" > -1 AND "shadowHidden" != 1 ', [userID]);

        if (row.minutesSaved != null) {
            res.send({
                timeSaved: row.minutesSaved,
            });
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        Logger.error("getSavedTimeForUser " + err);
        res.sendStatus(500);

        return;
    }
}

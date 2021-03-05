import {db} from '../databases/databases';
import {Request, Response} from 'express';
import {getHash} from '../utils/getHash';

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
        let row = await db.prepare("get", 'SELECT SUM(("endTime" - "startTime") / 60 * "views") as "minutesSaved" FROM "sponsorTimes" WHERE "userID" = ? AND "votes" > -1 AND "shadowHidden" != 1 ', [userID]);

        if (row.minutesSaved != null) {
            res.send({
                timeSaved: row.minutesSaved,
            });
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);

        return;
    }
}

import {db} from '../databases/databases';
import {Request, Response} from 'express';
import {getHash} from '../utils/getHash';
import {Logger} from '../utils/logger';

export function getViewsForUser(req: Request, res: Response) {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    try {
        let row = db.prepare('get', "SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ?", [userID]);

        //increase the view count by one
        if (row.viewCount != null) {
            res.send({
                viewCount: row.viewCount,
            });
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }
}

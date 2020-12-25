import {db} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';

export function getUsername(req: Request, res: Response) {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    try {
        let row = db.prepare('get', "SELECT userName FROM userNames WHERE userID = ?", [userID]);

        if (row !== undefined) {
            res.send({
                userName: row.userName,
            });
        } else {
            //no username yet, just send back the userID
            res.send({
                userName: userID,
            });
        }
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }
}

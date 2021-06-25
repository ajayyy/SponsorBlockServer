import {db} from '../databases/databases';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';

export async function getUserID(req: Request, res: Response) {
    let username = req.query.username as string;

    if (username == undefined || username.length > 64) {
        //invalid request
        res.sendStatus(400);
        return;
    }
    
    // add wildcard to variable
    username = `%${username}%`
    try {
        let rows = await db.prepare('all', `SELECT "userName", "userID" FROM "userNames" WHERE "userName" LIKE ?`, [username]);
        if (rows.length === 0) {
            res.sendStatus(404);
            return;
        } else {
            res.send(rows);
        }
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);
        return;
    }
}

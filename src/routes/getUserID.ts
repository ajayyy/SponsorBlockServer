import {db} from '../databases/databases';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';

export async function getUserID(req: Request, res: Response) {
    let userName = req.query.username as string;

    if (userName == undefined || userName.length > 64 || userName.length < 3) {
        //invalid request
        res.sendStatus(400);
        return;
    }
    
    // escape [_ % \] to avoid ReDOS
    userName = userName.replace(/\\/g, '\\\\')
        .replace(/_/g, '\\_')
        .replace(/%/g, '\\%');

    // add wildcard to variable
    userName = `%${userName}%`;
    // LIMIT to reduce overhead
    // ESCAPE to escape LIKE wildcards
    try {
        let rows = await db.prepare('all', `SELECT "userName", "userID" FROM "userNames"
            WHERE "userName" LIKE ? ESCAPE '\\' LIMIT 10`, [userName]);
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

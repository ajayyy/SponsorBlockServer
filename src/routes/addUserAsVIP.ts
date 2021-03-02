import {getHash} from '../utils/getHash';
import {db} from '../databases/databases';
import {config} from '../config';
import {Request, Response} from 'express';

export async function addUserAsVIP(req: Request, res: Response) {
    const userID = req.query.userID as string;
    let adminUserIDInput = req.query.adminUserID as string;

    const enabled = req.query.enabled === undefined
        ? false
        : req.query.enabled === 'true';

    if (userID == undefined || adminUserIDInput == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    if (adminUserIDInput !== config.adminUserID) {
        //not authorized
        res.sendStatus(403);
        return;
    }

    //check to see if this user is already a vip
    const row = await db.prepare('get', "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [userID]);

    if (enabled && row.userCount == 0) {
        //add them to the vip list
        await db.prepare('run', "INSERT INTO vipUsers VALUES(?)", [userID]);
    } else if (!enabled && row.userCount > 0) {
        //remove them from the shadow ban list
        await db.prepare('run', "DELETE FROM vipUsers WHERE userID = ?", [userID]);
    }

    res.sendStatus(200);
}

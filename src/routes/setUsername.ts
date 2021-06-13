import {config} from '../config';
import {Logger} from '../utils/logger';
import {db} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {Request, Response} from 'express';

export async function setUsername(req: Request, res: Response) {
    let userID = req.query.userID as string;
    let userName = req.query.username as string;

    let adminUserIDInput = req.query.adminUserID as string;

    if (userID == undefined || userName == undefined || userID === "undefined" || userName.length > 64) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    if (userName.includes("discord")) {
        // Don't allow
        res.sendStatus(200);
        return;
    }
    
    // remove unicode control characters from username (example: \n, \r, \t etc.)
    // source: https://en.wikipedia.org/wiki/Control_character#In_Unicode
    userName = userName.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    if (adminUserIDInput != undefined) {
        //this is the admin controlling the other users account, don't hash the controling account's ID
        adminUserIDInput = getHash(adminUserIDInput);

        if (adminUserIDInput != config.adminUserID) {
            //they aren't the admin
            res.sendStatus(403);
            return;
        }
    } else {
        //hash the userID
        userID = getHash(userID);
    }
    
    if (["7e7eb6c6dbbdba6a106a38e87eae29ed8689d0033cb629bb324a8dab615c5a97", "e1839ce056d185f176f30a3d04a79242110fe46ad6e9bd1a9170f56857d1b148", "c3424f0d1f99631e6b36e5bf634af953e96b790705abd86a9c5eb312239cb765"].includes(userID)) {
        // Don't allow
        res.sendStatus(200);
        return;   
    }

    try {
        //check if username is already set
        let row = await db.prepare('get', `SELECT count(*) as count FROM "userNames" WHERE "userID" = ?`, [userID]);

        if (row.count > 0) {
            //already exists, update this row
            await db.prepare('run', `UPDATE "userNames" SET "userName" = ? WHERE "userID" = ?`, [userName, userID]);
        } else {
            //add to the db
            await db.prepare('run', `INSERT INTO "userNames" VALUES(?, ?)`, [userID, userName]);
        }

        res.sendStatus(200);
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }
}

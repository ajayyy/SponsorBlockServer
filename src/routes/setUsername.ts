import {config} from '../config';
import {Logger} from '../utils/logger';
import {db, privateDB} from '../databases/databases';
import {getHash} from '../utils/getHash';
import {Request, Response} from 'express';

async function logUserNameChange(userID: string, newUserName: string, oldUserName: string, updatedByAdmin: boolean): Promise<void>  {
    return privateDB.prepare('run',
        `INSERT INTO "userNameLogs"("userID", "newUserName", "oldUserName", "updatedByAdmin", "updatedAt") VALUES(?, ?, ?, ?, ?)`,
        [userID, newUserName, oldUserName, + updatedByAdmin, new Date().getTime()]
    );
}

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

    try {
        const row = await db.prepare('get', `SELECT count(*) as count FROM "userNames" WHERE "userID" = ? AND "locked" = '1'`, [userID]);
        if (adminUserIDInput === undefined && row.count > 0) {
            res.sendStatus(200);
            return;
        }
    }
    catch (error) {
        Logger.error(error);
        res.sendStatus(500);
        return;
    }

    try {
        //check if username is already set
        const row = await db.prepare('get', `SELECT "userName" FROM "userNames" WHERE "userID" = ? LIMIT 1`, [userID]);
        const locked = adminUserIDInput === undefined ? 0 : 1;
        let oldUserName = '';

        if (row?.userName?.length > 0) {
            //already exists, update this row
            oldUserName = row.userName;
            await db.prepare('run', `UPDATE "userNames" SET "userName" = ?, "locked" = ? WHERE "userID" = ?`, [userName, locked, userID]);
        } else {
            //add to the db
            await db.prepare('run', `INSERT INTO "userNames"("userID", "userName", "locked") VALUES(?, ?, ?)`, [userID, userName, locked]);
        }

        await logUserNameChange(userID, userName, oldUserName, adminUserIDInput !== undefined);

        res.sendStatus(200);
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }
}

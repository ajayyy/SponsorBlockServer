import { getHash } from "../utils/getHash";
import { db } from "../databases/databases";
import { config } from "../config";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { HashedUserID } from "../types/user.model";


export async function addUserAsVIP(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as HashedUserID;
    let adminUserIDInput = req.query.adminUserID as string;

    const enabled = req.query.enabled === undefined
        ? false
        : req.query.enabled === "true";

    if (userID == undefined || adminUserIDInput == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    if (adminUserIDInput !== config.adminUserID) {
        //not authorized
        return res.sendStatus(403);
    }

    //check to see if this user is already a vip
    const userIsVIP = await isUserVIP(userID);

    if (enabled && !userIsVIP) {
        //add them to the vip list
        await db.prepare("run", 'INSERT INTO "vipUsers" VALUES(?)', [userID]);
    } else if (!enabled && userIsVIP) {
        //remove them from the shadow ban list
        await db.prepare("run", 'DELETE FROM "vipUsers" WHERE "userID" = ?', [userID]);
    }

    return res.sendStatus(200);
}

import { getHash } from "../utils/getHash";
import { db } from "../databases/databases";
import { config } from "../config";
import { Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { HashedUserID } from "../types/user.model";
import { APIRequest } from "../types/APIRequest";

export async function addUserAsVIP(req: APIRequest, res: Response): Promise<Response> {

    const { query: { userID, adminUserID } } = req;

    const enabled = req.query?.enabled === "true";

    if (!userID || !adminUserID) {
        // invalid request
        return res.sendStatus(400);
    }

    // hash the userID
    const adminUserIDInput = getHash(adminUserID);

    if (adminUserIDInput !== config.adminUserID) {
        // not authorized
        return res.sendStatus(403);
    }

    // check to see if this user is already a vip
    const userIsVIP = await isUserVIP(userID as HashedUserID);

    if (enabled && !userIsVIP) {
        // add them to the vip list
        await db.prepare("run", 'INSERT INTO "vipUsers" VALUES(?)', [userID]);
    }

    if (!enabled && userIsVIP) {
        //remove them from the shadow ban list
        await db.prepare("run", 'DELETE FROM "vipUsers" WHERE "userID" = ?', [userID]);
    }

    return res.sendStatus(200);
}

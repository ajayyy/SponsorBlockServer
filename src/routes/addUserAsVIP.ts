import { getHashCache } from "../utils/getHashCache";
import { db } from "../databases/databases";
import { config } from "../config";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { HashedUserID } from "../types/user.model";
import { Logger } from "../utils/logger";
import { VipRepository } from "../databases/repositories";

interface AddUserAsVIPRequest extends Request {
    query: {
        userID: HashedUserID;
        adminUserID: string;
        enabled: string;
    }
}

export async function addUserAsVIP(req: AddUserAsVIPRequest, res: Response): Promise<Response> {
    const { query: { userID, adminUserID } } = req;

    const enabled = req.query?.enabled === "true";

    if (!userID || !adminUserID) {
        // invalid request
        return res.sendStatus(400);
    }

    // hash the userID
    const adminUserIDInput = await getHashCache(adminUserID);

    if (adminUserIDInput !== config.adminUserID) {
        // not authorized
        return res.sendStatus(403);
    }

    // check to see if this user is already a vip
    const userIsVIP = await isUserVIP(userID);

    try {
        if (enabled && !userIsVIP) {
            // add them to the vip list
            VipRepository.addVip(userID, db);
        }

        if (!enabled && userIsVIP) {
            //remove them from the shadow ban list
            VipRepository.deleteVip(userID, db);
        }

        return res.sendStatus(200);
    } catch (e) {
        Logger.error(e as string);
        return res.sendStatus(500);
    }

}

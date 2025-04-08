import { getHashCache } from "../utils/getHashCache";
import { db } from "../databases/databases";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { UserID } from "../types/user.model";
import { Logger } from "../utils/logger";

interface SetConfigRequest extends Request {
    body: {
        userID: UserID;
        key: string;
        value: string;
    }
}

const allowedConfigs = [
    "old-submitter-block-date",
    "max-users-per-minute"
];

export async function setConfig(req: SetConfigRequest, res: Response): Promise<Response> {
    const { body: { userID, key, value } } = req;

    if (!userID || !allowedConfigs.includes(key)) {
        // invalid request
        return res.sendStatus(400);
    }

    // hash the userID
    const hashedUserID = await getHashCache(userID as UserID);
    const isVIP = (await isUserVIP(hashedUserID));

    if (!isVIP) {
        // not authorized
        return res.sendStatus(403);
    }

    try {
        await db.prepare("run", `INSERT OR REPLACE INTO "config" ("key", "value") VALUES(?, ?)`, [key, value]);

        return res.sendStatus(200);
    } catch (e) {
        Logger.error(e as string);

        return res.sendStatus(500);
    }
}

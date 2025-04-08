import { getHashCache } from "../utils/getHashCache";
import { db } from "../databases/databases";
import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { UserID } from "../types/user.model";
import { Logger } from "../utils/logger";

export async function getConfig(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as string;
    const key = req.query.key as string;

    if (!userID || !key) {
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
        const row = await db.prepare("run", `SELECT "value" FROM "config" WHERE "key" = ?`, [key]);

        return res.status(200).json({
            value: row.value
        });
    } catch (e) {
        Logger.error(e as string);

        return res.sendStatus(500);
    }
}

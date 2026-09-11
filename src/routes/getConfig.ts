import { Request, Response } from "express";

import { getHashCache } from "../utils/getHashCache.js";
import { isUserVIP } from "../utils/isUserVIP.js";
import { UserID } from "../types/user.model.js";
import { Logger } from "../utils/logger.js";
import { getServerConfig } from "../utils/serverConfig.js";

export async function getConfigEndpoint(req: Request, res: Response): Promise<Response> {
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
        return res.status(200).json({
            value: await getServerConfig(key)
        });
    } catch (e) {
        Logger.error(e as string);

        return res.sendStatus(500);
    }
}

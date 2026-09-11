import { Request, Response } from "express";

import { Logger } from "../utils/logger.js";
import { getHashCache } from "../utils/getHashCache.js";
import { isUserVIP } from "../utils/isUserVIP.js";
import { HashedUserID, UserID } from "../types/user.model.js";

export async function getIsUserVIP(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as UserID;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    const hashedUserID: HashedUserID = await getHashCache(userID);

    try {
        const vipState = await isUserVIP(hashedUserID);
        return res.status(200).json({
            hashedUserID: hashedUserID,
            vip: vipState,
        });
    } catch (err) /* istanbul ignore next */ {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

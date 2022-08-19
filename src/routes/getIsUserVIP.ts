import { Logger } from "../utils/logger";
import { getHashCache } from "../utils/getHashCache";
import { isUserVIP } from "../utils/isUserVIP";
import { Request, Response } from "express";
import { HashedUserID, UserID } from "../types/user.model";

export async function getIsUserVIP(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID.toString() as UserID;

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
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

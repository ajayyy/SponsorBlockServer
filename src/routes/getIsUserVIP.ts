import { Logger } from "../utils/logger";
import { getHash } from "../utils/getHash";
import { isUserVIP } from "../utils/isUserVIP";
import { Response } from "express";
import { HashedUserID } from "../types/user.model";
import { APIRequest } from "../types/APIRequest";

export async function getIsUserVIP(req: APIRequest, res: Response): Promise<Response> {
    const userID = req.query.userID;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    const hashedUserID: HashedUserID = getHash(userID);

    try {
        const vipState = await isUserVIP(hashedUserID);

        return res.status(200).json({
            hashedUserID: hashedUserID,
            vip: vipState,
        });
    } catch (err) {
        Logger.error(err as string);
    }

    return res.sendStatus(500);
}

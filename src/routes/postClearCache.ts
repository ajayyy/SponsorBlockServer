import { Logger } from "../utils/logger";
import { HashedUserID, UserID } from "../types/user.model";
import { getHash } from "../utils/getHash";
import { Request, Response } from "express";
import { Service, VideoID } from "../types/segments.model";
import { QueryCacher } from "../utils/queryCacher";
import { isUserVIP } from "../utils/isUserVIP";
import { VideoIDHash } from "../types/segments.model";
import { getService } from "../utils/getService";

export async function postClearCache(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    const userID = req.query.userID as UserID;
    const service = getService(req.query.service as Service);

    const invalidFields = [];
    if (typeof videoID !== "string") {
        invalidFields.push("videoID");
    }
    if (typeof userID !== "string") {
        invalidFields.push("userID");
    }

    if (invalidFields.length !== 0) {
        // invalid request
        const fields = invalidFields.reduce((p, c, i) => p + (i !== 0 ? ", " : "") + c, "");
        return res.status(400).send(`No valid ${fields} field(s) provided`);
    }

    // hash the userID as early as possible
    const hashedUserID: HashedUserID = getHash(userID);
    // hash videoID
    const hashedVideoID: VideoIDHash = getHash(videoID, 1);

    // Ensure user is a VIP
    if (!(await isUserVIP(hashedUserID))){
        Logger.warn(`Permission violation: User ${hashedUserID} attempted to clear cache for video ${videoID}.`);
        return res.status(403).json({ "message": "Not a VIP" });
    }

    try {
        QueryCacher.clearVideoCache({
            videoID,
            hashedVideoID,
            service
        });
        return res.status(200).json({
            message: `Cache cleared on video ${videoID}`
        });
    } catch(err) {
        return res.sendStatus(500);
    }
}

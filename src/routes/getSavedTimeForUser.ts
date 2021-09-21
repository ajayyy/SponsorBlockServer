import { db } from "../databases/databases.js";
import { Request, Response } from "express";
import { getHash } from "../utils/getHash.js";
import { config } from "../config.js";
import { Logger } from "../utils/logger.js";

const maxRewardTimePerSegmentInSeconds = config.maxRewardTimePerSegmentInSeconds ?? 86400;

export async function getSavedTimeForUser(req: Request, res: Response): Promise<Response> {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    userID = getHash(userID);

    try {
        const row = await db.prepare("get", 'SELECT SUM(((CASE WHEN "endTime" - "startTime" > ? THEN ? ELSE "endTime" - "startTime" END) / 60) * "views") as "minutesSaved" FROM "sponsorTimes" WHERE "userID" = ? AND "votes" > -1 AND "shadowHidden" != 1 ', [maxRewardTimePerSegmentInSeconds, maxRewardTimePerSegmentInSeconds, userID]);

        if (row.minutesSaved != null) {
            return res.send({
                timeSaved: row.minutesSaved,
            });
        } else {
            return res.sendStatus(404);
        }
    } catch (err) {
        Logger.error(`getSavedTimeForUser ${err}`);
        return res.sendStatus(500);
    }
}

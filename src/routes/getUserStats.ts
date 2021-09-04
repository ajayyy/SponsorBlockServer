import {db} from "../databases/databases";
import {getHash} from "../utils/getHash";
import {Request, Response} from "express";
import { HashedUserID, UserID } from "../types/user.model";
import { Category } from "../types/segments.model";
import {config} from "../config";
const maxRewardTime = config.maxRewardTimePerSegmentInSeconds;

async function dbGetCategorySummary(userID: HashedUserID, category: Category): Promise<{ minutesSaved: number, segmentCount: number }> {
    try {
        const row = await db.prepare("get",
            `SELECT SUM(((CASE WHEN "endTime" - "startTime" > ? THEN ? ELSE "endTime" - "startTime" END) / 60) * "views") as "minutesSaved",
            count(*) as "segmentCount" FROM "sponsorTimes"
            WHERE "userID" = ? AND "category" = ? AND "votes" > -2 AND "shadowHidden" != 1`, [maxRewardTime, maxRewardTime, userID, category]);
        if (row.minutesSaved != null) {
            return {
                minutesSaved: row.minutesSaved,
                segmentCount: row.segmentCount,
            };
        } else {
            return {
                minutesSaved: 0,
                segmentCount: 0,
            };
        }
    } catch (err) {
        return null;
    }
}

async function dbGetUsername(userID: HashedUserID) {
    try {
        const row = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID]);
        return row?.userName ?? userID;
    } catch (err) {
        return false;
    }
}

export async function getUserStats(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as UserID;
    const hashedUserID: HashedUserID = userID ? getHash(userID) : req.query.publicUserID as HashedUserID;

    if (hashedUserID == undefined) {
        //invalid request
        return res.status(400).send("Invalid userID or publicUserID parameter");
    }
    const responseObj = {
        userID: hashedUserID,
        userName: await dbGetUsername(hashedUserID),
    } as Record<string, Record<string, number> | string >;
    for (const category of config.categoryList) {
        responseObj[category] = await dbGetCategorySummary(hashedUserID, category as Category);
    }
    return res.send(responseObj);
}

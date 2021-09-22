import { db } from "../databases/databases";
import { getHash } from "../utils/getHash";
import { Request, Response } from "express";
import { HashedUserID, UserID } from "../types/user.model";
import { config } from "../config";
import { Logger } from "../utils/logger";
type nestedObj = Record<string, Record<string, number>>;
const maxRewardTimePerSegmentInSeconds = config.maxRewardTimePerSegmentInSeconds ?? 86400;

async function dbGetUserSummary(userID: HashedUserID, fetchCategoryStats: boolean, fetchActionTypeStats: boolean) {
    let additionalQuery = "";
    if (fetchCategoryStats) {
        additionalQuery += `
            SUM(CASE WHEN "category" = 'sponsor' THEN 1 ELSE 0 END) as "categorySumSponsor",
            SUM(CASE WHEN "category" = 'intro' THEN 1 ELSE 0 END) as "categorySumIntro",
            SUM(CASE WHEN "category" = 'outro' THEN 1 ELSE 0 END) as "categorySumOutro",
            SUM(CASE WHEN "category" = 'interaction' THEN 1 ELSE 0 END) as "categorySumInteraction",
            SUM(CASE WHEN "category" = 'selfpromo' THEN 1 ELSE 0 END) as "categorySelfpromo",
            SUM(CASE WHEN "category" = 'music_offtopic' THEN 1 ELSE 0 END) as "categoryMusicOfftopic",
            SUM(CASE WHEN "category" = 'preview' THEN 1 ELSE 0 END) as "categorySumPreview",
            SUM(CASE WHEN "category" = 'poi_highlight' THEN 1 ELSE 0 END) as "categorySumHighlight",`;
    }
    if (fetchActionTypeStats) {
        additionalQuery += `
            SUM(CASE WHEN "actionType" = 'skip' THEN 1 ELSE 0 END) as "typeSumSkip",
            SUM(CASE WHEN "actionType" = 'mute' THEN 1 ELSE 0 END) as "typeSumMute",`;
    }
    try {
        const row = await db.prepare("get", `
            SELECT SUM(((CASE WHEN "endTime" - "startTime" > ? THEN ? ELSE "endTime" - "startTime" END) / 60) * "views") as "minutesSaved",
            ${additionalQuery}
            count(*) as "segmentCount"
            FROM "sponsorTimes"
            WHERE "userID" = ? AND "votes" > -2 AND "shadowHidden" !=1`,
        [maxRewardTimePerSegmentInSeconds, maxRewardTimePerSegmentInSeconds, userID]);
        const source = (row.minutesSaved != null) ? row : {};
        const handler = { get: (target: Record<string, any>, name: string) => target?.[name] || 0 };
        const proxy = new Proxy(source, handler);
        const result = {} as nestedObj;

        result.overallStats = {
            minutesSaved: proxy.minutesSaved,
            segmentCount: proxy.segmentCount,
        };
        if (fetchCategoryStats) {
            result.categoryCount = {
                sponsor: proxy.categorySumSponsor,
                intro: proxy.categorySumIntro,
                outro: proxy.categorySumOutro,
                interaction: proxy.categorySumInteraction,
                selfpromo: proxy.categorySelfpromo,
                music_offtopic: proxy.categoryMusicOfftopic,
                preview: proxy.categorySumPreview,
                poi_highlight: proxy.categorySumHighlight,
            };
        }
        if (fetchActionTypeStats) {
            result.actionTypeCount = {
                skip: proxy.typeSumSkip,
                mute: proxy.typeSumMute,
            };
        }
        return result;
    } catch (err) {
        Logger.error(err as string);
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
    const fetchCategoryStats = req.query.fetchCategoryStats == "true";
    const fetchActionTypeStats = req.query.fetchActionTypeStats == "true";

    if (hashedUserID == undefined) {
        //invalid request
        return res.status(400).send("Invalid userID or publicUserID parameter");
    }
    const segmentSummary = await dbGetUserSummary(hashedUserID, fetchCategoryStats, fetchActionTypeStats);
    const responseObj = {
        userID: hashedUserID,
        userName: await dbGetUsername(hashedUserID),
        ...segmentSummary,
    } as Record<string, nestedObj | string>;
    return res.send(responseObj);
}

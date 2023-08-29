import { db } from "../databases/databases";
import { getHashCache } from "../utils/getHashCache";
import { Request, Response } from "express";
import { HashedUserID, UserID } from "../types/user.model";
import { config } from "../config";
import { Logger } from "../utils/logger";
import { isUserBanned } from "../utils/checkBan";
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
            SUM(CASE WHEN "category" = 'selfpromo' THEN 1 ELSE 0 END) as "categorySumSelfpromo",
            SUM(CASE WHEN "category" = 'music_offtopic' THEN 1 ELSE 0 END) as "categorySumMusicOfftopic",
            SUM(CASE WHEN "category" = 'preview' THEN 1 ELSE 0 END) as "categorySumPreview",
            SUM(CASE WHEN "category" = 'poi_highlight' THEN 1 ELSE 0 END) as "categorySumHighlight",
            SUM(CASE WHEN "category" = 'filler' THEN 1 ELSE 0 END) as "categorySumFiller",
            SUM(CASE WHEN "category" = 'exclusive_access' THEN 1 ELSE 0 END) as "categorySumExclusiveAccess",
            SUM(CASE WHEN "category" = 'chapter' THEN 1 ELSE 0 END) as "categorySumChapter",
        `;
    }
    if (fetchActionTypeStats) {
        additionalQuery += `
            SUM(CASE WHEN "actionType" = 'skip' THEN 1 ELSE 0 END) as "typeSumSkip",
            SUM(CASE WHEN "actionType" = 'mute' THEN 1 ELSE 0 END) as "typeSumMute",
            SUM(CASE WHEN "actionType" = 'full' THEN 1 ELSE 0 END) as "typeSumFull",
            SUM(CASE WHEN "actionType" = 'poi' THEN 1 ELSE 0 END) as "typeSumPoi",
            SUM(CASE WHEN "actionType" = 'chapter' THEN 1 ELSE 0 END) as "typeSumChapter",
        `;
    }
    try {
        const countShadowHidden = await isUserBanned(userID) ? 2 : 1; // if shadowbanned, count shadowhidden as well
        const row = await db.prepare("get", `
            SELECT SUM(CASE WHEN "actionType" = 'chapter' THEN 0 ELSE ((CASE WHEN "endTime" - "startTime" > ? THEN ? ELSE "endTime" - "startTime" END) / 60) * "views" END) as "minutesSaved",
            ${additionalQuery}
            count(*) as "segmentCount"
            FROM "sponsorTimes"
            WHERE "userID" = ? AND "votes" > -2 AND "shadowHidden" != ?`,
        [maxRewardTimePerSegmentInSeconds, maxRewardTimePerSegmentInSeconds, userID, countShadowHidden]);
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
                selfpromo: proxy.categorySumSelfpromo,
                music_offtopic: proxy.categorySumMusicOfftopic,
                preview: proxy.categorySumPreview,
                poi_highlight: proxy.categorySumHighlight,
                filler: proxy.categorySumFiller,
                exclusive_access: proxy.categorySumExclusiveAccess,
                chapter: proxy.categorySumChapter,
            };
        }
        if (fetchActionTypeStats) {
            result.actionTypeCount = {
                skip: proxy.typeSumSkip,
                mute: proxy.typeSumMute,
                full: proxy.typeSumFull,
                poi: proxy.typeSumPoi,
                chapter: proxy.typeSumChapter,
            };
        }
        return result;
    } catch (err) /* istanbul ignore next */ {
        Logger.error(err as string);
        return null;
    }
}

async function dbGetUsername(userID: HashedUserID) {
    try {
        const row = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID]);
        return row?.userName ?? userID;
    } catch (err) /* istanbul ignore next */ {
        return false;
    }
}

export async function getUserStats(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as UserID;
    const hashedUserID: HashedUserID = userID ? await getHashCache(userID) : req.query.publicUserID as HashedUserID;
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

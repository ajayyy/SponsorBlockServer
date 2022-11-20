import { db } from "../databases/databases";
import { createMemoryCache } from "../utils/createMemoryCache";
import { config } from "../config";
import { Request, Response } from "express";

const MILLISECONDS_IN_MINUTE = 60000;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
const getTopUsersWithCache = createMemoryCache(generateTopUsersStats, config.getTopUsersCacheTimeMinutes * MILLISECONDS_IN_MINUTE);
const maxRewardTimePerSegmentInSeconds = config.maxRewardTimePerSegmentInSeconds ?? 86400;

async function generateTopUsersStats(sortBy: string, categoryStatsEnabled = false) {
    const userNames = [];
    const viewCounts = [];
    const totalSubmissions = [];
    const minutesSaved = [];
    const categoryStats: any[] = categoryStatsEnabled ? [] : undefined;

    let additionalFields = "";
    if (categoryStatsEnabled) {
        additionalFields += `
            SUM(CASE WHEN category = 'sponsor' THEN 1 ELSE 0 END) as "categorySumSponsor",
            SUM(CASE WHEN category = 'intro' THEN 1 ELSE 0 END) as "categorySumIntro",
            SUM(CASE WHEN category = 'outro' THEN 1 ELSE 0 END) as "categorySumOutro",
            SUM(CASE WHEN category = 'interaction' THEN 1 ELSE 0 END) as "categorySumInteraction",
            SUM(CASE WHEN category = 'selfpromo' THEN 1 ELSE 0 END) as "categorySumSelfpromo",
            SUM(CASE WHEN category = 'music_offtopic' THEN 1 ELSE 0 END) as "categorySumMusicOfftopic",
            SUM(CASE WHEN category = 'preview' THEN 1 ELSE 0 END) as "categorySumPreview",
            SUM(CASE WHEN category = 'poi_highlight' THEN 1 ELSE 0 END) as "categorySumHighlight",
            SUM(CASE WHEN category = 'filler' THEN 1 ELSE 0 END) as "categorySumFiller",
            SUM(CASE WHEN category = 'exclusive_access' THEN 1 ELSE 0 END) as "categorySumExclusiveAccess",
            SUM(CASE WHEN category = 'chapter' THEN 1 ELSE 0 END) as "categorySumChapter",
        `;
    }

    const rows = await db.prepare("all", `SELECT COUNT(*) as "totalSubmissions", SUM(views) as "viewCount",
        SUM(CASE WHEN "sponsorTimes"."actionType" = 'chapter' THEN 0 ELSE ((CASE WHEN "sponsorTimes"."endTime" - "sponsorTimes"."startTime" > ? THEN ? ELSE "sponsorTimes"."endTime" - "sponsorTimes"."startTime" END) / 60) * "sponsorTimes"."views" END) as "minutesSaved",
        SUM("votes") as "userVotes", ${additionalFields} COALESCE("userNames"."userName", "sponsorTimes"."userID") as "userName" FROM "sponsorTimes" LEFT JOIN "userNames" ON "sponsorTimes"."userID"="userNames"."userID"
        LEFT JOIN "shadowBannedUsers" ON "sponsorTimes"."userID"="shadowBannedUsers"."userID"
        WHERE "sponsorTimes"."votes" > -1 AND "sponsorTimes"."shadowHidden" != 1 AND "shadowBannedUsers"."userID" IS NULL
        GROUP BY COALESCE("userName", "sponsorTimes"."userID") HAVING SUM("votes") > 20
        ORDER BY "${sortBy}" DESC LIMIT 100`, [maxRewardTimePerSegmentInSeconds, maxRewardTimePerSegmentInSeconds]);

    for (const row of rows) {
        userNames.push(row.userName);
        viewCounts.push(row.viewCount);
        totalSubmissions.push(row.totalSubmissions);
        minutesSaved.push(row.minutesSaved);
        if (categoryStatsEnabled) {
            categoryStats.push([
                row.categorySumSponsor,
                row.categorySumIntro,
                row.categorySumOutro,
                row.categorySumInteraction,
                row.categorySumSelfpromo,
                row.categorySumMusicOfftopic,
                row.categorySumPreview,
                row.categorySumHighlight,
                row.categorySumFiller,
                row.categorySumExclusiveAccess,
                row.categorySumChapter
            ]);
        }
    }

    return {
        userNames,
        viewCounts,
        totalSubmissions,
        minutesSaved,
        categoryStats,
    };
}

export async function getTopUsers(req: Request, res: Response): Promise<Response> {
    const sortType = parseInt(req.query.sortType as string);
    const categoryStatsEnabled = req.query.categoryStats;

    //setup which sort type to use
    let sortBy = "";
    if (sortType == 0) {
        sortBy = "minutesSaved";
    } else if (sortType == 1) {
        sortBy = "viewCount";
    } else if (sortType == 2) {
        sortBy = "totalSubmissions";
    } else {
        //invalid request
        return res.sendStatus(400);
    }

    if (db.highLoad()) {
        return res.status(503).send("Disabled for load reasons");
    }

    const stats = await getTopUsersWithCache(sortBy, categoryStatsEnabled);

    //send this result
    return res.send(stats);
}

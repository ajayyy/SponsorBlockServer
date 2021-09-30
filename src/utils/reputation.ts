import { db } from "../databases/databases";
import { UserID } from "../types/user.model";
import { QueryCacher } from "./queryCacher";
import { reputationKey } from "./redisKeys";

interface ReputationDBResult {
    totalSubmissions: number,
    downvotedSubmissions: number,
    nonSelfDownvotedSubmissions: number,
    votedSum: number,
    lockedSum: number,
    semiOldUpvotedSubmissions: number,
    oldUpvotedSubmissions: number,
    mostUpvotedInLockedVideoSum: number
}

export async function getReputation(userID: UserID): Promise<number> {
    const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 45; // 45 days ago
    const pastDate = Date.now() - 1000 * 60 * 60 * 24 * 45; // 45 days ago
    // 1596240000000 is August 1st 2020, a little after auto upvote was disabled
    const fetchFromDB = () => db.prepare("get",
        `SELECT COUNT(*) AS "totalSubmissions",
            SUM(CASE WHEN "votes" < 0 THEN 1 ELSE 0 END) AS "downvotedSubmissions",
            SUM(CASE WHEN "votes" < 0 AND "videoID" NOT IN 
                (SELECT b."videoID" FROM "sponsorTimes" as b 
                    WHERE b."userID" = ?
                        AND b."votes" > 0 AND b."category" = "a"."category" AND b."videoID" = "a"."videoID" LIMIT 1)
                THEN 1 ELSE 0 END) AS "nonSelfDownvotedSubmissions",
            SUM(CASE WHEN "timeSubmitted" > 1596240000000 THEN "votes" ELSE 0 END) AS "votedSum",
            SUM(locked) AS "lockedSum",
            SUM(CASE WHEN "timeSubmitted" < ? AND "timeSubmitted" > 1596240000000 AND "votes" > 0 THEN 1 ELSE 0 END) AS "semiOldUpvotedSubmissions",
            SUM(CASE WHEN "timeSubmitted" < ? AND "timeSubmitted" > 1596240000000 AND "votes" > 0 THEN 1 ELSE 0 END) AS "oldUpvotedSubmissions",
            SUM(CASE WHEN "votes" > 0 
                AND NOT EXISTS (
                    SELECT * FROM "sponsorTimes" as c 
                    WHERE (c."votes" > "a"."votes" OR  c."locked" > "a"."locked") AND 
                        c."videoID" = "a"."videoID" AND 
                        c."category" = "a"."category" LIMIT 1) 
                AND EXISTS (
                    SELECT * FROM "lockCategories" as l 
                    WHERE l."videoID" = "a"."videoID" AND l."service" = "a"."service" AND l."category" = "a"."category" LIMIT 1)
                THEN 1 ELSE 0 END) AS "mostUpvotedInLockedVideoSum"
        FROM "sponsorTimes" as "a" WHERE "userID" = ?`, [userID, weekAgo, pastDate, userID]) as Promise<ReputationDBResult>;

    const result = await QueryCacher.get(fetchFromDB, reputationKey(userID));

    return calculateReputationFromMetrics(result);
}

// convert a number from one range to another.
function convertRange(value: number, currentMin: number, currentMax: number, targetMin: number, targetMax: number): number {
    const currentRange = currentMax - currentMin;
    const targetRange = targetMax - targetMin;
    return ((value - currentMin) / currentRange) * targetRange + targetMin;
}

export function calculateReputationFromMetrics(metrics: ReputationDBResult): number {
    // Grace period
    if (metrics.totalSubmissions < 5) {
        return 0;
    }

    const downvoteRatio = metrics.downvotedSubmissions / metrics.totalSubmissions;
    if (downvoteRatio > 0.3) {
        return convertRange(Math.min(downvoteRatio, 0.7), 0.3, 0.7, -0.5, -2.5);
    }

    const nonSelfDownvoteRatio = metrics.nonSelfDownvotedSubmissions / metrics.totalSubmissions;
    if (nonSelfDownvoteRatio > 0.05) {
        return convertRange(Math.min(nonSelfDownvoteRatio, 0.4), 0.05, 0.4, -0.5, -2.5);
    }

    if (metrics.votedSum < 5) {
        return 0;
    }

    if (metrics.oldUpvotedSubmissions < 3) {
        if (metrics.semiOldUpvotedSubmissions > 3) {
            return convertRange(Math.min(metrics.votedSum, 150), 5, 150, 0, 2) +
            convertRange(Math.min((metrics.lockedSum ?? 0) + (metrics.mostUpvotedInLockedVideoSum ?? 0), 50), 0, 50, 0, 5);
        } else {
            return 0;
        }
    }

    return convertRange(Math.min(metrics.votedSum, 150), 5, 150, 0, 7) +
        convertRange(Math.min((metrics.lockedSum ?? 0) + (metrics.mostUpvotedInLockedVideoSum ?? 0), 50), 0, 50, 0, 20);
}
import { db } from "../databases/databases";
import { UserID } from "../types/user.model";
import { QueryCacher } from "./queryCacher";
import { reputationKey } from "./redisKeys";

interface ReputationDBResult {
    totalSubmissions: number,
    downvotedSubmissions: number,
    nonSelfDownvotedSubmissions: number,
    upvotedSum: number,
    lockedSum: number,
    oldUpvotedSubmissions: number
}

export async function getReputation(userID: UserID): Promise<number> {
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
                SUM(CASE WHEN "votes" > 0 AND "timeSubmitted" > 1596240000000 THEN "votes" ELSE 0 END) AS "upvotedSum",
                SUM(locked) AS "lockedSum",
                SUM(CASE WHEN "timeSubmitted" < ? AND "timeSubmitted" > 1596240000000 AND "votes" > 0 THEN 1 ELSE 0 END) AS "oldUpvotedSubmissions"
            FROM "sponsorTimes" as "a" WHERE "userID" = ?`, [userID, pastDate, userID]) as Promise<ReputationDBResult>;

    const result = await QueryCacher.get(fetchFromDB, reputationKey(userID));
    
    // Grace period
    if (result.totalSubmissions < 5) {
        return 0;
    }

    const downvoteRatio = result.downvotedSubmissions / result.totalSubmissions;
    if (downvoteRatio > 0.3) {
        return convertRange(Math.min(downvoteRatio, 0.7), 0.3, 0.7, -0.5, -2.5);
    }

    const nonSelfDownvoteRatio = result.nonSelfDownvotedSubmissions / result.totalSubmissions;
    if (nonSelfDownvoteRatio > 0.05) {
        return convertRange(Math.min(nonSelfDownvoteRatio, 0.4), 0.05, 0.4, -0.5, -2.5);
    }

    if (result.oldUpvotedSubmissions < 3 || result.upvotedSum < 5) {
        return 0;
    }

    return convertRange(Math.min(result.upvotedSum, 150), 5, 150, 0, 7) + convertRange(Math.min(result.lockedSum ?? 0, 50), 0, 50, 0, 20);
}

function convertRange(value: number, currentMin: number, currentMax: number, targetMin: number, targetMax: number): number {
    const currentRange = currentMax - currentMin;  
    const targetRange = targetMax - targetMin;
    return ((value - currentMin) / currentRange) * targetRange + targetMin;
}
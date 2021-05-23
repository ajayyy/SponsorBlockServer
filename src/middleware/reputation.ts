import { db } from "../databases/databases";
import { UserID } from "../types/user.model";
import { QueryCacher } from "./queryCacher";
import { userKey } from "./redisKeys";

interface ReputationDBResult {
    totalSubmissions: number,
    downvotedSubmissions: number,
    upvotedSum: number,
    oldUpvotedSubmissions: number
}

export async function getReputation(userID: UserID) {
    const pastDate = Date.now() - 1000 * 1000 * 60 * 60 * 24 * 45; // 45 days ago
    const fetchFromDB = () => db.prepare("get", 
            `SELECT COUNT(*) AS "totalSubmissions",
                SUM(CASE WHEN "votes" < 0 THEN 1 ELSE 0 END) AS "downvotedSubmissions",
                SUM(CASE WHEN "votes" > 0 THEN "votes" ELSE 0 END) AS "upvotedSum",
                SUM(CASE WHEN "timeSubmitted" < ? AND "votes" > 0 THEN 1 ELSE 0 END) AS "oldUpvotedSubmissions"
            FROM "sponsorTimes" WHERE "userID" = ?`, [pastDate, userID]) as Promise<ReputationDBResult>;

    const result = await QueryCacher.get(fetchFromDB, userKey(userID));

    // Grace period
    if (result.totalSubmissions < 5) {
        return 0;
    }

    const downvoteRatio = result.downvotedSubmissions / result.totalSubmissions;
    if (downvoteRatio > 0.3) {
        return convertRange(downvoteRatio, 0.3, 1, -0.5, -1.5);
    }

    if (result.oldUpvotedSubmissions < 3 || result.upvotedSum < 5) {
        return 0
    }

    return convertRange(Math.min(result.upvotedSum, 50), 5, 50, 0, 15);
}

function convertRange(value: number, currentMin: number, currentMax: number, targetMin: number, targetMax: number): number {
    const currentRange = currentMax - currentMin;  
    const targetRange = targetMax - targetMin;
    return ((value - currentMin) / currentRange) * targetRange + targetMin;
}
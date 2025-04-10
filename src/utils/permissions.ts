import { config } from "../config";
import { db } from "../databases/databases";
import { Category } from "../types/segments.model";
import { Feature, HashedUserID } from "../types/user.model";
import { hasFeature } from "./features";
import { isUserVIP } from "./isUserVIP";
import { oneOf } from "./promise";
import redis from "./redis";
import { getReputation } from "./reputation";
import { getServerConfig } from "./serverConfig";

interface CanSubmitResult {
    canSubmit: boolean;
    reason: string;
}

async function lowDownvotes(userID: HashedUserID): Promise<boolean> {
    const result = await db.prepare("get", `SELECT count(*) as "submissionCount", SUM(CASE WHEN "votes" < 0 AND "views" > 5 THEN 1 ELSE 0 END) AS "downvotedSubmissions" FROM "sponsorTimes" WHERE "userID" = ?`
        , [userID], { useReplica: true });

    return result.submissionCount > 5 && result.downvotedSubmissions / result.submissionCount < 0.10;
}

const fiveMinutes = 5 * 60 * 1000;
async function oldSubmitterOrAllowed(userID: HashedUserID): Promise<boolean> {
    const submitterThreshold = await getServerConfig("old-submitter-block-date");
    const maxUsers = await getServerConfig("max-users-per-minute");
    if (!submitterThreshold && !maxUsers) {
        return true;
    }

    const result = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "sponsorTimes" WHERE "userID" = ? AND "timeSubmitted" < ?`
        , [userID, parseInt(submitterThreshold) || Infinity], { useReplica: true });

    const isOldSubmitter = result.submissionCount >= 1;
    if (!isOldSubmitter) {
        await redis.zRemRangeByScore("submitters", "-inf", Date.now() - fiveMinutes);
        const last5MinUsers = await redis.zCard("submitters");

        if (maxUsers && last5MinUsers < parseInt(maxUsers)) {
            await redis.zAdd("submitters", { score: Date.now(), value: userID });
            return true;
        }
    }

    return isOldSubmitter;
}

async function oldDeArrowSubmitterOrAllowed(userID: HashedUserID): Promise<boolean> {
    const submitterThreshold = await getServerConfig("old-submitter-block-date");
    const maxUsers = await getServerConfig("max-users-per-minute-dearrow");
    if (!submitterThreshold && !maxUsers) {
        return true;
    }

    const result = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "titles" WHERE "userID" = ? AND "timeSubmitted" < 1743827196000`
        , [userID, parseInt(submitterThreshold) || Infinity], { useReplica: true });

    const isOldSubmitter = result.submissionCount >= 1;
    if (!isOldSubmitter) {
        if (!submitterThreshold) {
            const voteResult = await db.prepare("get", `SELECT "UUID" from "titleVotes" where "userID" = ?`, [userID], { useReplica: true });
            if (voteResult?.UUID) {
                // Count at least one vote as an old submitter as well
                return true;
            }
        }

        await redis.zRemRangeByScore("submittersDeArrow", "-inf", Date.now() - fiveMinutes);
        const last5MinUsers = await redis.zCard("submittersDeArrow");

        if (maxUsers && last5MinUsers < parseInt(maxUsers)) {
            await redis.zAdd("submittersDeArrow", { score: Date.now(), value: userID });
            return true;
        }
    }

    return isOldSubmitter;
}

export async function canSubmit(userID: HashedUserID, category: Category): Promise<CanSubmitResult> {
    switch (category) {
        case "chapter":
            return {
                canSubmit: await oneOf([isUserVIP(userID),
                    lowDownvotes(userID),
                    (async () => (await getReputation(userID)) > config.minReputationToSubmitChapter)(),
                    hasFeature(userID, Feature.ChapterSubmitter)
                ]),
                reason: "Submitting chapters requires a minimum reputation. You can ask on Discord/Matrix to get permission with less reputation."
            };
        default:
            return {
                canSubmit: true,
                reason: ""
            };
    }
}

export async function canSubmitGlobal(userID: HashedUserID): Promise<CanSubmitResult> {
    return {
        canSubmit: await oneOf([isUserVIP(userID),
            oldSubmitterOrAllowed(userID)
        ]),
        reason: "We are currently experiencing a mass spam attack, we are restricting submissions for now"
    };
}

export async function canSubmitDeArrow(userID: HashedUserID): Promise<CanSubmitResult> {
    return {
        canSubmit: await oneOf([isUserVIP(userID),
            oldDeArrowSubmitterOrAllowed(userID)
        ]),
        reason: "We are currently experiencing a mass spam attack, we are restricting submissions for now"
    };
}
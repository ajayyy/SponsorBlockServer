import { config } from "../config";
import { db, privateDB } from "../databases/databases";
import { Category } from "../types/segments.model";
import { Feature, HashedUserID } from "../types/user.model";
import { hasFeature } from "./features";
import { isUserVIP } from "./isUserVIP";
import { oneOf } from "./promise";
import redis from "./redis";
import { getReputation } from "./reputation";
import { getServerConfig } from "./serverConfig";

interface OldSubmitterResult {
    canSubmit: boolean;
    newUser: boolean;
}

interface CanSubmitResult {
    canSubmit: boolean;
    reason: string;
}

interface CanSubmitGlobalResult {
    canSubmit: boolean;
    newUser: boolean;
    reason: string;
}

async function lowDownvotes(userID: HashedUserID): Promise<boolean> {
    const result = await db.prepare("get", `SELECT count(*) as "submissionCount", SUM(CASE WHEN "votes" < 0 AND "views" > 5 THEN 1 ELSE 0 END) AS "downvotedSubmissions" FROM "sponsorTimes" WHERE "userID" = ?`
        , [userID], { useReplica: true });

    return result.submissionCount > 5 && result.downvotedSubmissions / result.submissionCount < 0.10;
}

const fiveMinutes = 5 * 60 * 1000;
async function oldSubmitterOrAllowed(userID: HashedUserID): Promise<OldSubmitterResult> {
    const submitterThreshold = await getServerConfig("old-submitter-block-date");
    const maxUsers = await getServerConfig("max-users-per-minute");
    if (!submitterThreshold && !maxUsers) {
        return { canSubmit: true, newUser: false };
    }

    const result = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = 0 AND "votes" >= 0 AND "timeSubmitted" < ?`
        , [userID, parseInt(submitterThreshold) || Infinity], { useReplica: true });

    const isOldSubmitter = result.submissionCount >= 1;
    if (!isOldSubmitter) {
        await redis.zRemRangeByScore("submitters", "-inf", Date.now() - fiveMinutes);
        const last5MinUsers = await redis.zCard("submitters");

        if (maxUsers && last5MinUsers < parseInt(maxUsers)) {
            await redis.zAdd("submitters", { score: Date.now(), value: userID });
            return { canSubmit: true, newUser: true };
        }
    }

    return { canSubmit: isOldSubmitter, newUser: false };
}

async function oldDeArrowSubmitterOrAllowed(userID: HashedUserID): Promise<OldSubmitterResult> {
    const submitterThreshold = await getServerConfig("old-submitter-block-date");
    const maxUsers = await getServerConfig("max-users-per-minute-dearrow");
    if (!submitterThreshold && !maxUsers) {
        return { canSubmit: true, newUser: false };
    }

    const result = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" WHERE "userID" = ? AND "shadowHidden" = 0 AND "votes" >= 0 AND "timeSubmitted" < ?`
        , [userID, parseInt(submitterThreshold) || Infinity], { useReplica: true });

    const isOldSubmitter = result.submissionCount >= 1;
    if (!isOldSubmitter) {
        if (!submitterThreshold) {
            const voteResult = await privateDB.prepare("get", `SELECT "UUID" from "titleVotes" where "userID" = ?`, [userID], { useReplica: true });
            if (voteResult?.UUID) {
                // Count at least one vote as an old submitter as well
                return { canSubmit: true, newUser: false };
            }
        }

        await redis.zRemRangeByScore("submittersDeArrow", "-inf", Date.now() - fiveMinutes);
        const last5MinUsers = await redis.zCard("submittersDeArrow");

        if (maxUsers && last5MinUsers < parseInt(maxUsers)) {
            await redis.zAdd("submittersDeArrow", { score: Date.now(), value: userID });
            return { canSubmit: true, newUser: true };
        }
    }

    return { canSubmit: isOldSubmitter, newUser: false };
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

export function validSubmittedData(userAgent: string, userAgentR: string): boolean {
    if (!config.validityCheck.userAgent) {
        return true;
    }

    for (const key of Object.keys(config.validityCheck)) {
        const check = (config.validityCheck as Record<string, string | null>)[key];
        if (check === null) {
            continue;
        } else {
            switch (key) {
                case "userAgent":
                    if (!userAgent.match(check)) {
                        return false;
                    }
                    break;
                case "userAgentR":
                    if (!userAgentR.match(new RegExp(check))) {
                        return false;
                    }
                    break;
            }
        }
    }

    return true;
}

export async function canSubmitGlobal(userID: HashedUserID): Promise<CanSubmitGlobalResult> {
    const oldSubmitterOrAllowedPromise = oldSubmitterOrAllowed(userID);

    return {
        canSubmit: await oneOf([isUserVIP(userID),
            (async () => (await oldSubmitterOrAllowedPromise).canSubmit)()
        ]),
        newUser: (await oldSubmitterOrAllowedPromise).newUser,
        reason: "We are currently experiencing a mass spam attack, we are restricting submissions for now"
    };
}

export async function canSubmitDeArrow(userID: HashedUserID): Promise<CanSubmitGlobalResult> {
    const oldSubmitterOrAllowedPromise = oldDeArrowSubmitterOrAllowed(userID);

    return {
        canSubmit: await oneOf([isUserVIP(userID),
            (async () => (await oldSubmitterOrAllowedPromise).canSubmit)()
        ]),
        newUser: (await oldSubmitterOrAllowedPromise).newUser,
        reason: "We are currently experiencing a mass spam attack, we are restricting submissions for now"
    };
}
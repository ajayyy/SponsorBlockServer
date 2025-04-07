import { config } from "../config";
import { db } from "../databases/databases";
import { Category } from "../types/segments.model";
import { Feature, HashedUserID } from "../types/user.model";
import { hasFeature } from "./features";
import { isUserVIP } from "./isUserVIP";
import { oneOf } from "./promise";
import { getReputation } from "./reputation";

interface CanSubmitResult {
    canSubmit: boolean;
    reason: string;
}

async function lowDownvotes(userID: HashedUserID): Promise<boolean> {
    const result = await db.prepare("get", `SELECT count(*) as "submissionCount", SUM(CASE WHEN "votes" < 0 AND "views" > 5 THEN 1 ELSE 0 END) AS "downvotedSubmissions" FROM "sponsorTimes" WHERE "userID" = ?`
        , [userID], { useReplica: true });

    return result.submissionCount > 5 && result.downvotedSubmissions / result.submissionCount < 0.10;
}

async function oldSubmitter(userID: HashedUserID): Promise<boolean> {
    const result = await db.prepare("get", `SELECT count(*) as "submissionCount" FROM "sponsorTimes" WHERE "userID" = ? AND "timeSubmitted" < 1743827196000`
        , [userID], { useReplica: true });

    return result.submissionCount > 1;
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
                canSubmit: await oneOf([isUserVIP(userID),
                    oldSubmitter(userID)
                ]),
                reason: "We are currently experiencing a mass spam attack"
            };
    }
}

export async function canSubmitGlobal(userID: HashedUserID): Promise<CanSubmitResult> {
    return {
        canSubmit: await oneOf([isUserVIP(userID),
            oldSubmitter(userID)
        ]),
        reason: "We are currently experiencing a mass spam attack"
    };
}
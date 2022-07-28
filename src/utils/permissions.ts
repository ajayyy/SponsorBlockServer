import { config } from "../config";
import { Category } from "../types/segments.model";
import { Feature, HashedUserID } from "../types/user.model";
import { hasFeature } from "./features";
import { isUserVIP } from "./isUserVIP";
import { getReputation } from "./reputation";

interface CanSubmitResult {
    canSubmit: boolean;
    reason?: string;
}

export async function canSubmit(userID: HashedUserID, category: Category): Promise<CanSubmitResult> {
    switch (category) {
        case "chapter":
            return {
                canSubmit: (await isUserVIP(userID))
                || (await getReputation(userID)) > config.minReputationToSubmitChapter
                || (await hasFeature(userID, Feature.ChapterSubmitter))
            };
        case "filler":
            return {
                canSubmit: (await isUserVIP(userID))
                || (await getReputation(userID)) > config.minReputationToSubmitFiller
                || (await hasFeature(userID, Feature.FillerSubmitter)),
                reason: "Someone has submitted over 1.9 million spam filler submissions and refuses to stop even after talking with them, so we have to restrict it for now. You can request submission access on chat.sponsor.ajay.app, discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app"
            };
    }

    return {
        canSubmit: true
    };
}
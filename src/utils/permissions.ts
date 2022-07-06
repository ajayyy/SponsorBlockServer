import { config } from "../config";
import { Feature, HashedUserID } from "../types/user.model";
import { hasFeature } from "./features";
import { isUserVIP } from "./isUserVIP";
import { getReputation } from "./reputation";

export async function canSubmitChapter(userID: HashedUserID): Promise<boolean> {
    return (await isUserVIP(userID))
        || (await getReputation(userID)) > config.minReputationToSubmitChapter
        || (await hasFeature(userID, Feature.ChapterSubmitter));
}
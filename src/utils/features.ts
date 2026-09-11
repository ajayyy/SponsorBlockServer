import { db } from "../databases/databases.js";
import { Feature, HashedUserID } from "../types/user.model.js";
import { QueryCacher } from "./queryCacher.js";
import { userFeatureKey } from "./redisKeys.js";

export async function hasFeature(userID: HashedUserID, feature: Feature): Promise<boolean> {
    return await QueryCacher.get(async () => {
        const result = await db.prepare("get", 'SELECT "feature" from "userFeatures" WHERE "userID" = ? AND "feature" = ?', [userID, feature], { useReplica: true });
        return !!result;
    }, userFeatureKey(userID, feature));
}

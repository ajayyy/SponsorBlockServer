import { db } from "#databases/databases";
import { QueryCacher } from "#utils/queryCacher";
import { userFeatureKey } from "#utils/redisKeys";

import { Feature, HashedUserID } from "#types/user";

export async function hasFeature(userID: HashedUserID, feature: Feature): Promise<boolean> {
    return await QueryCacher.get(async () => {
        const result = await db.prepare("get", 'SELECT "feature" from "userFeatures" WHERE "userID" = ? AND "feature" = ?', [userID, feature], { useReplica: true });
        return !!result;
    }, userFeatureKey(userID, feature));
}

import redis from "../utils/redis";
import { Logger } from "../utils/logger";
import { skipSegmentsHashKey, skipSegmentsKey, reputationKey, ratingHashKey, skipSegmentGroupsKey, userFeatureKey } from "./redisKeys";
import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { Feature, HashedUserID, UserID } from "../types/user.model";

const expiryTime = 2 * 60 * 60;

async function get<T>(fetchFromDB: () => Promise<T>, key: string): Promise<T> {
    try {
        const reply = await redis.get(key);
        if (reply) {
            Logger.debug(`Got data from redis: ${reply}`);

            return JSON.parse(reply);
        }
    } catch (e) { } //eslint-disable-line no-empty

    const data = await fetchFromDB();

    redis.setEx(key, expiryTime, JSON.stringify(data)).catch((err) => Logger.error(err));

    return data;
}

/**
 * Gets from redis for all specified values and splits the result before adding it to redis cache
 */
async function getAndSplit<T, U extends string>(fetchFromDB: (values: U[]) => Promise<Array<T>>, keyGenerator: (value: U) => string, splitKey: string, values: U[]): Promise<Array<T>> {
    const cachedValues = await Promise.all(values.map(async (value) => {
        const key = keyGenerator(value);
        try {
            const reply = await redis.get(key);
            if (reply) {
                Logger.debug(`Got data from redis: ${reply}`);

                return {
                    value,
                    result: JSON.parse(reply)
                };
            }
        } catch (e) { } //eslint-disable-line no-empty

        return {
            value,
            result: null
        };
    }));

    const valuesToBeFetched = cachedValues.filter((cachedValue) => cachedValue.result === null)
        .map((cachedValue) => cachedValue.value);

    let data: Array<T> = [];
    if (valuesToBeFetched.length > 0) {
        data = await fetchFromDB(valuesToBeFetched);

        new Promise(() => {
            const newResults: Record<string, T[]> = {};
            for (const item of data) {
                const splitValue = (item as unknown as Record<string, string>)[splitKey];
                const key = keyGenerator(splitValue as unknown as U);
                newResults[key] ??= [];
                newResults[key].push(item);
            }

            for (const value of valuesToBeFetched) {
                // If it wasn't in the result, cache it as blank
                newResults[keyGenerator(value)] ??= [];
            }

            for (const key in newResults) {
                redis.setEx(key, expiryTime, JSON.stringify(newResults[key])).catch((err) => Logger.error(err));
            }
        });
    }

    return data.concat(...(cachedValues.map((cachedValue) => cachedValue.result).filter((result) => result !== null) || []));
}

function clearSegmentCache(videoInfo: { videoID: VideoID; hashedVideoID: VideoIDHash; service: Service; userID?: UserID; }): void {
    if (videoInfo) {
        redis.del(skipSegmentsKey(videoInfo.videoID, videoInfo.service)).catch((err) => Logger.error(err));
        redis.del(skipSegmentGroupsKey(videoInfo.videoID, videoInfo.service)).catch((err) => Logger.error(err));
        redis.del(skipSegmentsHashKey(videoInfo.hashedVideoID, videoInfo.service)).catch((err) => Logger.error(err));
        if (videoInfo.userID) redis.del(reputationKey(videoInfo.userID)).catch((err) => Logger.error(err));
    }
}

function clearRatingCache(videoInfo: { hashedVideoID: VideoIDHash; service: Service;}): void {
    if (videoInfo) {
        redis.del(ratingHashKey(videoInfo.hashedVideoID, videoInfo.service)).catch((err) => Logger.error(err));
    }
}

function clearFeatureCache(userID: HashedUserID, feature: Feature): void {
    redis.del(userFeatureKey(userID, feature)).catch((err) => Logger.error(err));
}

export const QueryCacher = {
    get,
    getAndSplit,
    clearSegmentCache,
    clearRatingCache,
    clearFeatureCache
};
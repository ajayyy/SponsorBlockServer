import redis from "../utils/redis";
import { Logger } from "../utils/logger";
import { skipSegmentsHashKey, skipSegmentsKey, reputationKey, ratingHashKey } from "./redisKeys";
import { Service, VideoID, VideoIDHash } from "../types/segments.model";
import { UserID } from "../types/user.model";

async function get<T>(fetchFromDB: () => Promise<T>, key: string): Promise<T> {
    const { err, reply } = await redis.getAsync(key);

    if (!err && reply) {
        try {
            Logger.debug(`Got data from redis: ${reply}`);

            return JSON.parse(reply);
        } catch (e) {
            // If all else, continue on to fetching from the database
        }
    }

    const data = await fetchFromDB();

    redis.setAsync(key, JSON.stringify(data));

    return data;
}

/**
 * Gets from redis for all specified values and splits the result before adding it to redis cache
 */
async function getAndSplit<T, U extends string>(fetchFromDB: (values: U[]) => Promise<Array<T>>, keyGenerator: (value: U) => string, splitKey: string, values: U[]): Promise<Array<T>> {
    const cachedValues = await Promise.all(values.map(async (value) => {
        const key = keyGenerator(value);
        const { err, reply } = await redis.getAsync(key);

        if (!err && reply) {
            try {
                Logger.debug(`Got data from redis: ${reply}`);

                return {
                    value,
                    result: JSON.parse(reply)
                };
            } catch (e) { } //eslint-disable-line no-empty
        }

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

            console.log(newResults);

            for (const key in newResults) {
                redis.setAsync(key, JSON.stringify(newResults[key]));
            }
        });
    }

    return data.concat(...(cachedValues.map((cachedValue) => cachedValue.result).filter((result) => result !== null) || []));
}

function clearSegmentCache(videoInfo: { videoID: VideoID; hashedVideoID: VideoIDHash; service: Service; userID?: UserID; }): void {
    if (videoInfo) {
        redis.delAsync(skipSegmentsKey(videoInfo.videoID, videoInfo.service));
        redis.delAsync(skipSegmentsHashKey(videoInfo.hashedVideoID, videoInfo.service));
        if (videoInfo.userID) redis.delAsync(reputationKey(videoInfo.userID));
    }
}

function clearRatingCache(videoInfo: { hashedVideoID: VideoIDHash; service: Service;}): void {
    if (videoInfo) {
        redis.delAsync(ratingHashKey(videoInfo.hashedVideoID, videoInfo.service));
    }
}

export const QueryCacher = {
    get,
    getAndSplit,
    clearSegmentCache,
    clearRatingCache
};
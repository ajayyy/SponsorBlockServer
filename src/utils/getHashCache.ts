import redis from "../utils/redis";
import { userHashKey } from "../utils/redisKeys";
import { HashedValue } from "../types/hash.model";
import { Logger } from "../utils/logger";
import { getHash } from "../utils/getHash";

export async function getHashCache<T extends string>(value: T, times = 5000): Promise<T & HashedValue> {
    if (times === 5000) {
        const hashKey = getHash(value, 1);
        const result: HashedValue = await getFromRedis(hashKey);
        return result  as T & HashedValue;
    }
    return getHash(value, times);
}

async function getFromRedis<T extends string>(key: HashedValue): Promise<T & HashedValue> {
    const redisKey = userHashKey(key);
    const { err, reply } = await redis.getAsync(redisKey);

    if (!err && reply) {
        try {
            Logger.debug(`Got data from redis: ${reply}`);
            return reply as T & HashedValue;
        } catch (e) {
            // If all else, continue on hashing
        }
    }
    const data = getHash(key, 5000-1);

    redis.setAsync(key, data);
    return data as T & HashedValue;
}
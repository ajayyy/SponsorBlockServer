import redis from "../utils/redis";
import { shaHashKey } from "../utils/redisKeys";
import { HashedValue } from "../types/hash.model";
import { Logger } from "../utils/logger";
import { getHash } from "../utils/getHash";

const defaultedHashTimes = 5000;
const cachedHashTimes = defaultedHashTimes - 1;

export async function getHashCache<T extends string>(value: T, times = defaultedHashTimes): Promise<T & HashedValue> {
    if (times === defaultedHashTimes) {
        const hashKey = getHash(value, 1);
        const result: HashedValue = await getFromRedis(hashKey);
        return result  as T & HashedValue;
    }
    return getHash(value, times);
}

async function getFromRedis<T extends string>(key: HashedValue): Promise<T & HashedValue> {
    const redisKey = shaHashKey(key);

    try {
        const reply = await redis.get(redisKey);

        if (reply) {
            Logger.debug(`Got data from redis: ${reply}`);
            return reply as T & HashedValue;
        }
    } catch (err) {
        Logger.error(err as string);
    }

    // Otherwise, calculate it
    const data = getHash(key, cachedHashTimes);
    redis.set(redisKey, data).catch((err) => Logger.error(err));

    return data as T & HashedValue;
}
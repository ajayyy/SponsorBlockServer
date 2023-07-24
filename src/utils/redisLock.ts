import { config } from "../config";
import redis from "../utils/redis";
import { Logger } from "./logger";

const defaultTimeout = 5000;

export type AcquiredLock = {
    status: false
} | {
    status: true;
    unlock: () => void;
};

export async function acquireLock(key: string, timeout = defaultTimeout): Promise<AcquiredLock> {
    if (!config.redis?.enabled) {
        return {
            status: true,
            unlock: () => void 0
        };
    }

    try {
        const result = await redis.set(key, "1", {
            PX: timeout,
            NX: true
        });

        if (result) {
            return {
                status: true,
                unlock: () => void redis.del(key).catch((err) => Logger.error(err))
            };
        } else {
            return {
                status: false
            };
        }
    } catch (e) {
        Logger.error(e as string);
    }

    return {
        status: false
    };
}
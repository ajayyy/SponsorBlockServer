import { config } from "../config";
import redis, { subscribeToWaitingLock } from "../utils/redis";
import { Logger } from "./logger";

const defaultTimeout = 20000;

export type AcquiredLock = {
    status: false
} | {
    status: true;
    unlock: () => void;
};

export type AcquiredWaitingLock = {
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

        // Fallback to allowing
        return {
            status: true,
            unlock: () => void 0
        };
    }

    return {
        status: false
    };
}

export async function acquireWaitingLock(key: string, timeout = defaultTimeout): Promise<AcquiredWaitingLock> {
    if (!config.redis?.enabled) {
        return {
            unlock: () => void 0
        };
    }

    try {
        const result = await redis.set(key, "1", {
            PX: timeout,
            NX: true
        });

        if (result || await subscribeToWaitingLock(key)) {
            return {
                unlock: () => {
                    redis.del(key).catch((err) => Logger.error(err));
                    redis.publish("waitingLock", key).catch((err) => Logger.error(err));
                }
            };
        }
    } catch (e) {
        Logger.error(e as string);

        // Fallback to allowing
        return {
            unlock: () => void 0
        };
    }
}
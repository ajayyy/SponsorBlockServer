import { config } from "../config";
import { Logger } from "./logger";
import { RedisClientType, SetOptions, createClient } from "redis";
import { RedisCommandArgument, RedisCommandArguments, RedisCommandRawReply } from "@redis/client/dist/lib/commands";
import { RedisClientOptions } from "@redis/client/dist/lib/client";
import { RedisReply } from "rate-limit-redis";
import { db } from "../databases/databases";
import { Postgres } from "../databases/Postgres";
import { compress, uncompress } from "lz4-napi";
import { LRUCache } from "lru-cache";
import { shouldClientCacheKey } from "./redisKeys";
import { ZMember } from "@redis/client/dist/lib/commands/generic-transformers";

export interface RedisStats {
    activeRequests: number;
    writeRequests: number;
    avgReadTime: number;
    avgWriteTime: number;
    memoryCacheHits: number
    memoryCacheTotalHits: number
    memoryCacheLength: number;
    memoryCacheSize: number;
    lastInvalidation: number;
    lastInvalidationMessage: number;
}

interface RedisSB {
    get(key: RedisCommandArgument, useClientCache?: boolean): Promise<string>;
    getWithCache(key: RedisCommandArgument): Promise<string>;
    set(key: RedisCommandArgument, value: RedisCommandArgument, options?: SetOptions): Promise<string>;
    setWithCache(key: RedisCommandArgument, value: RedisCommandArgument, options?: SetOptions): Promise<string>;
    setEx(key: RedisCommandArgument, seconds: number, value: RedisCommandArgument): Promise<string>;
    setExWithCache(key: RedisCommandArgument, seconds: number, value: RedisCommandArgument): Promise<string>;
    del(...keys: [RedisCommandArgument]): Promise<number>;
    increment?(key: RedisCommandArgument): Promise<RedisCommandRawReply[]>;
    sendCommand(args: RedisCommandArguments, options?: RedisClientOptions): Promise<RedisReply>;
    ttl(key: RedisCommandArgument): Promise<number>;
    quit(): Promise<void>;
    zRemRangeByScore(key: string, min: number | RedisCommandArgument, max: number | RedisCommandArgument): Promise<number>;
    zAdd(key: string, members: ZMember | ZMember[]): Promise<number>;
    zCard(key: string): Promise<number>;
}

let exportClient: RedisSB = {
    get: () => Promise.resolve(null),
    getWithCache: () => Promise.resolve(null),
    set: () => Promise.resolve(null),
    setWithCache: () => Promise.resolve(null),
    setEx: () => Promise.resolve(null),
    setExWithCache: () => Promise.resolve(null),
    del: () => Promise.resolve(null),
    increment: () => Promise.resolve(null),
    sendCommand: () => Promise.resolve(null),
    quit: () => Promise.resolve(null),
    ttl: () => Promise.resolve(null),
    zRemRangeByScore: () => Promise.resolve(null),
    zAdd: () => Promise.resolve(null),
    zCard: () => Promise.resolve(null)
};

let lastClientFail = 0;
let lastReadFail = 0;
let activeRequests = 0;
let writeRequests = 0;

let memoryCacheHits = 0;
let memoryCacheMisses = 0;
let memoryCacheUncachedMisses = 0;
let lastInvalidationMessage = 0;
let lastInvalidation = 0;

const readResponseTime: number[] = [];
const writeResponseTime: number[] = [];
let lastResponseTimeLimit = 0;
const maxStoredTimes = 200;

const activeRequestPromises: Record<string, Promise<string>> = {};
// Used to handle race conditions
const resetKeys: Set<RedisCommandArgument> = new Set();
const cache = config.redis.clientCacheSize ? new LRUCache<RedisCommandArgument, string>({
    maxSize: config.redis.clientCacheSize,
    sizeCalculation: (value) => value.length,
    ttl: 1000 * 60 * 30,
    ttlResolution: 1000 * 60 * 15
}) : null;
// Used to cache ttl data
const ttlCache = config.redis.clientCacheSize ? new LRUCache<RedisCommandArgument, number>({
    max: config.redis.clientCacheSize / 10 / 4, // 4 byte integer per element
    ttl: 1000 * 60 * 30,
    ttlResolution: 1000 * 60 * 15
}) : null;

// For redis
let cacheConnectionClientId = "";

export class TooManyActiveConnectionsError extends Error {}

export let connectionPromise: Promise<unknown> = Promise.resolve();


if (config.redis?.enabled) {
    Logger.info("Connected to redis");
    const client = createClient(config.redis);
    const readClient = config.redisRead?.enabled ? createClient(config.redisRead) : null;
    connectionPromise = client.connect();
    void readClient?.connect(); // void as we don't care about the promise
    exportClient = client as unknown as RedisSB;

    let cacheClient = null as RedisClientType | null;

    const createKeyName = (key: RedisCommandArgument) => (key + (config.redis.useCompression ? ".c" : "")) as RedisCommandArgument;

    exportClient.getWithCache = (key) => {
        const cachedItem = cache && cacheClient && cache.get(key);
        if (cachedItem != null) {
            memoryCacheHits++;
            return Promise.resolve(cachedItem);
        } else if (shouldClientCacheKey(key)) {
            memoryCacheMisses++;
        }

        if (memoryCacheHits + memoryCacheMisses > 50000) {
            memoryCacheHits = 0;
            memoryCacheMisses = 0;
            memoryCacheUncachedMisses = 0;
        }

        if (activeRequestPromises[key as string] !== undefined) {
            return activeRequestPromises[key as string];
        }

        const request = exportClient.get(createKeyName(key)).then((reply) => {
            if (reply === null) return null;

            if (config.redis.useCompression) {
                const decompressed = uncompress(Buffer.from(reply, "base64")).then((decompressed) => decompressed.toString("utf-8"));
                if (cache && shouldClientCacheKey(key)) {
                    decompressed.then((d) => {
                        if (!resetKeys.has(key)) {
                            cache.set(key, d);
                        }

                        resetKeys.delete(key);
                    }).catch(Logger.error);
                } else {
                    resetKeys.delete(key);
                }

                return decompressed;
            } else {
                if (cache && shouldClientCacheKey(key)) {
                    if (!resetKeys.has(key)) {
                        cache.set(key, reply);
                    }
                }

                resetKeys.delete(key);
                return reply;
            }
        });

        activeRequestPromises[key as string] = request;

        void request.finally(() => {
            delete activeRequestPromises[key as string];

            resetKeys.delete(key);
        });

        return request;
    };
    exportClient.setWithCache = (key, value, options) => {
        if (cache) {
            cache.set(key, value as string);
        }

        if (config.redis.useCompression) {
            return compress(Buffer.from(value as string, "utf-8")).then((compressed) =>
                exportClient.set(createKeyName(key), compressed.toString("base64"), options)
            );
        } else {
            return exportClient.set(createKeyName(key), value, options);
        }
    };
    exportClient.setExWithCache = (key, seconds, value) => {
        if (cache) {
            cache.set(key, value as string);
        }

        if (config.redis.useCompression) {
            return compress(Buffer.from(value as string, "utf-8")).then((compressed) =>
                exportClient.setEx(createKeyName(key), seconds, compressed.toString("base64"))
            );
        } else {
            return exportClient.setEx(createKeyName(key), seconds, value);
        }
    };

    const del = client.del.bind(client);
    exportClient.del = (...keys) => {
        if (config.redis.dragonflyMode) {
            for (const key of keys) {
                void client.publish("__redis__:invalidate", key);
            }
        }

        if (config.redis.useCompression) {
            return del(keys.flatMap((key) => [key, createKeyName(key)]) as [RedisCommandArgument]);
        } else {
            return del(...keys);
        }
    };

    const ttl = client.ttl.bind(client);
    exportClient.ttl = async (key) => {
        const ttlResult = cache && cacheClient && ttlCache.get(key);
        if (ttlResult != null) {
            // Trigger usage of cache
            cache.get(key);

            return ttlResult + config.redis?.expiryTime - Math.floor(Date.now() / 1000);
        } else {
            const result = await ttl(createKeyName(key));
            if (ttlCache) ttlCache.set(key, Math.floor(Date.now() / 1000) - (config.redis?.expiryTime - result));

            return result;
        }
    };

    const get = client.get.bind(client);
    const getRead = readClient?.get?.bind(readClient);
    exportClient.get = (key) => new Promise((resolve, reject) => {
        if (config.redis.maxConnections && activeRequests > config.redis.maxConnections) {
            reject(new TooManyActiveConnectionsError(`Too many active requests in general: ${activeRequests} over ${config.redis.maxConnections}`));
            return;
        }

        if (config.redis.maxReadResponseTime && activeRequests > maxStoredTimes
                && readResponseTime[readResponseTime.length - 1] > config.redis.maxReadResponseTime) {
            reject(new TooManyActiveConnectionsError(`Redis response time too high in general: ${readResponseTime[readResponseTime.length - 1]}ms with ${activeRequests} connections`));
            return;
        }

        // For tracking
        if (!shouldClientCacheKey(key)) memoryCacheUncachedMisses++;

        const start = Date.now();
        activeRequests++;

        const shouldUseTimeout = config.redis.getTimeout && db.shouldUseRedisTimeout();
        const timeout = shouldUseTimeout ? setTimeout(() => reject(), config.redis.getTimeout) : null;
        const chosenGet = pickChoice(get, getRead);
        chosenGet(key).then((reply) => {
            if (timeout !== null) clearTimeout(timeout);

            activeRequests--;
            resolve(reply);

            const responseTime = Date.now() - start;
            readResponseTime.push(responseTime);
            if (readResponseTime.length > maxStoredTimes) readResponseTime.shift();
            if (config.redis.stopWritingAfterResponseTime
                    && responseTime > config.redis.stopWritingAfterResponseTime) {
                Logger.error(`Hit response time limit at ${responseTime}ms`);
                lastResponseTimeLimit = Date.now();
            }
        }).catch((err) => {
            if (chosenGet === get || chosenGet === cacheClient?.get) {
                lastClientFail = Date.now();
            } else {
                lastReadFail = Date.now();
            }

            activeRequests--;
            reject(err);
        });
    });

    const setFun = <T extends Array<any>>(func: (...args: T) => Promise<string>, params: T): Promise<string> =>
        new Promise((resolve, reject) => {
            if ((config.redis.maxWriteConnections && activeRequests > config.redis.maxWriteConnections)
                || (config.redis.responseTimePause
                        && Date.now() - lastResponseTimeLimit < config.redis.responseTimePause)) {
                reject(`Too many active requests to write due to ${activeRequests} requests and ${Date.now() - lastResponseTimeLimit}ms since last limit. ${(db as Postgres)?.getStats?.()?.activeRequests} active db requests with ${(db as Postgres)?.getStats?.()?.avgReadTime}ms`);
                return;
            }

            const start = Date.now();
            activeRequests++;
            writeRequests++;

            func(...params).then((reply) => {
                activeRequests--;
                writeRequests--;
                resolve(reply);

                writeResponseTime.push(Date.now() - start);
                if (writeResponseTime.length > maxStoredTimes) writeResponseTime.shift();
            }).catch((err) => {
                activeRequests--;
                writeRequests--;
                reject(err);
            });
        });

    const set = client.set.bind(client);
    const setEx = client.setEx.bind(client);
    exportClient.set = (key, value, options) => setFun(set, [key, value, options]);
    exportClient.setEx = (key, seconds, value) => setFun(setEx, [key, seconds, value]);
    exportClient.increment = (key) => new Promise((resolve, reject) =>
        void client.multi()
            .incr(key)
            .expire(key, 60)
            .exec()
            .then((reply) => resolve(reply))
            .catch((err) => reject(err))
    );
    exportClient.zRemRangeByScore = client.zRemRangeByScore.bind(client);
    exportClient.zAdd = client.zAdd.bind(client);
    exportClient.zCard = client.zCard.bind(client);
    /* istanbul ignore next */
    client.on("error", function(error) {
        lastClientFail = Date.now();
        Logger.error(`Redis Error: ${error}`);
    });
    /* istanbul ignore next */
    client.on("reconnecting", () => {
        Logger.info("Redis: trying to reconnect");
    });
    /* istanbul ignore next */
    readClient?.on("error", function(error) {
        lastReadFail = Date.now();
        Logger.error(`Redis Read-Only Error: ${error}`);
    });
    /* istanbul ignore next */
    readClient?.on("reconnecting", () => {
        Logger.info("Redis Read-Only: trying to reconnect");
    });

    // It needs to recreate itself when the connection fails as the queue connection doesn't properly restart
    const createCacheClient = () => {
        cacheClient = createClient(config.redis) as RedisClientType;

        /* istanbul ignore next */
        cacheClient.on("error", function (error) {
            lastClientFail = Date.now();
            Logger.error(`Redis Cache Client Error: ${error}`);
        });
        /* istanbul ignore next */
        cacheClient.on("reconnecting", () => {
            Logger.info("Redis cache client: trying to reconnect");
            cache?.clear();

            void cacheClient.disconnect();
            setTimeout(() => createCacheClient(), 1000);
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        cacheClient.on("ready", async () => {
            cache?.clear();

            await setupCacheClientListener(cacheClient as RedisClientType, cache);
            void Promise.all([
                setupCacheClientTracking(client as RedisClientType, cacheClient as RedisClientType),
                setupCacheClientTracking(readClient as RedisClientType, cacheClient as RedisClientType)
            ]).then(() => cache?.clear());
        });

        void cacheClient.connect();
    };

    if (config.redis.clientCacheSize) {
        createCacheClient();

        client.on("ready", () => {
            if (cacheClient.isReady) {
                void setupCacheClientTracking(client as RedisClientType, cacheClient as RedisClientType);
            }
        });

        readClient?.on("ready", () => {
            if (cacheClient.isReady) {
                void setupCacheClientTracking(readClient as RedisClientType, cacheClient as RedisClientType);
            }
        });
    }
}

function pickChoice<T>(client: T, readClient: T): T {
    const readAvailable = !!readClient;
    const ignoreReadDueToFailure = lastReadFail > Date.now() - 1000 * 30;
    const readDueToFailure = lastClientFail > Date.now() - 1000 * 30;
    if (readAvailable && !ignoreReadDueToFailure && (readDueToFailure ||
            Math.random() > 1 / (config.redisRead?.weight + 1))) {
        return readClient;
    } else {
        return client;
    }
}

export function getRedisStats(): RedisStats {
    return {
        activeRequests,
        writeRequests,
        avgReadTime: readResponseTime.length > 0 ? readResponseTime.reduce((a, b) => a + b, 0) / readResponseTime.length : 0,
        avgWriteTime: writeResponseTime.length > 0 ? writeResponseTime.reduce((a, b) => a + b, 0) / writeResponseTime.length : 0,
        memoryCacheHits: memoryCacheHits / (memoryCacheHits + memoryCacheMisses),
        memoryCacheTotalHits: memoryCacheHits / (memoryCacheHits + memoryCacheMisses + memoryCacheUncachedMisses),
        memoryCacheLength: cache?.size ?? 0,
        memoryCacheSize: cache?.calculatedSize ?? 0,
        lastInvalidation,
        lastInvalidationMessage
    };
}

async function setupCacheClientListener(cacheClient: RedisClientType,
    cache: LRUCache<RedisCommandArgument, string>) {

    if (!config.redis.dragonflyMode) {
        cacheConnectionClientId = String(await cacheClient.clientId());
    }

    cacheClient.subscribe("__redis__:invalidate", (message) => {
        if (message) {
            lastInvalidationMessage = Date.now();

            const keys = Buffer.isBuffer(message) ? [message.toString()] : message;
            for (let key of keys) {
                if (config.redis.useCompression) key = key.replace(/\.c$/, "");

                if (cache.delete(key)) {
                    lastInvalidation = Date.now();
                }

                ttlCache.delete(key);

                // To tell it to not save the result of this currently running request
                if (key && activeRequestPromises[key] !== undefined) {
                    resetKeys.add(key);
                }
            }
        }
    }).catch(Logger.error);
}

async function setupCacheClientTracking(client: RedisClientType,
    cacheClient: RedisClientType) {

    if (!client || !cacheClient.isReady || config.redis.dragonflyMode) return;

    await client.sendCommand(["CLIENT", "TRACKING", "ON", "REDIRECT", cacheConnectionClientId, "BCAST"]);
}

export default exportClient;

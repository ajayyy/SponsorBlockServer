import { config } from "../config";
import { Logger } from "./logger";
import { createClient } from "redis";
import { RedisCommandArgument, RedisCommandArguments, RedisCommandRawReply } from "@redis/client/dist/lib/commands";
import { RedisClientOptions } from "@redis/client/dist/lib/client";
import { RedisReply } from "rate-limit-redis";
import { db } from "../databases/databases";
import { Postgres } from "../databases/Postgres";

export interface RedisStats {
    activeRequests: number;
    writeRequests: number;
    avgReadTime: number;
    avgWriteTime: number;
}

interface RedisSB {
    get(key: RedisCommandArgument): Promise<string>;
    set(key: RedisCommandArgument, value: RedisCommandArgument): Promise<string>;
    setEx(key: RedisCommandArgument, seconds: number, value: RedisCommandArgument): Promise<string>;
    del(...keys: [RedisCommandArgument]): Promise<number>;
    increment?(key: RedisCommandArgument): Promise<RedisCommandRawReply[]>;
    sendCommand(args: RedisCommandArguments, options?: RedisClientOptions): Promise<RedisReply>;
    ttl(key: RedisCommandArgument): Promise<number>;
    quit(): Promise<void>;
}

let exportClient: RedisSB = {
    get: () => new Promise((resolve) => resolve(null)),
    set: () => new Promise((resolve) => resolve(null)),
    setEx: () => new Promise((resolve) => resolve(null)),
    del: () => new Promise((resolve) => resolve(null)),
    increment: () => new Promise((resolve) => resolve(null)),
    sendCommand: () => new Promise((resolve) => resolve(null)),
    quit: () => new Promise((resolve) => resolve(null)),
    ttl: () => new Promise((resolve) => resolve(null)),
};

let lastClientFail = 0;
let lastReadFail = 0;
let activeRequests = 0;
let writeRequests = 0;

const readResponseTime: number[] = [];
const writeResponseTime: number[] = [];
let lastResponseTimeLimit = 0;
const maxStoredTimes = 200;

export let connectionPromise = Promise.resolve();

if (config.redis?.enabled) {
    Logger.info("Connected to redis");
    const client = createClient(config.redis);
    const readClient = config.redisRead?.enabled ? createClient(config.redisRead) : null;
    connectionPromise = client.connect();
    void readClient?.connect(); // void as we don't care about the promise
    exportClient = client as RedisSB;


    const get = client.get.bind(client);
    const getRead = readClient?.get?.bind(readClient);
    exportClient.get = (key) => new Promise((resolve, reject) => {
        if (config.redis.maxConnections && activeRequests > config.redis.maxConnections) {
            reject("Too many active requests");
            return;
        }

        const start = Date.now();
        activeRequests++;

        const timeout = config.redis.getTimeout ? setTimeout(() => reject(), config.redis.getTimeout) : null;
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
            if (chosenGet === get) {
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
    exportClient.set = (key, value) => setFun(set, [key, value]);
    exportClient.setEx = (key, seconds, value) => setFun(setEx, [key, seconds, value]);
    exportClient.increment = (key) => new Promise((resolve, reject) =>
        void client.multi()
            .incr(key)
            .expire(key, 60)
            .exec()
            .then((reply) => resolve(reply))
            .catch((err) => reject(err))
    );
    client.on("error", function(error) {
        lastClientFail = Date.now();
        Logger.error(`Redis Error: ${error}`);
    });
    client.on("reconnect", () => {
        Logger.info("Redis: trying to reconnect");
    });
    readClient?.on("error", function(error) {
        lastReadFail = Date.now();
        Logger.error(`Redis Read-Only Error: ${error}`);
    });
    readClient?.on("reconnect", () => {
        Logger.info("Redis Read-Only: trying to reconnect");
    });
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
    };
}

export default exportClient;

import { config } from "../config";
import { Logger } from "./logger";
import { createClient } from "redis";
import { RedisCommandArgument, RedisCommandArguments, RedisCommandRawReply } from "@redis/client/dist/lib/commands";
import { RedisClientOptions } from "@redis/client/dist/lib/client";
import { RedisReply } from "rate-limit-redis";

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
};

let lastClientFail = 0;
let lastReadFail = 0;
let activeRequests = 0;
let writeRequests = 0;

const readResponseTime: number[] = [];
const writeResponseTime: number[] = [];
const maxStoredTimes = 200;

if (config.redis?.enabled) {
    Logger.info("Connected to redis");
    const client = createClient(config.redis);
    const readClient = config.redisRead?.enabled ? createClient(config.redisRead) : null;
    void client.connect(); // void as we don't care about the promise
    void readClient?.connect();
    exportClient = client as RedisSB;


    const get = client.get.bind(client);
    const set = client.set.bind(client);
    const getRead = readClient?.get?.bind(readClient);
    exportClient.get = (key) => new Promise((resolve, reject) => {
        if (activeRequests > config.redis.maxConnections) {
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

            readResponseTime.push(Date.now() - start);
            if (readResponseTime.length > maxStoredTimes) readResponseTime.shift();
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
    exportClient.set = (key, value) => new Promise((resolve, reject) => {
        if (activeRequests > config.redis.maxWriteConnections) {
            reject("Too many active requests");
            return;
        }

        const start = Date.now();
        activeRequests++;
        writeRequests++;

        set(key, value).then((reply) => {
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

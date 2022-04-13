import { config } from "../config";
import { Logger } from "./logger";
import { createClient } from "redis";
import { RedisCommandArgument, RedisCommandArguments, RedisCommandRawReply } from "@node-redis/client/dist/lib/commands";
import { ClientCommandOptions } from "@node-redis/client/dist/lib/client";
import { RedisReply } from "rate-limit-redis";

interface RedisSB {
    get(key: RedisCommandArgument): Promise<string>;
    set(key: RedisCommandArgument, value: RedisCommandArgument): Promise<string>;
    setEx(key: RedisCommandArgument, seconds: number, value: RedisCommandArgument): Promise<string>;
    del(...keys: [RedisCommandArgument]): Promise<number>;
    increment?(key: RedisCommandArgument): Promise<RedisCommandRawReply[]>;
    sendCommand(args: RedisCommandArguments, options?: ClientCommandOptions): Promise<RedisReply>;
    quit(): Promise<void>;
}

let exportClient: RedisSB = {
    get: () => new Promise((resolve, reject) => reject()),
    set: () => new Promise((resolve, reject) => reject()),
    setEx: () => new Promise((resolve, reject) => reject()),
    del: () => new Promise((resolve, reject) => reject()),
    increment: () => new Promise((resolve, reject) => reject()),
    sendCommand: () => new Promise((resolve, reject) => reject()),
    quit: () => new Promise((resolve, reject) => reject()),
};

if (config.redis) {
    Logger.info("Connected to redis");
    const client = createClient(config.redis);
    client.connect();
    exportClient = client;

    const timeoutDuration = 200;
    const get = client.get.bind(client);
    exportClient.get = (key) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(), timeoutDuration);
        get(key).then((reply) => {
            clearTimeout(timeout);
            resolve(reply);
        }).catch((err) => reject(err));
    });
    exportClient.increment = (key) => new Promise((resolve, reject) =>
        client.multi()
            .incr(key)
            .expire(key, 60)
            .exec()
            .then((reply) => resolve(reply))
            .catch((err) => reject(err))
    );
    client.on("error", function(error) {
        Logger.error(error);
    });
}

export default exportClient;

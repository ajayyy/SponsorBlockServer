import { getIP } from "../utils/getIP";
import { getHash } from "../utils/getHash";
import { getHashCache } from "../utils/getHashCache";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { RateLimitConfig } from "../types/config.model";
import { Request } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { UserID } from "../types/user.model";
import RedisStore, { RedisReply } from "rate-limit-redis";
import redis from "../utils/redis";
import { config } from "../config";
import { Logger } from "../utils/logger";

export function rateLimitMiddleware(limitConfig: RateLimitConfig, getUserID?: (req: Request) => UserID): RateLimitRequestHandler {
    return rateLimit({
        windowMs: limitConfig.windowMs,
        max: limitConfig.max,
        message: limitConfig.message,
        statusCode: limitConfig.statusCode,
        legacyHeaders: false,
        standardHeaders: false,
        keyGenerator: (req) => {
            return getHash(getIP(req), 1);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        handler: async (req, res, next) => {
            if (getUserID === undefined || !await isUserVIP(await getHashCache(getUserID(req)))) {
                return res.status(limitConfig.statusCode).send(limitConfig.message);
            } else {
                return next();
            }
        },
        store: config.redis?.enabled ? new RedisStore({
            sendCommand: (...args: string[]) => redis.sendCommand(args).catch((err) => Logger.error(err)) as Promise<RedisReply>,
        }) : null,
    });
}

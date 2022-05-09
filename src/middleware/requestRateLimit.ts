import { getIP } from "../utils/getIP";
import { getHash } from "../utils/getHash";
import { getHashCache } from "../utils/getHashCache";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { RateLimitConfig } from "../types/config.model";
import { Request } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { UserID } from "../types/user.model";
import RedisStore from "rate-limit-redis";
import redis from "../utils/redis";
import { config } from "../config";

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
        handler: async (req, res, next) => {
            if (getUserID === undefined || !await isUserVIP(await getHashCache(getUserID(req)))) {
                return res.status(limitConfig.statusCode).send(limitConfig.message);
            } else {
                return next();
            }
        },
        store: config.redis?.enabled ? new RedisStore({
            sendCommand: (...args: string[]) => redis.sendCommand(args),
        }) : null,
    });
}

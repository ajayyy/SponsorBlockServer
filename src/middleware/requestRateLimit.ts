import { Request, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import RedisStore, { RedisReply } from "rate-limit-redis";

import { getHashCache } from "#utils/getHashCache";
import { getIP } from "#utils/getIP";
import { getHash } from "#utils/getHash";
import { isUserVIP } from "#utils/isUserVIP";
import redis from "#utils/redis";
import { config } from "#config";
import { Logger } from "#utils/logger";

import { RateLimitConfig } from "#types/config";
import { UserID } from "#types/user";

let rateLimitMiddlewareMock: typeof rateLimitMiddleware | undefined;

export function setMockRateLimitMiddleware(newMock: typeof rateLimitMiddleware | undefined) {
    rateLimitMiddlewareMock = newMock;
}

export function rateLimitMiddleware(limitConfig: RateLimitConfig, getUserID?: (req: Request) => UserID): RequestHandler {
    if (rateLimitMiddlewareMock !== undefined) {
        return rateLimitMiddlewareMock(limitConfig, getUserID);
    }
    try {
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
    } catch (e) {
        Logger.error(`Rate limit error: ${e}`);
        return (req, res, next) => next();
    }
}

import { getIP } from "../utils/getIP.js";
import { getHash } from "../utils/getHash.js";
import rateLimit from "express-rate-limit";
import { RateLimitConfig } from "../types/config.model.js";
import { Request } from "express";
import { isUserVIP } from "../utils/isUserVIP.js";
import { UserID } from "../types/user.model.js";

export function rateLimitMiddleware(limitConfig: RateLimitConfig, getUserID?: (req: Request) => UserID): rateLimit.RateLimit {
    return rateLimit({
        windowMs: limitConfig.windowMs,
        max: limitConfig.max,
        message: limitConfig.message,
        statusCode: limitConfig.statusCode,
        headers: false,
        keyGenerator: (req) => {
            return getHash(getIP(req), 1);
        },
        handler: async (req, res, next) => {
            if (getUserID === undefined || !await isUserVIP(getHash(getUserID(req)))) {
                return res.status(limitConfig.statusCode).send(limitConfig.message);
            } else {
                return next();
            }
        }
    });
}

import {getIP} from '../utils/getIP';
import {getHash} from '../utils/getHash';
import rateLimit from 'express-rate-limit';
import {RateLimitConfig} from '../types/config.model';

export function rateLimitMiddleware(limitConfig: RateLimitConfig): rateLimit.RateLimit {
    return rateLimit({
        windowMs: limitConfig.windowMs,
        max: limitConfig.max,
        message: limitConfig.message,
        statusCode: limitConfig.statusCode,
        headers: false,
        keyGenerator: (req) => {
            return getHash(getIP(req), 1);
        },
    });
}

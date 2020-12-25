import {config} from '../config';
import {Request} from 'express';

export function getIP(req: Request): string {
    if (config.behindProxy === true || config.behindProxy === "true") {
        config.behindProxy = "X-Forwarded-For";
    }

    switch (config.behindProxy as string) {
        case "X-Forwarded-For":
            return req.headers['x-forwarded-for'] as string;
        case "Cloudflare":
            return req.headers['cf-connecting-ip'] as string;
        case "X-Real-IP":
            return req.headers['x-real-ip'] as string;
        default:
            return req.connection.remoteAddress;
    }
}

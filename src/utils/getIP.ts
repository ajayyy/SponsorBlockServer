import { config } from "../config";
import { Request } from "express";
import { IPAddress } from "../types/segments.model";

export function getIP(req: Request): IPAddress {
    if (config.behindProxy === true || config.behindProxy === "true") {
        config.behindProxy = "X-Forwarded-For";
    }

    switch (config.behindProxy as string) {
        case "X-Forwarded-For":
            return req.headers["x-forwarded-for"] as IPAddress;
        case "Cloudflare":
            return req.headers["cf-connecting-ip"] as IPAddress;
        case "X-Real-IP":
            return req.headers["x-real-ip"] as IPAddress;
        default:
            return req.connection.remoteAddress as IPAddress;
    }
}
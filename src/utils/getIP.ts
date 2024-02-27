import { config } from "../config";
import { Request } from "express";
import { IPAddress } from "../types/segments.model";

export function getIP(req: Request, checkCloudflare = false): IPAddress {
    // if in testing mode, return immediately
    if (config.mode === "test") return "127.0.0.1" as IPAddress;

    if (config.behindProxy === true || config.behindProxy === "true") {
        config.behindProxy = "X-Forwarded-For";
    }

    const cloudflareIP = req.headers["cf-connecting-ip"] as IPAddress;
    if (checkCloudflare && cloudflareIP) return cloudflareIP;

    switch (config.behindProxy as string) {
        case "X-Forwarded-For":
            return req.headers["x-forwarded-for"] as IPAddress;
        case "Cloudflare":
            return cloudflareIP;
        case "X-Real-IP":
            return req.headers["x-real-ip"] as IPAddress;
        default:
            return req.socket?.remoteAddress as IPAddress;
    }
}
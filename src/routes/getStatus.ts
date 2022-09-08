import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";
import os from "os";
import redis from "../utils/redis";
import { setTimeout } from "timers/promises";

export async function getStatus(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();
    let value = req.params.value as string[] | string;
    value = Array.isArray(value) ? value[0] : value;
    let processTime, redisProcessTime = -1;
    const timeoutPromise = async (): Promise<string> => {
        await setTimeout(5000);
        return "timeout";
    };
    try {
        const dbVersion = await Promise.race([db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"]), timeoutPromise()])
            .then(e => {
                if (e === "timeout") return e;
                processTime = Date.now() - startTime;
                return e.value;
            });
        let statusRequests: unknown = 0;
        const numberRequests = await Promise.race([redis.increment("statusRequest"), timeoutPromise()])
            .then(e => {
                if (e === "timeout") return [-1];
                redisProcessTime = Date.now() - startTime;
                return e;
            });
        statusRequests = numberRequests?.[0];

        const statusValues: Record<string, any> = {
            uptime: process.uptime(),
            commit: (global as any).HEADCOMMIT || "unknown",
            db: Number(dbVersion),
            startTime,
            processTime,
            redisProcessTime,
            loadavg: os.loadavg().slice(1), // only return 5 & 15 minute load average
            statusRequests,
            hostname: os.hostname()
        };
        return value ? res.send(JSON.stringify(statusValues[value])) : res.send(statusValues);
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

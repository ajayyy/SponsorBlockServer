import { db, privateDB } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";
import os from "os";
import redis, { getRedisStats } from "../utils/redis";
import { promiseOrTimeout } from "../utils/promise";
import { Postgres } from "../databases/Postgres";
import { Server } from "http";

export async function getStatus(req: Request, res: Response, server: Server): Promise<Response> {
    const startTime = Date.now();
    let value = req.params.value as string[] | string;
    value = Array.isArray(value) ? value[0] : value;
    let processTime, redisProcessTime = -1;
    try {
        const dbStartTime = Date.now();
        const dbVersion = await promiseOrTimeout(db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"]), 1000)
            .then(e => {
                processTime = Date.now() - dbStartTime;
                return e.value;
            })
            .catch(e => /* istanbul ignore next */ {
                Logger.error(`status: SQL query timed out: ${e}`);
                return -1;
            });
        let statusRequests: unknown = 0;
        const redisStartTime = Date.now();
        const numberRequests = await promiseOrTimeout(redis.increment("statusRequest"), 1000)
            .then(e => {
                redisProcessTime = Date.now() - redisStartTime;
                return e;
            }).catch(e => /* istanbul ignore next */ {
                Logger.error(`status: redis increment timed out ${e}`);
                return [-1];
            });
        statusRequests = numberRequests?.[0];

        const statusValues: Record<string, any> = {
            uptime: process.uptime(),
            commit: (global as any)?.HEADCOMMIT ?? "unknown",
            db: Number(dbVersion),
            startTime,
            processTime,
            redisProcessTime,
            loadavg: os.loadavg().slice(1), // only return 5 & 15 minute load average
            connections: await new Promise((resolve) => server.getConnections((_, count) => resolve(count))),
            statusRequests,
            hostname: os.hostname(),
            postgresStats: (db as Postgres)?.getStats?.(),
            postgresPrivateStats: (privateDB as Postgres)?.getStats?.(),
            redisStats: getRedisStats(),
        };
        return value ? res.send(JSON.stringify(statusValues[value])) : res.send(statusValues);
    } catch (err) /* istanbul ignore next */ {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

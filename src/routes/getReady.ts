import { Request, Response } from "express";
import { Server } from "http";
import { config } from "../config";
import { getRedisStats } from "../utils/redis";
import { Postgres } from "../databases/Postgres";
import { db } from "../databases/databases";

export async function getReady(req: Request, res: Response, server: Server): Promise<Response> {
    const connections = await new Promise((resolve) => server.getConnections((_, count) => resolve(count))) as number;

    const redisStats = getRedisStats();
    const postgresStats = (db as Postgres).getStats?.();

    if (!connections
            || (connections < config.maxConnections
                && (!config.redis || redisStats.activeRequests < config.redis.maxConnections * 0.8)
                && (!config.redis || redisStats.avgReadTime < config.maxResponseTime || redisStats.activeRequests < 1)
                && (!config.postgres || postgresStats.activeRequests < config.postgres.maxActiveRequests * 0.8))
                && (!config.postgres || postgresStats.avgReadTime < config.maxResponseTime)) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(500);
    }
}

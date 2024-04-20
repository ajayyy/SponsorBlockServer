import { Request, Response } from "express";
import { Server } from "http";
import { config } from "../config";
import { getRedisActiveRequests, getRedisStats } from "../utils/redis";
import { Postgres } from "../databases/Postgres";
import { db } from "../databases/databases";

export async function getReady(req: Request, res: Response, server: Server): Promise<Response> {
    const connections = await new Promise((resolve) => server.getConnections((_, count) => resolve(count))) as number;

    if (!connections
            || (connections < config.maxConnections
                && (!config.redis || getRedisActiveRequests() < config.redis.maxConnections * 0.8)
                && (!config.redis || getRedisStats().avgReadTime < 2000)
                && (!config.postgres || (db as Postgres).getStats().activeRequests < config.postgres.maxActiveRequests * 0.8))
                && (!config.postgres || (db as Postgres).getStats().avgReadTime < 2000)) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(500);
    }
}

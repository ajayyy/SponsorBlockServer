import { db, privateDB } from "../databases/databases";
import { Request, Response } from "express";
import os from "os";
import redis, { getRedisStats } from "../utils/redis";
import { Postgres } from "../databases/Postgres";
import { Server } from "http";

export async function getMetrics(req: Request, res: Response, server: Server): Promise<Response> {
    const redisStats = getRedisStats();

    return res.type("text").send([
        `# HELP sb_uptime Uptime of this instance`,
        `# TYPE sb_uptime counter`,
        `sb_uptime ${process.uptime()}`,
        `# HELP sb_db_version The version of the database`,
        `# TYPE sb_db_version counter`,
        `sb_db_version ${await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"]).then(e => e.value).catch(() => -1)}`,
        `# HELP sb_start_time The time this instance was started`,
        `# TYPE sb_start_time gauge`,
        `sb_start_time ${Date.now()}`,
        `# HELP sb_loadavg_5 The 5 minute load average of the system`,
        `# TYPE sb_loadavg_5 gauge`,
        `sb_loadavg_5 ${os.loadavg()[0]}`,
        `# HELP sb_loadavg_15 The 15 minute load average of the system`,
        `# TYPE sb_loadavg_15 gauge`,
        `sb_loadavg_15 ${os.loadavg()[1]}`,
        `# HELP sb_connections The number of connections to this instance`,
        `# TYPE sb_connections gauge`,
        `sb_connections ${await new Promise((resolve) => server.getConnections((_, count) => resolve(count)) as any)}`,
        `# HELP sb_status_requests The number of status requests made to this instance`,
        `# TYPE sb_status_requests gauge`,
        `sb_status_requests ${await redis.increment("statusRequest").then(e => e[0]).catch(() => -1)}`,
        `# HELP sb_postgres_active_requests The number of active requests to the postgres database`,
        `# TYPE sb_postgres_active_requests gauge`,
        `sb_postgres_active_requests ${(db as Postgres)?.getStats?.()?.activeRequests ?? -1}`,
        `# HELP sb_postgres_avg_read_time The average read time of the postgres database`,
        `# TYPE sb_postgres_avg_read_time gauge`,
        `sb_postgres_avg_read_time ${(db as Postgres)?.getStats?.()?.avgReadTime ?? -1}`,
        `# HELP sb_postgres_avg_write_time The average write time of the postgres database`,
        `# TYPE sb_postgres_avg_write_time gauge`,
        `sb_postgres_avg_write_time ${(db as Postgres)?.getStats?.()?.avgWriteTime ?? -1}`,
        `# HELP sb_postgres_avg_failed_time The average failed time of the postgres database`,
        `# TYPE sb_postgres_avg_failed_time gauge`,
        `sb_postgres_avg_failed_time ${(db as Postgres)?.getStats?.()?.avgFailedTime ?? -1}`,
        `# HELP sb_postgres_pool_total The total number of connections in the postgres pool`,
        `# TYPE sb_postgres_pool_total gauge`,
        `sb_postgres_pool_total ${(db as Postgres)?.getStats?.()?.pool?.total ?? -1}`,
        `# HELP sb_postgres_pool_idle The number of idle connections in the postgres pool`,
        `# TYPE sb_postgres_pool_idle gauge`,
        `sb_postgres_pool_idle ${(db as Postgres)?.getStats?.()?.pool?.idle ?? -1}`,
        `# HELP sb_postgres_pool_waiting The number of connections waiting in the postgres pool`,
        `# TYPE sb_postgres_pool_waiting gauge`,
        `sb_postgres_pool_waiting ${(db as Postgres)?.getStats?.()?.pool?.waiting ?? -1}`,
        `# HELP sb_postgres_private_active_requests The number of active requests to the private postgres database`,
        `# TYPE sb_postgres_private_active_requests gauge`,
        `sb_postgres_private_active_requests ${(privateDB as Postgres)?.getStats?.()?.activeRequests ?? -1}`,
        `# HELP sb_postgres_private_avg_read_time The average read time of the private postgres database`,
        `# TYPE sb_postgres_private_avg_read_time gauge`,
        `sb_postgres_private_avg_read_time ${(privateDB as Postgres)?.getStats?.()?.avgReadTime ?? -1}`,
        `# HELP sb_postgres_private_avg_write_time The average write time of the private postgres database`,
        `# TYPE sb_postgres_private_avg_write_time gauge`,
        `sb_postgres_private_avg_write_time ${(privateDB as Postgres)?.getStats?.()?.avgWriteTime ?? -1}`,
        `# HELP sb_postgres_private_avg_failed_time The average failed time of the private postgres database`,
        `# TYPE sb_postgres_private_avg_failed_time gauge`,
        `sb_postgres_private_avg_failed_time ${(privateDB as Postgres)?.getStats?.()?.avgFailedTime ?? -1}`,
        `# HELP sb_postgres_private_pool_total The total number of connections in the private postgres pool`,
        `# TYPE sb_postgres_private_pool_total gauge`,
        `sb_postgres_private_pool_total ${(privateDB as Postgres)?.getStats?.()?.pool?.total ?? -1}`,
        `# HELP sb_postgres_private_pool_idle The number of idle connections in the private postgres pool`,
        `# TYPE sb_postgres_private_pool_idle gauge`,
        `sb_postgres_private_pool_idle ${(privateDB as Postgres)?.getStats?.()?.pool?.idle ?? -1}`,
        `# HELP sb_postgres_private_pool_waiting The number of connections waiting in the private postgres pool`,
        `# TYPE sb_postgres_private_pool_waiting gauge`,
        `sb_postgres_private_pool_waiting ${(privateDB as Postgres)?.getStats?.()?.pool?.waiting ?? -1}`,
        `# HELP sb_redis_active_requests The number of active requests to redis`,
        `# TYPE sb_redis_active_requests gauge`,
        `sb_redis_active_requests ${redisStats.activeRequests}`,
        `# HELP sb_redis_write_requests The number of write requests to redis`,
        `# TYPE sb_redis_write_requests gauge`,
        `sb_redis_write_requests ${redisStats.writeRequests}`,
        `# HELP sb_redis_avg_read_time The average read time of redis`,
        `# TYPE sb_redis_avg_read_time gauge`,
        `sb_redis_avg_read_time ${redisStats?.avgReadTime}`,
        `# HELP sb_redis_avg_write_time The average write time of redis`,
        `# TYPE sb_redis_avg_write_time gauge`,
        `sb_redis_avg_write_time ${redisStats.avgWriteTime}`,
        `# HELP sb_redis_memory_cache_hits The cache hit ratio in redis`,
        `# TYPE sb_redis_memory_cache_hits gauge`,
        `sb_redis_memory_cache_hits ${redisStats.memoryCacheHits}`,
        `# HELP sb_redis_memory_cache_total_hits The cache hit ratio in redis including uncached items`,
        `# TYPE sb_redis_memory_cache_total_hits gauge`,
        `sb_redis_memory_cache_total_hits ${redisStats.memoryCacheTotalHits}`,
        `# HELP sb_redis_memory_cache_length The length of the memory cache in redis`,
        `# TYPE sb_redis_memory_cache_length gauge`,
        `sb_redis_memory_cache_length ${redisStats.memoryCacheLength}`,
        `# HELP sb_redis_memory_cache_size The size of the memory cache in redis`,
        `# TYPE sb_redis_memory_cache_size gauge`,
        `sb_redis_memory_cache_size ${redisStats.memoryCacheSize}`,
        `# HELP sb_redis_last_invalidation The time of the last successful invalidation in redis`,
        `# TYPE sb_redis_last_invalidation gauge`,
        `sb_redis_last_invalidation ${redisStats.lastInvalidation}`,
        `# HELP sb_redis_last_invalidation_message The time of the last invalidation message in redis`,
        `# TYPE sb_redis_last_invalidation_message gauge`,
        `sb_redis_last_invalidation_message ${redisStats.lastInvalidationMessage}`,
    ].join("\n"));
}
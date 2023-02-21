// drop postgres tables
// reset redis cache
import { config } from "../../src/config";
import { createClient } from "redis";
import { Pool } from "pg";
import { Logger } from "../../src/utils/logger";

export async function resetRedis() {
    if (config?.redis?.enabled) {
        const client = createClient(config.redis);
        await client.connect();
        await client.flushAll();
    }
}
export async function resetPostgres() {
    if (process.env.TEST_POSTGRES && config.postgres) {
        const pool = new Pool({ ...config.postgres });
        await pool.query(`DROP DATABASE IF EXISTS "sponsorTimes"`);
        await pool.query(`DROP DATABASE IF EXISTS "privateDB"`);
        await pool.end().catch(err => Logger.error(`closing db (postgres): ${err}`));
    }
}
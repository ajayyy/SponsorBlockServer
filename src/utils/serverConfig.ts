import { db } from "../databases/databases.js";

export async function getServerConfig(key: string): Promise<string | null> {
    const row = await db.prepare("get", `SELECT "value" as v FROM "config" WHERE "key" = ?`, [key]);

    return row?.v ?? null;
}

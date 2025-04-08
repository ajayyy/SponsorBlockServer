import { db } from "../databases/databases";

export async function getServerConfig(key: string): Promise<string | null> {
    const row = await db.prepare("run", `SELECT "value" FROM "config" WHERE "key" = ?`, [key]);

    return row?.value ?? null;
}
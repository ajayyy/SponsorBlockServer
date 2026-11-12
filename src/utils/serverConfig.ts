import { db } from "../databases/databases";

interface ConfigCacheEntry {
    timestamp: number,
    promise: Promise<string | null>,
}

const CONFIG_CACHE_TTL_MS = 15_000;
const configCache = new Map<string, ConfigCacheEntry>();

export function getServerConfig(key: string): Promise<string | null> {
    // performance.now() instead of Date.now() so that we get a monotonic clock
    const now = performance.now();

    // get existing entry, check its validity
    const existingEntry = configCache.get(key);
    if (existingEntry && (now - existingEntry.timestamp) < CONFIG_CACHE_TTL_MS) return existingEntry.promise;

    // no entry or expired - create a new one
    const newEntry = {
        timestamp: now,
        promise: actuallyGetServerConfig(key),
    } satisfies ConfigCacheEntry;
    configCache.set(key, newEntry);
    return newEntry.promise;
}

async function actuallyGetServerConfig(key: string): Promise<string | null> {
    const row = await db.prepare("get", `SELECT "value" as v FROM "config" WHERE "key" = ?`, [key]);

    return row?.v ?? null;
}

import { db } from "../databases/databases";
import { acquireWaitingLock } from "./redisLock";
import * as murmurhash3js from "murmurhash3js";

export enum BloomFilterID {
    profileLeft = 11,
    contentLeft = 1,
    profileRightPositive = 12,
    contentRightPositive = 2,
    profileRightNegative = 13,
    contentRightNegative = 3
}

export const AllBloomFilters = Object.values(BloomFilterID);

export enum BloomAction {
    Add,
    Remove
}

export const numberOfHashes = 4;
const bloomSize = 64;

async function generateBloomFilter(bloomID: BloomFilterID) {
    const now = Date.now();
    const tempID = bloomID + 100000;

    // Delete temp bloom
    await db.prepare("run", `DELETE FROM "slopBloom" WHERE "id" = ?`, [tempID]);
    await db.prepare("run", `DELETE FROM "slopBloomGeneration" WHERE "id" = ?`, [tempID]);
    await db.prepare("run", `DELETE FROM "slopBloomDiff" WHERE "id" = ?`, [tempID]);

    const query = getQueryForBloom(bloomID);
    const contentIDs = (await db.prepare("all", query)).map((a) => a.contentID);

    const bloom = new Uint8Array(bloomSize / 8);
    const promises = [];
    for (const contentID of contentIDs) {
        const hashes = hashContent(contentID as string).sort((a, b) => a - b);
        modifyBloom(bloom, hashes, ModifyBloomOperation.Add);
        for (const hash of hashes) {
            promises.push(db.prepare("run", `INSERT INTO "slopBloomGeneration" ("id", "contentID", "hash", "timeGenerated") VALUES (?, ?, ?, ?)`, [tempID, contentID, hash, now]));
        }
    }
    await db.prepare("run", `INSERT INTO "slopBloom" ("id", "data", "timeGenerated") VALUES (?, ?, ?)`, [tempID, bloom, now]);
    await promises;

    // Clear old generation and move new one in
    await db.prepare("run", `DELETE FROM "slopBloom" WHERE "id" = ?`, [bloomID]);
    await db.prepare("run", `DELETE FROM "slopBloomGeneration" WHERE "id" = ?`, [bloomID]);
    await db.prepare("run", `DELETE FROM "slopBloomDiff" WHERE "id" = ?`, [bloomID]);
    await db.prepare("run", `UPDATE "slopBloom" SET "id" = ? WHERE "id" = ?`, [bloomID, tempID]);
    await db.prepare("run", `UPDATE "slopBloomGeneration" SET "id" = ? WHERE "id" = ?`, [bloomID, tempID]);
}


function getQueryForBloom(bloomID: BloomFilterID) {
    switch (bloomID) {
        case BloomFilterID.profileLeft:
            return `SELECT DISTINCT "profileID" as "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 100 AND "id" < 1000`;
        case BloomFilterID.contentLeft:
            return `SELECT DISTINCT "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 100 AND "id" < 1000`;
        case BloomFilterID.profileRightPositive:
            return `SELECT DISTINCT "profileID" as "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 1000 AND "id" < 2000`;
        case BloomFilterID.contentRightPositive:
            return `SELECT DISTINCT "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 1000 AND "id" < 2000`;
        case BloomFilterID.profileRightNegative:
            return `SELECT DISTINCT "profileID" as "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 2000 AND "id" < 3000`;
        case BloomFilterID.contentRightNegative:
            return `SELECT DISTINCT "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 2000 AND "id" < 3000`;
    }
}

export async function addToBloomFilter(bloomID: BloomFilterID, contentID: string) {
    const lock = await acquireWaitingLock(`generateBloomFilter:${bloomID}`);
    const now = Date.now();
    const hashes = hashContent(contentID).sort((a, b) => a - b);

    const filter = (await db.prepare("get", `SELECT "data" FROM "slopBloom" WHERE id = ?`, [bloomID]))?.data as Buffer | undefined;
    if (filter) {
        const newFilter = new Uint8Array(filter);
        const changes = modifyBloom(newFilter, hashes, ModifyBloomOperation.Add);

        await db.prepare("run", `UPDATE "slopBloom" SET "data" = ? WHERE "id" = ? `, [newFilter, bloomID]);

        for (const hash of changes) {
            await db.prepare("run", `INSERT INTO "slopBloomDiff" ("id", "index", "data", "timeGenerated") VALUES (?, ?, ?, ?)
                ON CONFLICT ("id", "index")
                DO UPDATE SET
                        "data" = ?,
                        "timeGenerated" = ?`, [bloomID, hash, true, now, true, now]);
        }

        for (const hash of hashes) {
            await db.prepare("run", `INSERT INTO "slopBloomGeneration" ("id", "contentID", "hash", "timeGenerated") VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING;`, [bloomID, contentID, hash, now]);
        }
    } else {
        await generateBloomFilter(bloomID);
    }

    lock.unlock();
}

export async function modifyBloomFilters(action: BloomAction, voteTypes: number[], contentID: string, profileID: string) {
    const votesPerFilter = {} as Record<BloomFilterID, number[]>;

    for (const voteType of voteTypes) {
        if (voteType >= 0 && voteType <= 6) {
            if (profileID) {
                votesPerFilter[BloomFilterID.profileLeft] ??= [];
                votesPerFilter[BloomFilterID.profileLeft].push(voteType);
            }

            votesPerFilter[BloomFilterID.contentLeft] ??= [];
            votesPerFilter[BloomFilterID.contentLeft].push(voteType);
        } else if (voteType >= 10 && voteType <= 13) {
            votesPerFilter[BloomFilterID.contentRightPositive] ??= [];
            votesPerFilter[BloomFilterID.contentRightPositive].push(voteType);
        } else if (voteType >= 20 && voteType <= 22) {
            votesPerFilter[BloomFilterID.contentRightNegative] ??= [];
            votesPerFilter[BloomFilterID.contentRightNegative].push(voteType);
        }
    }

    const promises = [];
    for (const bloomIDStr in votesPerFilter) {
        const bloomID = parseInt(bloomIDStr as unknown as string) as BloomFilterID;
        const id = bloomID === BloomFilterID.profileLeft ? profileID : contentID;

        if (action === BloomAction.Add) {
            promises.push(addToBloomFilter(bloomID, id));
        } else {
            promises.push(removeFromBloomFilter(bloomID, id));
        }
    }

    await Promise.all(promises);
}

async function removeFromBloomFilter(bloomID: BloomFilterID, contentID: string) {
    const lock = await acquireWaitingLock(`generateBloomFilter:${bloomID}`);
    const now = Date.now();

    //todo: ensure this all happens without any failures or timeouts
    //      specifically the updates, put them in a transaction
    //      retry on failure, because otherwise the bloom becomes out of date
    // todo: what happens if acquire wake lock fails, is there someway to recover from one element not being properly added to the bloom filter

    // Find hashes for this contentID that aren't used by anyone else
    const toRemove = await db.prepare("all", `SELECT "hash" FROM "slopBloomGeneration" WHERE "id" = ? AND "contentID" = ?
        AND "hash" NOT IN (SELECT "hash" FROM "slopBloomGeneration" WHERE "id" = ? AND "contentID" != ?)`, [bloomID, contentID, bloomID, contentID]);

    if (toRemove.length > 0) {
        const hashes = toRemove.map((v) => v.hash).sort((a, b) => a - b);

        const filter =  (await db.prepare("get", `SELECT "data" FROM "slopBloom" WHERE id = ?`, [bloomID]))?.data as Buffer | undefined;
        if (filter) {
            const newFilter = new Uint8Array(filter);
            const changes = modifyBloom(newFilter, hashes, ModifyBloomOperation.Remove);

            await db.prepare("run", `UPDATE "slopBloom" SET "data" = ? WHERE "id" = ? `, [newFilter, bloomID]);

            await db.prepare("run", `DELETE FROM "slopBloomGeneration" WHERE "id" = ? AND "contentID" = ?`, [bloomID, contentID]);

            for (const hash of changes) {
                await db.prepare("run", `INSERT INTO "slopBloomDiff" ("id", "index", "data", "timeGenerated") VALUES (?, ?, ?, ?)
                    ON CONFLICT ("id", "index")
                    DO UPDATE SET
                            "data" = ?,
                            "timeGenerated" = ?`, [bloomID, hash, false, now, false, now]);
            }
        } else {
            await generateBloomFilter(bloomID);
        }
    }

    lock.unlock();
}

enum ModifyBloomOperation {
    Add,
    Remove
}

function modifyBloom(filter: Uint8Array, hashes: number[], operation: ModifyBloomOperation) {
    const changes = [];
    for (let i = 0; i < hashes.length; i++) {
        const currentHash = hashes[i];
        const currentIndex = Math.floor(currentHash / 8);
        const alsoIncluded = [];
        for (let j = i + 1; j < hashes.length; j++) {
            const nextHash = hashes[j];

            // Are they in the same hex char
            if (currentIndex === Math.floor(nextHash / 8)) {
                alsoIncluded.push(nextHash);
            } else {
                break;
            }
        }

        // Bitwise or on each index for this char
        let currentByte = filter[currentIndex];
        for (const hash of [currentHash, ...alsoIncluded]) {
            // Find the relative char for this character
            // Going from the other side for each individual value
            const char = 7 - (hash - currentIndex * 8);

            if (operation === ModifyBloomOperation.Add) {
                if (!(currentByte & (1 << char))) {
                    changes.push(currentHash);
                    currentByte |= 1 << char;
                }
            } else if (operation === ModifyBloomOperation.Remove) {
                if (currentByte & (1 << char)) {
                    changes.push(currentHash);
                    currentByte &= ~(1 << char);
                }
            }
        }

        filter[currentIndex] = currentByte;

        // Skip however many extra were used
        i += alsoIncluded.length;
    }

    return changes;
}

function hashContent(data: string): number[] {
    const result = new Array(numberOfHashes);
    for (let i = 0; i < numberOfHashes; i++) {
        result[i] = murmurhash3js.x86.hash32(data, i) % bloomSize;
    }

    return result;
}

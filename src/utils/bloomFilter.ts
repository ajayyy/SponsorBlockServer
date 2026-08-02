import { config } from "../config";
import { db } from "../databases/databases";
import { Transaction } from "../databases/IDatabase";
import { acquireLock, acquireWaitingLock } from "./redisLock";
import * as murmurhash3js from "murmurhash3js";

export enum BloomFilterID {
    profileLeft = 101,
    contentLeft = 1,
    profileRightPositive = 102,
    contentRightPositive = 2,
    profileRightNegative = 103,
    contentRightNegative = 3
}

export const AllBloomFilters = Object.values(BloomFilterID);

export const numberOfHashes = 4;
async function generateBloomFilter(bloomID: BloomFilterID) {
    const now = Date.now();
    const tempID = bloomID + 100000;

    // Delete temp bloom
    await db.prepare("run", `DELETE FROM "slopBloom" WHERE "id" = ?`, [tempID]);
    await db.prepare("run", `DELETE FROM "slopBloomGeneration" WHERE "id" = ?`, [tempID]);
    await db.prepare("run", `DELETE FROM "slopBloomDiff" WHERE "id" = ?`, [tempID]);

    const query = getQueryForBloom(bloomID);
    const contentIDs = (await db.prepare("all", query)).map((a) => a.contentID);

    const bloom = new Uint8Array(config.bloomSize / 8);
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
            return `SELECT DISTINCT "profileID" as "contentID" FROM "slopVotes" WHERE "count" > 0 AND "wholeProfile" > 0 AND "id" >= 100 AND "id" < 1000`;
        case BloomFilterID.contentLeft:
            return `SELECT DISTINCT "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 100 AND "id" < 1000`;
        case BloomFilterID.profileRightPositive:
            return `SELECT DISTINCT "profileID" as "contentID" FROM "slopVotes" WHERE "count" > 0 AND "wholeProfile" > 0 AND "id" >= 1000 AND "id" < 2000`;
        case BloomFilterID.contentRightPositive:
            return `SELECT DISTINCT "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 1000 AND "id" < 2000`;
        case BloomFilterID.profileRightNegative:
            return `SELECT DISTINCT "profileID" as "contentID" FROM "slopVotes" WHERE "count" > 0 AND "wholeProfile" > 0 AND "id" >= 2000 AND "id" < 3000`;
        case BloomFilterID.contentRightNegative:
            return `SELECT DISTINCT "contentID" FROM "slopVotes" WHERE "count" > 0 AND "id" >= 2000 AND "id" < 3000`;
    }
}

async function updateBloomFilterForSubmission(contentID: string, profileID?: string) {
    const contentCurrentBlooms = (await db.prepare("all", `SELECT DISTINCT "id" FROM "slopBloomGeneration" WHERE "contentID" = ? AND "id" > 0 AND "id" < 100`, [contentID])).map((a) => a.id);
    const profileCurrentBlooms = profileID ? (await db.prepare("all", `SELECT DISTINCT "id" FROM "slopBloomGeneration" WHERE "contentID" = ? AND "id" > 100 AND "id" < 200`, [profileID])).map((a) => a.id) : [];

    const contentVoteIds = (await db.prepare("all", `SELECT DISTINCT "id" FROM "slopVotes" WHERE "count" > 0 AND "contentID" = ?`, [contentID])).map((a) => a.id);
    const profileVoteIds = profileID ? (await db.prepare("all", `SELECT DISTINCT "id" FROM "slopVotes" WHERE "count" > 0 AND "wholeProfile" > 0 AND "profileID" = ?`, [profileID])).map((a) => a.id) : [];

    const contentNewBlooms = new Set<number>();
    for (const voteType of contentVoteIds) {
        if (voteType >= 100 && voteType < 1000) {
            contentNewBlooms.add(BloomFilterID.contentLeft);
        } else if (voteType >= 1000 && voteType < 2000) {
            contentNewBlooms.add(BloomFilterID.contentRightPositive);
        } else if (voteType >= 2000 && voteType < 3000) {
            contentNewBlooms.add(BloomFilterID.contentRightNegative);
        }
    }

    const profileNewBlooms = new Set<number>();
    for (const voteType of profileVoteIds) {
        if (voteType >= 100 && voteType < 1000) {
            profileNewBlooms.add(BloomFilterID.profileLeft);
        } else if (voteType >= 1000 && voteType < 2000) {
            profileNewBlooms.add(BloomFilterID.profileRightPositive);
        } else if (voteType >= 2000 && voteType < 3000) {
            profileNewBlooms.add(BloomFilterID.profileRightNegative);
        }
    }

    const transaction = new Transaction();
    const promises = [];
    for (const newBloom of contentNewBlooms) {
        if (!contentCurrentBlooms.includes(newBloom)) {
            promises.push(addToBloomFilter(transaction, newBloom, contentID));
        }
    }
    for (const oldBloom of contentCurrentBlooms) {
        if (!contentNewBlooms.has(oldBloom)) {
            promises.push(removeFromBloomFilter(transaction, oldBloom, contentID));
        }
    }
    for (const newBloom of profileNewBlooms) {
        if (!profileCurrentBlooms.includes(newBloom)) {
            promises.push(addToBloomFilter(transaction, newBloom, profileID));
        }
    }
    for (const oldBloom of profileCurrentBlooms) {
        if (!profileNewBlooms.has(oldBloom)) {
            promises.push(removeFromBloomFilter(transaction, oldBloom, profileID));
        }
    }
    await Promise.all(promises);

    if (profileID) {
        transaction.add(`DELETE FROM "slopBloomQueue" WHERE "contentID" = ? AND "profileID" = ?`, [contentID, profileID]);
    } else {
        transaction.add(`DELETE FROM "slopBloomQueue" WHERE "contentID" = ?`, [contentID]);
    }

    await db.transaction(transaction);
}

async function runBloomUpdates(contentID: string, profileID?: string) {
    const lock = await acquireLock(`modifyingBloomFilter`);
    if (!lock.status) {
        // Someone else is modifying the bloom
        //  since this is already in the queue we can return and let the other process handle it
        return;
    }

    await updateBloomFilterForSubmission(contentID, profileID);

    // Run rest of queue if any items are there
    const queue = await db.prepare("all", `SELECT "contentID", "profileID" FROM "slopBloomQueue"`);
    for (const item of queue) {
        await updateBloomFilterForSubmission(item.contentID, item.profileID);
    }

    lock.unlock();
}

export async function modifyBloomFilters(contentID: string, profileID?: string) {
    const lock = await acquireWaitingLock(`modifyingBloomFilter-${contentID}`);

    // Add to queue
    await db.prepare("run", `INSERT INTO "slopBloomQueue" 
            ("contentID", "profileID", "timeAdded")
            VALUES (?, ?, ?)
        ON CONFLICT ("contentID")
        DO NOTHING`, [contentID, profileID ?? null, Date.now()]);

    await runBloomUpdates(contentID, profileID);

    lock.unlock();
}

async function addToBloomFilter(transaction: Transaction, bloomID: BloomFilterID, contentID: string) {
    const now = Date.now();
    const hashes = hashContent(contentID).sort((a, b) => a - b);

    const filter = (await db.prepare("get", `SELECT "data" FROM "slopBloom" WHERE id = ?`, [bloomID]))?.data as Buffer | undefined;
    if (filter) {
        const newFilter = new Uint8Array(filter);
        const changes = modifyBloom(newFilter, hashes, ModifyBloomOperation.Add);

        await transaction.add(`UPDATE "slopBloom" SET "data" = ? WHERE "id" = ? `, [newFilter, bloomID]);

        for (const hash of changes) {
            await transaction.add(`INSERT INTO "slopBloomDiff" ("id", "index", "data", "timeGenerated") VALUES (?, ?, ?, ?)
                ON CONFLICT ("id", "index")
                DO UPDATE SET
                        "data" = ?,
                        "timeGenerated" = ?`, [bloomID, hash, true, now, true, now]);
        }

        for (const hash of hashes) {
            await transaction.add(`INSERT INTO "slopBloomGeneration" ("id", "contentID", "hash", "timeGenerated") VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING;`, [bloomID, contentID, hash, now]);
        }
    } else {
        await generateBloomFilter(bloomID);
    }
}

async function removeFromBloomFilter(transaction: Transaction, bloomID: BloomFilterID, contentID: string) {
    const now = Date.now();

    // Find hashes for this contentID that aren't used by anyone else
    const toRemove = await db.prepare("all", `SELECT "hash" FROM "slopBloomGeneration" WHERE "id" = ? AND "contentID" = ?
        AND "hash" NOT IN (SELECT "hash" FROM "slopBloomGeneration" WHERE "id" = ? AND "contentID" != ?)`, [bloomID, contentID, bloomID, contentID]);

    if (toRemove.length > 0) {
        const hashes = toRemove.map((v) => v.hash).sort((a, b) => a - b);

        const filter =  (await db.prepare("get", `SELECT "data" FROM "slopBloom" WHERE id = ?`, [bloomID]))?.data as Buffer | undefined;
        if (filter) {
            const newFilter = new Uint8Array(filter);
            const changes = modifyBloom(newFilter, hashes, ModifyBloomOperation.Remove);

            await transaction.add(`UPDATE "slopBloom" SET "data" = ? WHERE "id" = ? `, [newFilter, bloomID]);

            await transaction.add(`DELETE FROM "slopBloomGeneration" WHERE "id" = ? AND "contentID" = ?`, [bloomID, contentID]);

            for (const hash of changes) {
                await transaction.add(`INSERT INTO "slopBloomDiff" ("id", "index", "data", "timeGenerated") VALUES (?, ?, ?, ?)
                    ON CONFLICT ("id", "index")
                    DO UPDATE SET
                            "data" = ?,
                            "timeGenerated" = ?`, [bloomID, hash, false, now, false, now]);
            }
        } else {
            await generateBloomFilter(bloomID);
        }
    }
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
        result[i] = murmurhash3js.x86.hash32(data, i) % config.bloomSize;
    }

    return result;
}

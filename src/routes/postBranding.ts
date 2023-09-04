import { Request, Response } from "express";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";

import { BrandingSubmission, BrandingUUID, TimeThumbnailSubmission } from "../types/branding.model";
import { HashedIP, IPAddress, VideoID } from "../types/segments.model";
import { Feature, HashedUserID } from "../types/user.model";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { getService } from "../utils/getService";
import { isUserVIP } from "../utils/isUserVIP";
import { Logger } from "../utils/logger";
import crypto from "crypto";
import { QueryCacher } from "../utils/queryCacher";
import { acquireLock } from "../utils/redisLock";
import { hasFeature } from "../utils/features";
import { checkBanStatus } from "../utils/checkBan";

enum BrandingType {
    Title,
    Thumbnail
}

interface ExistingVote {
    UUID: BrandingUUID;
    type: number;
    id: number;
}

export async function postBranding(req: Request, res: Response) {
    const { videoID, userID, title, thumbnail } = req.body as BrandingSubmission;
    const service = getService(req.body.service);

    if (!videoID || !userID || userID.length < 30 || !service
        || ((!title || !title.title)
            && (!thumbnail || thumbnail.original == null
                || (!thumbnail.original && (thumbnail as TimeThumbnailSubmission).timestamp) == null))) {
        res.status(400).send("Bad Request");
        return;
    }

    try {
        const hashedUserID = await getHashCache(userID);
        const isVip = await isUserVIP(hashedUserID);
        const hashedVideoID = await getHashCache(videoID, 1);
        const hashedIP = await getHashCache(getIP(req) + config.globalSalt as IPAddress);
        const isBanned = await checkBanStatus(hashedUserID, hashedIP);

        const lock = await acquireLock(`postBranding:${videoID}.${hashedUserID}`);
        if (!lock.status) {
            res.status(429).send("Vote already in progress");
            return;
        }

        const now = Date.now();
        const voteType = 1;

        if (title && !isVip && title.title.length > config.maxTitleLength) {
            lock.unlock();
            res.status(400).send("Your title is too long. Please keep titles concise.");
            return;
        }

        await Promise.all([(async () => {
            if (title) {
                // ignore original submissions from banned users - hiding those would cause issues
                if (title.original && isBanned) return;

                const existingUUID = (await db.prepare("get", `SELECT "UUID" from "titles" where "videoID" = ? AND "title" = ?`, [videoID, title.title]))?.UUID;
                if (existingUUID != undefined && isBanned) return; // ignore votes on existing details from banned users
                const UUID = existingUUID || crypto.randomUUID();

                const existingVote = await handleExistingVotes(BrandingType.Title, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Title, existingVote, UUID, isVip);
                } else {
                    await db.prepare("run", `INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, title.title, title.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID]);

                    const verificationValue = await getVerificationValue(hashedUserID, isVip);
                    await db.prepare("run", `INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification") VALUES (?, 0, ?, ?, ?);`,
                        [UUID, isVip ? 1 : 0, isBanned ? 1 : 0, verificationValue]);

                    await verifyOldSubmissions(hashedUserID, verificationValue);
                }

                if (isVip) {
                    // unlock all other titles
                    await db.prepare("run", `UPDATE "titleVotes" as tv SET "locked" = 0 FROM "titles" t WHERE tv."UUID" = t."UUID" AND tv."UUID" != ? AND t."videoID" = ?`, [UUID, videoID]);
                }
            }
        })(), (async () => {
            if (thumbnail) {
                // ignore original submissions from banned users - hiding those would cause issues
                if (thumbnail.original && isBanned) return;

                const existingUUID = thumbnail.original
                    ? (await db.prepare("get", `SELECT "UUID" from "thumbnails" where "videoID" = ? AND "original" = 1`, [videoID]))?.UUID
                    : (await db.prepare("get", `SELECT "thumbnails"."UUID" from "thumbnailTimestamps" JOIN "thumbnails" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
                        WHERE "thumbnailTimestamps"."timestamp" = ? AND "thumbnails"."videoID" = ?`, [(thumbnail as TimeThumbnailSubmission).timestamp, videoID]))?.UUID;
                if (existingUUID != undefined && isBanned) return; // ignore votes on existing details from banned users
                const UUID = existingUUID || crypto.randomUUID();

                const existingVote = await handleExistingVotes(BrandingType.Thumbnail, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Thumbnail, existingVote, UUID, isVip);
                } else {
                    await db.prepare("run", `INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, thumbnail.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID]);

                    await db.prepare("run", `INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, 0, ?, ?)`,
                        [UUID, isVip ? 1 : 0, isBanned ? 1 : 0]);

                    if (!thumbnail.original) {
                        await db.prepare("run", `INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)`,
                            [UUID, (thumbnail as TimeThumbnailSubmission).timestamp]);
                    }

                    if (isVip) {
                        // unlock all other titles
                        await db.prepare("run", `UPDATE "thumbnailVotes" as tv SET "locked" = 0 FROM "thumbnails" t WHERE tv."UUID" = t."UUID" AND tv."UUID" != ? AND t."videoID" = ?`, [UUID, videoID]);
                    }
                }
            }
        })()]);

        QueryCacher.clearBrandingCache({ videoID, hashedVideoID, service });
        res.status(200).send("OK");
        lock.unlock();
    } catch (e) {
        Logger.error(e as string);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Finds an existing vote, if found, and it's for a different submission, it undoes it, and points to the new submission.
 * If no existing vote, it adds one.
 */
async function handleExistingVotes(type: BrandingType, videoID: VideoID,
    hashedUserID: HashedUserID, UUID: BrandingUUID, hashedIP: HashedIP, voteType: number): Promise<ExistingVote> {
    const table = type === BrandingType.Title ? `"titleVotes"` : `"thumbnailVotes"`;

    const existingVote = await privateDB.prepare("get", `SELECT "id", "UUID", "type" from ${table} where "videoID" = ? AND "userID" = ?`, [videoID, hashedUserID]);
    if (existingVote && existingVote.UUID !== UUID) {
        if (existingVote.type === 1) {
            await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" - 1 WHERE "UUID" = ?`, [existingVote.UUID]);
        }

        await privateDB.prepare("run", `UPDATE ${table} SET "type" = ?, "UUID" = ? WHERE "id" = ?`, [voteType, UUID, existingVote.id]);
    } else if (!existingVote) {
        await privateDB.prepare("run", `INSERT INTO ${table} ("videoID", "UUID", "userID", "hashedIP", "type") VALUES (?, ?, ?, ?, ?)`,
            [videoID, UUID, hashedUserID, hashedIP, voteType]);
    }

    return existingVote;
}

/**
 * Only called if an existing vote exists.
 * Will update public vote totals and locked status.
 */
async function updateVoteTotals(type: BrandingType, existingVote: ExistingVote, UUID: BrandingUUID, isVip: boolean): Promise<void> {
    const table = type === BrandingType.Title ? `"titleVotes"` : `"thumbnailVotes"`;

    // Don't upvote if we vote on the same submission
    if (!existingVote || existingVote.UUID !== UUID) {
        await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" + 1 WHERE "UUID" = ?`, [UUID]);
    }

    if (isVip) {
        await db.prepare("run", `UPDATE ${table} SET "locked" = 1 WHERE "UUID" = ?`, [UUID]);
    }
}

async function getVerificationValue(hashedUserID: HashedUserID, isVip: boolean): Promise<number> {
    const voteSum = await db.prepare("get", `SELECT SUM("maxVotes") as "voteSum" FROM (SELECT MAX("votes") as "maxVotes" from "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" WHERE "titles"."userID" = ? GROUP BY "titles"."videoID") t`, [hashedUserID]);
    const sbSubmissions = () => db.prepare("get", `SELECT COUNT(*) as count FROM "sponsorTimes" WHERE "userID" = ? AND "votes" > 0 LIMIT 3`, [hashedUserID]);

    if (voteSum.voteSum >= 1 || isVip || (await sbSubmissions()).count > 2 || await hasFeature(hashedUserID, Feature.DeArrowTitleSubmitter)) {
        return 0;
    } else {
        return -1;
    }
}

async function verifyOldSubmissions(hashedUserID: HashedUserID, verification: number): Promise<void> {
    if (verification >= 0) {
        const unverifiedSubmissions = await db.prepare("all", `SELECT "videoID", "hashedVideoID", "service" FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" WHERE "titles"."userID" = ? AND "titleVotes"."verification" < ? GROUP BY "videoID", "hashedVideoID", "service"`, [hashedUserID, verification]);

        if (unverifiedSubmissions.length > 0) {
            for (const submission of unverifiedSubmissions) {
                QueryCacher.clearBrandingCache({
                    videoID: submission.videoID,
                    hashedVideoID: submission.hashedVideoID,
                    service: submission.service
                });
            }

            await db.prepare("run", `UPDATE "titleVotes" as tv SET "verification" = ? FROM "titles" WHERE "titles"."UUID" = tv."UUID" AND "titles"."userID" = ? AND tv."verification" < ?`, [verification, hashedUserID, verification]);
        }
    }
}

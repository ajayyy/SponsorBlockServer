import { Request, Response } from "express";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";

import { BrandingSubmission, BrandingUUID, TimeThumbnailSubmission } from "../types/branding.model";
import { HashedIP, IPAddress, VideoID } from "../types/segments.model";
import { HashedUserID } from "../types/user.model";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { getService } from "../utils/getService";
import { isUserVIP } from "../utils/isUserVIP";
import { Logger } from "../utils/logger";
import crypto from "crypto";
import { QueryCacher } from "../utils/queryCacher";

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
                || (!thumbnail.original && !(thumbnail as TimeThumbnailSubmission).timestamp)))) {
        res.status(400).send("Bad Request");
        return;
    }

    try {
        const hashedUserID = await getHashCache(userID);
        const isVip = await isUserVIP(hashedUserID);
        const hashedVideoID = await getHashCache(videoID, 1);
        const hashedIP = await getHashCache(getIP(req) + config.globalSalt as IPAddress);

        const now = Date.now();
        const voteType = 1;

        await Promise.all([(async () => {
            if (title) {
                const existingUUID = (await db.prepare("get", `SELECT "UUID" from "titles" where "videoID" = ? AND "title" = ?`, [videoID, title.title]))?.UUID;
                const UUID = existingUUID || crypto.randomUUID();

                const existingVote = await handleExistingVotes(BrandingType.Title, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Title, existingVote, UUID, isVip);
                } else {
                    await db.prepare("run", `INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, title.title, title.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID]);

                    await db.prepare("run", `INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, 0, ?, 0);`,
                        [UUID, isVip ? 1 : 0]);
                }

                if (isVip) {
                    // unlock all other titles
                    await db.prepare("run", `UPDATE "titleVotes" SET "locked" = 0 FROM "titles" WHERE "titleVotes"."UUID" != ? AND "titles"."UUID" != ? AND "titles"."videoID" = ?`, [UUID, UUID, videoID]);
                }
            }
        })(), (async () => {
            if (thumbnail) {
                const existingUUID = thumbnail.original
                    ? (await db.prepare("get", `SELECT "UUID" from "thumbnails" where "videoID" = ? AND "original" = 1`, [videoID]))?.UUID
                    : (await db.prepare("get", `SELECT "thumbnails"."UUID" from "thumbnailTimestamps" JOIN "thumbnails" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
                        WHERE "thumbnailTimestamps"."timestamp" = ? AND "thumbnails"."videoID" = ?`, [(thumbnail as TimeThumbnailSubmission).timestamp, videoID]))?.UUID;
                const UUID = existingUUID || crypto.randomUUID();

                const existingVote = await handleExistingVotes(BrandingType.Thumbnail, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Thumbnail, existingVote, UUID, isVip);
                } else {
                    await db.prepare("run", `INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, thumbnail.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID]);

                    await db.prepare("run", `INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, 0, ?, 0)`,
                        [UUID, isVip ? 1 : 0]);

                    if (!thumbnail.original) {
                        await db.prepare("run", `INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)`,
                            [UUID, (thumbnail as TimeThumbnailSubmission).timestamp]);
                    }

                    if (isVip) {
                        // unlock all other titles
                        await db.prepare("run", `UPDATE "thumbnailVotes" SET "locked" = 0 FROM "thumbnails" WHERE "thumbnailVotes"."UUID" != ? AND "thumbnails"."UUID" != ? AND "thumbnails"."videoID" = ?`, [UUID, UUID, videoID]);
                    }
                }
            }
        })()]);

        QueryCacher.clearBrandingCache({ videoID, hashedVideoID, service });
        res.status(200).send("OK");
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
    if (!existingVote) return;

    const table = type === BrandingType.Title ? `"titleVotes"` : `"thumbnailVotes"`;

    // Don't upvote if we vote on the same submission
    if (!existingVote || existingVote.UUID !== UUID) {
        await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" + 1 WHERE "UUID" = ?`, [UUID]);
    }

    if (isVip) {
        await db.prepare("run", `UPDATE ${table} SET "locked" = 1 WHERE "UUID" = ?`, [UUID]);
    }
}
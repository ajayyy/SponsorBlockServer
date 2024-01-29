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
import axios from "axios";
import { getMaxResThumbnail } from "../utils/youtubeApi";
import { getVideoDetails } from "../utils/getVideoDetails";

enum BrandingType {
    Title,
    Thumbnail
}

enum BrandingVoteType {
    Upvote = 1,
    Downvote = 2
}

interface ExistingVote {
    UUID: BrandingUUID;
    type: number;
    id: number;
}

export async function postBranding(req: Request, res: Response) {
    const { videoID, userID, title, thumbnail, autoLock, downvote } = req.body as BrandingSubmission;
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
        const shouldLock = isVip && autoLock !== false;
        const hashedVideoID = await getHashCache(videoID, 1);
        const hashedIP = await getHashCache(getIP(req) + config.globalSalt as IPAddress);
        const isBanned = await checkBanStatus(hashedUserID, hashedIP);

        const lock = await acquireLock(`postBranding:${videoID}.${hashedUserID}`);
        if (!lock.status) {
            res.status(429).send("Vote already in progress");
            return;
        }

        const now = Date.now();
        const voteType: BrandingVoteType = downvote ? BrandingVoteType.Downvote : BrandingVoteType.Upvote;

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

                await handleExistingVotes(BrandingType.Title, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Title, UUID, shouldLock, !!downvote);
                } else {
                    if (downvote) {
                        throw new Error("Title submission doesn't exist");
                    }

                    await db.prepare("run", `INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, title.title, title.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID]);

                    const verificationValue = await getVerificationValue(hashedUserID, isVip);
                    await db.prepare("run", `INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification") VALUES (?, 0, ?, ?, ?);`,
                        [UUID, shouldLock ? 1 : 0, isBanned ? 1 : 0, verificationValue]);

                    await verifyOldSubmissions(hashedUserID, verificationValue);
                }

                if (isVip) {
                    // unlock all other titles
                    if (shouldLock) {
                        await db.prepare("run", `UPDATE "titleVotes" as tv SET "locked" = 0 FROM "titles" t WHERE tv."UUID" = t."UUID" AND tv."UUID" != ? AND t."videoID" = ?`, [UUID, videoID]);
                    } else {
                        await db.prepare("run", `UPDATE "titleVotes" as tv SET "locked" = 0 FROM "titles" t WHERE tv."UUID" = t."UUID" AND t."videoID" = ?`, [videoID]);
                    }
                }

                sendWebhooks(videoID, UUID).catch((e) => Logger.error(e));
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

                await handleExistingVotes(BrandingType.Thumbnail, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Thumbnail, UUID, shouldLock, !!downvote);
                } else {
                    if (downvote) {
                        throw new Error("Thumbnail submission doesn't exist");
                    }

                    await db.prepare("run", `INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID") VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, thumbnail.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID]);

                    await db.prepare("run", `INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, 0, ?, ?)`,
                        [UUID, shouldLock ? 1 : 0, isBanned ? 1 : 0]);

                    if (!thumbnail.original) {
                        await db.prepare("run", `INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)`,
                            [UUID, (thumbnail as TimeThumbnailSubmission).timestamp]);
                    }
                }

                if (isVip) {
                    // unlock all other titles
                    if (shouldLock) {
                        await db.prepare("run", `UPDATE "thumbnailVotes" as tv SET "locked" = 0 FROM "thumbnails" t WHERE tv."UUID" = t."UUID" AND tv."UUID" != ? AND t."videoID" = ?`, [UUID, videoID]);
                    } else {
                        await db.prepare("run", `UPDATE "thumbnailVotes" as tv SET "locked" = 0 FROM "thumbnails" t WHERE tv."UUID" = t."UUID" AND t."videoID" = ?`, [videoID]);
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
    hashedUserID: HashedUserID, UUID: BrandingUUID, hashedIP: HashedIP, voteType: BrandingVoteType) {
    const table = type === BrandingType.Title ? `"titleVotes"` : `"thumbnailVotes"`;

    // Either votes of the same type, or on the same submission (undo a downvote)
    const existingVotes = await privateDB.prepare("all", `SELECT "id", "UUID", "type" from ${table} where "videoID" = ? AND "userID" = ? AND ("type" = ? OR "UUID" = ?)`, [videoID, hashedUserID, voteType, UUID]) as ExistingVote[];
    if (existingVotes.length > 0) {
        // Only one upvote per video
        if (voteType === BrandingVoteType.Upvote) {
            for (const existingVote of existingVotes) {
                switch (existingVote.type) {
                    case BrandingVoteType.Upvote:
                        await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" - 1 WHERE "UUID" = ?`, [existingVote.UUID]);
                        await privateDB.prepare("run", `UPDATE ${table} SET "type" = ?, "UUID" = ? WHERE "id" = ?`, [voteType, UUID, existingVote.id]);
                        break;
                    case BrandingVoteType.Downvote:
                        // Undoing a downvote now that it is being upvoted
                        await db.prepare("run", `UPDATE ${table} SET "downvotes" = "downvotes" - 1 WHERE "UUID" = ?`, [existingVote.UUID]);
                        await privateDB.prepare("run", `DELETE FROM ${table} WHERE "id" = ?`, [existingVote.id]);
                        break;
                }
            }
        }

    } else {
        await privateDB.prepare("run", `INSERT INTO ${table} ("videoID", "UUID", "userID", "hashedIP", "type") VALUES (?, ?, ?, ?, ?)`,
            [videoID, UUID, hashedUserID, hashedIP, voteType]);
    }
}

/**
 * Only called if an existing vote exists.
 * Will update public vote totals and locked status.
 */
async function updateVoteTotals(type: BrandingType, UUID: BrandingUUID, shouldLock: boolean, downvote: boolean): Promise<void> {
    const table = type === BrandingType.Title ? `"titleVotes"` : `"thumbnailVotes"`;

    if (downvote) {
        await db.prepare("run", `UPDATE ${table} SET "downvotes" = "downvotes" + 1 WHERE "UUID" = ?`, [UUID]);
    } else {
        await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" + 1 WHERE "UUID" = ?`, [UUID]);
    }

    if (shouldLock) {
        if (downvote) {
            await db.prepare("run", `UPDATE ${table} SET "removed" = 1 WHERE "UUID" = ?`, [UUID]);
        } else {
            await db.prepare("run", `UPDATE ${table} SET "locked" = 1, "removed" = 0 WHERE "UUID" = ?`, [UUID]);
        }
    }
}

export async function getVerificationValue(hashedUserID: HashedUserID, isVip: boolean): Promise<number> {
    const voteSum = await db.prepare("get", `SELECT SUM("maxVotes") as "voteSum" FROM (SELECT MAX("votes") as "maxVotes" from "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" WHERE "titles"."userID" = ? GROUP BY "titles"."videoID") t`, [hashedUserID]);

    if (voteSum.voteSum >= 1 || isVip || await hasFeature(hashedUserID, Feature.DeArrowTitleSubmitter)) {
        return 0;
    } else {
        return -1;
    }
}

export async function verifyOldSubmissions(hashedUserID: HashedUserID, verification: number): Promise<void> {
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

async function sendWebhooks(videoID: VideoID, UUID: BrandingUUID) {
    const lockedSubmission = await db.prepare("get", `SELECT "titleVotes"."votes", "titles"."title", "titles"."userID" FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" WHERE "titles"."videoID" = ? AND "titles"."UUID" != ? AND "titleVotes"."locked" = 1`, [videoID, UUID]);

    if (lockedSubmission) {
        const currentSubmission = await db.prepare("get", `SELECT "titleVotes"."votes", "titles"."title" FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" WHERE "titles"."UUID" = ?`, [UUID]);

        // Time to warn that there may be an issue
        if (currentSubmission.votes - lockedSubmission.votes > 2) {
            const usernameRow = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [lockedSubmission.userID]);

            const data = await getVideoDetails(videoID);
            axios.post(config.discordDeArrowLockedWebhookURL, {
                "embeds": [{
                    "title": data?.title,
                    "url": `https://www.youtube.com/watch?v=${videoID}`,
                    "description": `**${lockedSubmission.votes}** Votes vs **${currentSubmission.votes}**\
                        \n\n**Locked title:** ${lockedSubmission.title}\
                        \n**New title:** ${currentSubmission.title}\
                        \n\n**Submitted by:** ${usernameRow?.userName ?? ""}\n${lockedSubmission.userID}`,
                    "color": 10813440,
                    "thumbnail": {
                        "url": getMaxResThumbnail(videoID),
                    },
                }],
            })
                .then(res => {
                    if (res.status >= 400) {
                        Logger.error("Error sending reported submission Discord hook");
                        Logger.error(JSON.stringify((res.data)));
                        Logger.error("\n");
                    }
                })
                .catch(err => {
                    Logger.error("Failed to send reported submission Discord hook.");
                    Logger.error(JSON.stringify(err));
                    Logger.error("\n");
                });
        }
    }
}
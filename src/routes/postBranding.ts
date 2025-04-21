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
import { canSubmitDeArrow, validSubmittedData } from "../utils/permissions";
import { parseUserAgent } from "../utils/userAgent";

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
    const { videoID, userID, title, thumbnail, autoLock, downvote, videoDuration, wasWarned, casualMode } = req.body as BrandingSubmission;
    const service = getService(req.body.service);
    const userAgent = req.body.userAgent ?? parseUserAgent(req.get("user-agent")) ?? "";

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

        if (!validSubmittedData(userAgent)) {
            Logger.warn(`Rejecting submission based on invalid data: ${hashedUserID} ${videoID} ${videoDuration} ${userAgent} ${req.headers["user-agent"]}`);
            res.status(200).send("OK");
            return;
        }

        const permission = await canSubmitDeArrow(hashedUserID);
        if (!permission.canSubmit) {
            Logger.warn(`New user trying to submit dearrow: ${hashedUserID} ${videoID} ${videoDuration} ${title} ${req.headers["user-agent"]}`);

            res.status(403).send(permission.reason);
            return;
        } else if (permission.newUser && config.discordNewUserWebhookURL) {
            axios.post(config.discordNewUserWebhookURL, {
                "embeds": [{
                    "title": hashedUserID,
                    "url": `https://www.youtube.com/watch?v=${videoID}`,
                    "description": `**User Agent**: ${userAgent}\
                        \n**Sent User Agent**: ${req.body.userAgent}\
                        \n**Real User Agent**: ${req.headers["user-agent"]}\
                        \n**Video Duration**: ${videoDuration}`,
                    "color": 1184701,
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

        if (videoDuration && thumbnail && await checkForWrongVideoDuration(videoID, videoDuration)) {
            res.status(403).send("YouTube is currently testing a new anti-adblock technique called server-side ad-injection. This causes skips and submissions to be offset by the duration of the ad. It seems that you are affected by this A/B test, so until a fix is developed, we cannot accept submissions from your device due to them potentially being inaccurate.");
            return;
        }

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

        let errorCode = 0;

        await Promise.all([(async () => {
            if (title) {
                // ignore original submissions from banned users - hiding those would cause issues
                if (title.original && isBanned) return;

                const existingUUID = (await db.prepare("get", `SELECT "UUID" from "titles" where "videoID" = ? AND "title" = ?`, [videoID, title.title]))?.UUID;
                const existingIsLocked = !!existingUUID && (await db.prepare("get", `SELECT "locked" from "titleVotes" where "UUID" = ?`, [existingUUID]))?.locked;
                if (existingUUID != undefined && isBanned) return; // ignore votes on existing details from banned users
                if (downvote && existingIsLocked && !isVip) {
                    sendWebhooks(videoID, existingUUID, voteType, wasWarned, shouldLock).catch((e) => Logger.error(e));
                    errorCode = 403;
                    return;
                }
                const UUID = existingUUID || crypto.randomUUID();

                await handleExistingVotes(BrandingType.Title, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Title, UUID, hashedUserID, shouldLock, !!downvote);
                } else {
                    if (downvote) {
                        throw new Error("Title submission doesn't exist");
                    }

                    await db.prepare("run", `INSERT INTO "titles" ("videoID", "title", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID", "casualMode", "userAgent") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, title.title, title.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID, casualMode ? 1 : 0, userAgent]);

                    const verificationValue = await getVerificationValue(hashedUserID, isVip);
                    await db.prepare("run", `INSERT INTO "titleVotes" ("UUID", "votes", "locked", "shadowHidden", "verification") VALUES (?, 0, ?, ?, ?);`,
                        [UUID, shouldLock ? 1 : 0, isBanned ? 1 : 0, verificationValue]);

                    await verifyOldSubmissions(hashedUserID, verificationValue);
                }

                if (isVip && !downvote && shouldLock) {
                    // unlock all other titles
                    await db.prepare("run", `UPDATE "titleVotes" as tv SET "locked" = 0 FROM "titles" t WHERE tv."UUID" = t."UUID" AND tv."UUID" != ? AND t."videoID" = ?`, [UUID, videoID]);
                }

                sendWebhooks(videoID, UUID, voteType, wasWarned, shouldLock).catch((e) => Logger.error(e));
            }
        })(), (async () => {
            if (thumbnail) {
                // ignore original submissions from banned users - hiding those would cause issues
                if (thumbnail.original && (isBanned || !await canSubmitOriginal(hashedUserID, isVip))) return;

                const existingUUID = thumbnail.original
                    ? (await db.prepare("get", `SELECT "UUID" from "thumbnails" where "videoID" = ? AND "original" = 1`, [videoID]))?.UUID
                    : (await db.prepare("get", `SELECT "thumbnails"."UUID" from "thumbnailTimestamps" JOIN "thumbnails" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
                        WHERE "thumbnailTimestamps"."timestamp" = ? AND "thumbnails"."videoID" = ?`, [(thumbnail as TimeThumbnailSubmission).timestamp, videoID]))?.UUID;
                const existingIsLocked = !!existingUUID && (await db.prepare("get", `SELECT "locked" from "thumbnailVotes" where "UUID" = ?`, [existingUUID]))?.locked;
                if (existingUUID != undefined && isBanned) return; // ignore votes on existing details from banned users
                if (downvote && existingIsLocked && !isVip) {
                    errorCode = 403;
                    return;
                }
                const UUID = existingUUID || crypto.randomUUID();

                await handleExistingVotes(BrandingType.Thumbnail, videoID, hashedUserID, UUID, hashedIP, voteType);
                if (existingUUID) {
                    await updateVoteTotals(BrandingType.Thumbnail, UUID, hashedUserID, shouldLock, !!downvote);
                } else {
                    if (downvote) {
                        throw new Error("Thumbnail submission doesn't exist");
                    }

                    await db.prepare("run", `INSERT INTO "thumbnails" ("videoID", "original", "userID", "service", "hashedVideoID", "timeSubmitted", "UUID", "casualMode", "userAgent") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [videoID, thumbnail.original ? 1 : 0, hashedUserID, service, hashedVideoID, now, UUID, casualMode ? 1 : 0, userAgent]);

                    await db.prepare("run", `INSERT INTO "thumbnailVotes" ("UUID", "votes", "locked", "shadowHidden") VALUES (?, 0, ?, ?)`,
                        [UUID, shouldLock ? 1 : 0, isBanned ? 1 : 0]);

                    if (!thumbnail.original) {
                        await db.prepare("run", `INSERT INTO "thumbnailTimestamps" ("UUID", "timestamp") VALUES (?, ?)`,
                            [UUID, (thumbnail as TimeThumbnailSubmission).timestamp]);
                    }
                }

                if (isVip && !downvote && shouldLock) {
                    // unlock all other titles
                    await db.prepare("run", `UPDATE "thumbnailVotes" as tv SET "locked" = 0 FROM "thumbnails" t WHERE tv."UUID" = t."UUID" AND tv."UUID" != ? AND t."videoID" = ?`, [UUID, videoID]);
                }
            }
        })()]);

        QueryCacher.clearBrandingCache({ videoID, hashedVideoID, service });

        if (errorCode) {
            res.status(errorCode).send();
        } else {
            res.status(200).send("OK");
        }

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
    const idsDealtWith: BrandingUUID[] = [];

    // Either votes of the same type, or on the same submission (undo a downvote)
    const existingVotes = await privateDB.prepare("all", `SELECT "id", "UUID", "type" from ${table} where "videoID" = ? AND "userID" = ? AND ("type" = ? OR "UUID" = ?)`, [videoID, hashedUserID, voteType, UUID]) as ExistingVote[];
    if (existingVotes.length > 0) {
        // Only one upvote per video
        for (const existingVote of existingVotes) {
            // For downvotes, only undo for this specific submission (multiple downvotes on one submission not allowed)
            if (voteType === BrandingVoteType.Downvote && existingVote.UUID !== UUID) continue;

            switch (existingVote.type) {
                case BrandingVoteType.Upvote:
                    // Old case where there are duplicate rows in private db
                    if (!idsDealtWith.includes(existingVote.UUID)) {
                        idsDealtWith.push(existingVote.UUID);
                        await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" - 1 WHERE "UUID" = ?`, [existingVote.UUID]);
                    }

                    await privateDB.prepare("run", `DELETE FROM ${table} WHERE "id" = ?`, [existingVote.id]);
                    break;
                case BrandingVoteType.Downvote: {
                    await db.prepare("run", `UPDATE ${table} SET "downvotes" = "downvotes" - 1 WHERE "UUID" = ?`, [existingVote.UUID]);

                    await privateDB.prepare("run", `DELETE FROM ${table} WHERE "id" = ?`, [existingVote.id]);
                    break;
                }
            }
        }
    }

    await privateDB.prepare("run", `INSERT INTO ${table} ("videoID", "UUID", "userID", "hashedIP", "type") VALUES (?, ?, ?, ?, ?)`,
        [videoID, UUID, hashedUserID, hashedIP, voteType]);
}

/**
 * Only called if an existing vote exists.
 * Will update public vote totals and locked status.
 */
async function updateVoteTotals(type: BrandingType, UUID: BrandingUUID, userID: HashedUserID, shouldLock: boolean, downvote: boolean): Promise<void> {
    const table = type === BrandingType.Title ? `"titleVotes"` : `"thumbnailVotes"`;
    const table2 = type === BrandingType.Title ? `"titles"` : `"thumbnails"`;

    if (downvote) {
        // Only downvote if it is not their submission
        const isUsersSubmission = (await db.prepare("get", `SELECT "userID" FROM ${table2} WHERE "UUID" = ?`, [UUID]))?.userID === userID;
        if (!isUsersSubmission) {
            await db.prepare("run", `UPDATE ${table} SET "downvotes" = "downvotes" + 1 WHERE "UUID" = ?`, [UUID]);
        }
    } else {
        await db.prepare("run", `UPDATE ${table} SET "votes" = "votes" + 1 WHERE "UUID" = ?`, [UUID]);

        if (type === BrandingType.Title) {
            const votedSubmitterUserID = (await db.prepare("get", `SELECT "userID" FROM ${table2} WHERE "UUID" = ?`, [UUID]))?.userID;
            if (votedSubmitterUserID) {
                await verifyOldSubmissions(votedSubmitterUserID, await getVerificationValue(votedSubmitterUserID, await isUserVIP(votedSubmitterUserID)));
            }
        }
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

async function canSubmitOriginal(hashedUserID: HashedUserID, isVip: boolean): Promise<boolean> {
    const upvotedThumbs = (await db.prepare("get", `SELECT count(*) as "upvotedThumbs" FROM "thumbnails" JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" WHERE "thumbnailVotes"."votes" > 0 AND "thumbnails"."original" = 0 AND "thumbnails"."userID" = ?`, [hashedUserID])).upvotedThumbs;
    const customThumbs = (await db.prepare("get", `SELECT count(*) as "customThumbs" FROM "thumbnails" JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" WHERE "thumbnailVotes"."votes" >= 0 AND "thumbnails"."original" = 0 AND "thumbnails"."userID" = ?`, [hashedUserID])).customThumbs;
    const originalThumbs = (await db.prepare("get", `SELECT count(*) as "originalThumbs" FROM "thumbnails" JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" WHERE "thumbnailVotes"."votes" >= 0 AND "thumbnails"."original" = 1 AND "thumbnails"."userID" = ?`, [hashedUserID])).originalThumbs;

    return isVip || (upvotedThumbs > 1 && customThumbs > 1 && originalThumbs / customThumbs < 0.4);
}

async function sendWebhooks(videoID: VideoID, UUID: BrandingUUID, voteType: BrandingVoteType, wasWarned: boolean, vipAction: boolean) {
    const currentSubmission = await db.prepare(
        "get",
        `SELECT 
            "titles"."title", 
            "titleVotes"."locked", 
            "titles"."userID", 
            "titleVotes"."votes"-"titleVotes"."downvotes"+"titleVotes"."verification" AS "score" 
        FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" 
        WHERE "titles"."UUID" = ?`,
        [UUID]);

    if (wasWarned && voteType === BrandingVoteType.Upvote) {
        const data = await getVideoDetails(videoID);
        axios.post(config.discordDeArrowWarnedWebhookURL, {
            "embeds": [{
                "title": data?.title,
                "url": `https://www.youtube.com/watch?v=${videoID}`,
                "description": `**Submitted title:** ${currentSubmission.title}\
                    \n\n**Submitted by:** ${currentSubmission.userID}`,
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

    // Unlocked title getting more upvotes than the locked one
    if (voteType === BrandingVoteType.Upvote) {
        const lockedSubmission = await db.prepare(
            "get",
            `SELECT 
                "titles"."title", 
                "titles"."userID", 
                "titleVotes"."votes"-"titleVotes"."downvotes"+"titleVotes"."verification" AS "score" 
            FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID" 
            WHERE "titles"."videoID" = ? 
              AND "titles"."UUID" != ? 
              AND "titleVotes"."locked" = 1`,
            [videoID, UUID]);

        // Time to warn that there may be an issue
        if (lockedSubmission && currentSubmission.score - lockedSubmission.score > 2) {
            const usernameRow = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [lockedSubmission.userID]);

            const data = await getVideoDetails(videoID);
            axios.post(config.discordDeArrowLockedWebhookURL, {
                "embeds": [{
                    "title": data?.title,
                    "url": `https://www.youtube.com/watch?v=${videoID}`,
                    "description": `**${lockedSubmission.score}** score vs **${currentSubmission.score}**\
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

    // Downvotes on locked title
    if (voteType === BrandingVoteType.Downvote && currentSubmission.locked === 1) {
        const usernameRow = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [currentSubmission.userID]);

        const data = await getVideoDetails(videoID);
        axios.post(config.discordDeArrowLockedWebhookURL, {
            "embeds": [{
                "title": data?.title,
                "url": `https://www.youtube.com/watch?v=${videoID}`,
                "description": `Locked title ${vipAction ? "was removed by a VIP" : `with **${currentSubmission.score}** score received a downvote`}\
                    \n\n**Locked title:** ${currentSubmission.title}\
                    \n**Submitted by:** ${usernameRow?.userName ?? ""}\n${currentSubmission.userID}`,
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

async function checkForWrongVideoDuration(videoID: VideoID, duration: number): Promise<boolean> {
    const apiVideoDetails = await getVideoDetails(videoID, true);
    const apiDuration = apiVideoDetails?.duration;

    return apiDuration && apiDuration > 2 && duration && duration > 2 && Math.abs(apiDuration - duration) > 3;
}

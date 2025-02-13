import { Request, Response } from "express";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";

import { BrandingUUID, CasualCategory, CasualVoteSubmission } from "../types/branding.model";
import { HashedIP, IPAddress, Service, VideoID } from "../types/segments.model";
import { HashedUserID } from "../types/user.model";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { getService } from "../utils/getService";
import { Logger } from "../utils/logger";
import crypto from "crypto";
import { QueryCacher } from "../utils/queryCacher";
import { acquireLock } from "../utils/redisLock";
import { checkBanStatus } from "../utils/checkBan";

interface ExistingVote {
    UUID: BrandingUUID;
    type: number;
}

export async function postCasual(req: Request, res: Response) {
    const { videoID, userID, downvote } = req.body as CasualVoteSubmission;
    let categories = req.body.categories as CasualCategory[];
    const service = getService(req.body.service);

    if (downvote) {
        categories = ["downvote" as CasualCategory];
    } else if (!categories.every((c) => config.casualCategoryList.includes(c))) {
        return res.status(400).send("Invalid category");
    }

    if (!videoID || !userID || userID.length < 30 || !service || !categories || !Array.isArray(categories)) {
        return res.status(400).send("Bad Request");
    }

    try {
        const hashedUserID = await getHashCache(userID);
        const hashedVideoID = await getHashCache(videoID, 1);
        const hashedIP = await getHashCache(getIP(req) + config.globalSalt as IPAddress);
        const isBanned = await checkBanStatus(hashedUserID, hashedIP);

        const lock = await acquireLock(`postCasual:${videoID}.${hashedUserID}`);
        if (!lock.status) {
            res.status(429).send("Vote already in progress");
            return;
        }

        if (isBanned) {
            return res.status(200).send("OK");
        }

        const now = Date.now();
        for (const category of categories) {
            const existingUUID = (await db.prepare("get", `SELECT "UUID" from "casualVotes" where "videoID" = ? AND "category" = ?`, [videoID, category]))?.UUID;
            const UUID = existingUUID || crypto.randomUUID();

            const alreadyVotedTheSame = await handleExistingVotes(videoID, service, UUID, hashedUserID, hashedIP, category, downvote, now);
            if (existingUUID) {
                if (!alreadyVotedTheSame) {
                    await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" + 1 WHERE "UUID" = ?`, [UUID]);
                }
            } else {
                await db.prepare("run", `INSERT INTO "casualVotes" ("videoID", "service", "hashedVideoID", "timeSubmitted", "UUID", "category", "upvotes") VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [videoID, service, hashedVideoID, now, UUID, category, 1]);
            }
        }

        QueryCacher.clearBrandingCache({ videoID, hashedVideoID, service });

        res.status(200).send("OK");

        lock.unlock();
    } catch (e) {
        Logger.error(e as string);
        res.status(500).send("Internal Server Error");
    }
}

async function handleExistingVotes(videoID: VideoID, service: Service, UUID: string,
    hashedUserID: HashedUserID, hashedIP: HashedIP, category: CasualCategory, downvote: boolean, now: number): Promise<boolean> {
    const existingVote = await privateDB.prepare("get", `SELECT "UUID" from "casualVotes" WHERE "videoID" = ? AND "service" = ? AND "userID" = ? AND "category" = ?`, [videoID, service, hashedUserID, category]) as ExistingVote;
    if (existingVote) {
        return true;
    } else {
        if (downvote) {
            // Remove upvotes for all categories on this video
            const existingUpvotes = await privateDB.prepare("all", `SELECT "category" from "casualVotes" WHERE "category" != 'downvote' AND "videoID" = ? AND "service" = ? AND "userID" = ?`, [videoID, service, hashedUserID]);
            for (const existingUpvote of existingUpvotes) {
                await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" - 1 WHERE "videoID" = ? AND "category" = ?`, [videoID, existingUpvote.category]);
                await privateDB.prepare("run", `DELETE FROM "casualVotes" WHERE "videoID" = ? AND "userID" = ? AND "category" = ?`, [videoID, hashedUserID, existingUpvote.category]);
            }
        } else {
            // Undo a downvote if it exists
            const existingDownvote = await privateDB.prepare("get", `SELECT "UUID" from "casualVotes" WHERE "category" = 'downvote' AND "videoID" = ? AND "service" = ? AND "userID" = ?`, [videoID, service, hashedUserID]) as ExistingVote;
            if (existingDownvote) {
                await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" - 1 WHERE "category" = 'downvote' AND "videoID" = ?`, [videoID]);
                await privateDB.prepare("run", `DELETE FROM "casualVotes" WHERE "category" = 'downvote' AND "videoID" = ? AND "userID" = ?`, [videoID, hashedUserID]);
            }
        }
    }

    await privateDB.prepare("run", `INSERT INTO "casualVotes" ("videoID", "service", "userID", "hashedIP", "category", "timeSubmitted") VALUES (?, ?, ?, ?, ?, ?)`,
        [videoID, service, hashedUserID, hashedIP, category, now]);

    return false;
}
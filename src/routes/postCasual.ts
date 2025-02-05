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

enum CasualVoteType {
    Upvote = 1,
    Downvote = 2
}

interface ExistingVote {
    UUID: BrandingUUID;
    type: number;
}

export async function postCasual(req: Request, res: Response) {
    const { videoID, userID, downvote, category } = req.body as CasualVoteSubmission;
    const service = getService(req.body.service);

    if (!videoID || !userID || userID.length < 30 || !service || !category) {
        return res.status(400).send("Bad Request");
    }
    if (!config.casualCategoryList.includes(category)) {
        return res.status(400).send("Invalid category");
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
        const voteType: CasualVoteType = downvote ? CasualVoteType.Downvote : CasualVoteType.Upvote;

        const existingUUID = (await db.prepare("get", `SELECT "UUID" from "casualVotes" where "videoID" = ? AND "category" = ?`, [videoID, category]))?.UUID;
        const UUID = existingUUID || crypto.randomUUID();

        const alreadyVotedTheSame = await handleExistingVotes(videoID, service, UUID, hashedUserID, hashedIP, category, voteType, now);
        if (existingUUID) {
            if (!alreadyVotedTheSame) {
                if (downvote) {
                    await db.prepare("run", `UPDATE "casualVotes" SET "downvotes" = "downvotes" + 1 WHERE "UUID" = ?`, [UUID]);
                } else {
                    await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" + 1 WHERE "UUID" = ?`, [UUID]);
                }
            }
        } else {
            if (downvote) {
                throw new Error("Title submission doesn't exist");
            }

            await db.prepare("run", `INSERT INTO "casualVotes" ("videoID", "service", "hashedVideoID", "timeSubmitted", "UUID", "category", "upvotes", "downvotes") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [videoID, service, hashedVideoID, now, UUID, category, downvote ? 0 : 1, downvote ? 1 : 0]);
        }

        //todo: cache clearing
        QueryCacher.clearBrandingCache({ videoID, hashedVideoID, service });

        res.status(200).send("OK");

        lock.unlock();
    } catch (e) {
        Logger.error(e as string);
        res.status(500).send("Internal Server Error");
    }
}

async function handleExistingVotes(videoID: VideoID, service: Service, UUID: string,
    hashedUserID: HashedUserID, hashedIP: HashedIP, category: CasualCategory, voteType: CasualVoteType, now: number): Promise<boolean> {
    const existingVote = await privateDB.prepare("get", `SELECT "UUID", "type" from "casualVotes" WHERE "videoID" = ? AND "service" = ? AND "userID" = ? AND category = ?`, [videoID, service, hashedUserID, category]) as ExistingVote;
    if (existingVote) {
        if (existingVote.type === voteType) {
            return true;
        }

        if (existingVote.type === CasualVoteType.Upvote) {
            await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" - 1 WHERE "UUID" = ?`, [UUID]);
        } else {
            await db.prepare("run", `UPDATE "casualVotes" SET "downvotes" = "downvotes" - 1 WHERE "UUID" = ?`, [UUID]);
        }

        await privateDB.prepare("run", `DELETE FROM "casualVotes" WHERE "UUID" = ?`, [existingVote.UUID]);
    }

    await privateDB.prepare("run", `INSERT INTO "casualVotes" ("videoID", "service", "userID", "hashedIP", "category", "type", "timeSubmitted") VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [videoID, service, hashedUserID, hashedIP, category, voteType, now]);

    return false;
}
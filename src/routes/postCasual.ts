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
import { canVote } from "../utils/permissions";

interface ExistingVote {
    UUID: BrandingUUID;
    type: number;
}

export async function postCasual(req: Request, res: Response) {
    const { videoID, userID, downvote } = req.body as CasualVoteSubmission;
    let categories = req.body.categories as CasualCategory[];
    const title = (req.body.title as string)?.toLowerCase();
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

        if (!await canVote(hashedUserID)) {
            res.status(200).send("OK");
        }

        const lock = await acquireLock(`postCasual:${videoID}.${hashedUserID}`);
        if (!lock.status) {
            res.status(429).send("Vote already in progress");
            return;
        }

        if (isBanned) {
            return res.status(200).send("OK");
        }

        let titleID = 0;
        if (title) {
            // See if title needs to be added
            const titles = await db.prepare("all", `SELECT "title", "id" from "casualVoteTitles" WHERE "videoID" = ? AND "service" = ? ORDER BY "id"`, [videoID, service]) as { title: string, id: number }[];
            if (titles.length > 0) {
                const existingTitle = titles.find((t) => t.title === title);
                if (existingTitle) {
                    titleID = existingTitle.id;
                } else {
                    titleID = titles[titles.length - 1].id + 1;
                    await db.prepare("run", `INSERT INTO "casualVoteTitles" ("videoID", "service", "hashedVideoID", "id", "title") VALUES (?, ?, ?, ?, ?)`, [videoID, service, hashedVideoID, titleID, title]);
                }
            } else {
                await db.prepare("run", `INSERT INTO "casualVoteTitles" ("videoID", "service", "hashedVideoID", "id", "title") VALUES (?, ?, ?, ?, ?)`, [videoID, service, hashedVideoID, titleID, title]);
            }
        } else {
            const titles = await db.prepare("all", `SELECT "title", "id" from "casualVoteTitles" WHERE "videoID" = ? AND "service" = ? ORDER BY "id"`, [videoID, service]) as { title: string, id: number }[];
            if (titles.length > 0) {
                titleID = titles[titles.length - 1].id;
            }
        }

        const now = Date.now();
        for (const category of categories) {
            const existingUUID = (await db.prepare("get", `SELECT "UUID" from "casualVotes" where "videoID" = ? AND "service" = ? AND "titleID" = ? AND "category" = ?`, [videoID, service, titleID, category]))?.UUID;
            const UUID = existingUUID || crypto.randomUUID();

            const alreadyVotedTheSame = await handleExistingVotes(videoID, service, titleID, hashedUserID, hashedIP, category, downvote, now);
            if (existingUUID) {
                if (!alreadyVotedTheSame) {
                    await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" + 1 WHERE "UUID" = ?`, [UUID]);
                }
            } else {
                await db.prepare("run", `INSERT INTO "casualVotes" ("videoID", "service", "titleID", "hashedVideoID", "timeSubmitted", "UUID", "category", "upvotes") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [videoID, service, titleID, hashedVideoID, now, UUID, category, 1]);
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

async function handleExistingVotes(videoID: VideoID, service: Service, titleID: number,
    hashedUserID: HashedUserID, hashedIP: HashedIP, category: CasualCategory, downvote: boolean, now: number): Promise<boolean> {
    const existingVote = await privateDB.prepare("get", `SELECT "UUID" from "casualVotes" WHERE "videoID" = ? AND "service" = ? AND "titleID" = ? AND "userID" = ? AND "category" = ?`, [videoID, service, titleID, hashedUserID, category]) as ExistingVote;
    if (existingVote) {
        return true;
    } else {
        if (downvote) {
            // Remove upvotes for all categories on this video
            const existingUpvotes = await privateDB.prepare("all", `SELECT "category" from "casualVotes" WHERE "category" != 'downvote' AND "videoID" = ? AND "service" = ? AND "titleID" = ? AND "userID" = ?`, [videoID, service, titleID, hashedUserID]);
            for (const existingUpvote of existingUpvotes) {
                await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" - 1 WHERE "videoID" = ? AND "service" = ? AND "titleID" = ? AND "category" = ?`, [videoID, service, titleID, existingUpvote.category]);
                await privateDB.prepare("run", `DELETE FROM "casualVotes" WHERE "videoID" = ? AND "service" = ? AND "titleID" = ? AND "userID" = ? AND "category" = ?`, [videoID, service, titleID, hashedUserID, existingUpvote.category]);
            }
        } else {
            // Undo a downvote if it exists
            const existingDownvote = await privateDB.prepare("get", `SELECT "UUID" from "casualVotes" WHERE "category" = 'downvote' AND "videoID" = ? AND "service" = ? AND "titleID" = ? AND "userID" = ?`, [videoID, service, titleID, hashedUserID]) as ExistingVote;
            if (existingDownvote) {
                await db.prepare("run", `UPDATE "casualVotes" SET "upvotes" = "upvotes" - 1 WHERE "category" = 'downvote' AND "videoID" = ? AND "service" = ? AND "titleID" = ?`, [videoID, service, titleID]);
                await privateDB.prepare("run", `DELETE FROM "casualVotes" WHERE "category" = 'downvote' AND "videoID" = ? AND "service" = ? AND "titleID" = ? AND "userID" = ?`, [videoID, service, titleID, hashedUserID]);
            }
        }
    }

    await privateDB.prepare("run", `INSERT INTO "casualVotes" ("videoID", "service", "titleID", "userID", "hashedIP", "category", "timeSubmitted") VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [videoID, service, titleID, hashedUserID, hashedIP, category, now]);

    return false;
}
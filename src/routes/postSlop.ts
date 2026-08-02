import { Request, Response } from "express";
import { config } from "../config";

import { db } from "../databases/databases";
import { IPAddress } from "../types/segments.model";
import { modifyBloomFilters } from "../utils/bloomFilter";
import { checkBanStatus } from "../utils/checkBan";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { isUserVIP } from "../utils/isUserVIP";
import { Logger } from "../utils/logger";
import { acquireLock } from "../utils/redisLock";
import { isRequestInvalid } from "../utils/requestValidator";
import { parseUserAgent } from "../utils/userAgent";
import { SlopSubmission } from "../types/slop.model";
import { QueryCacher } from "../utils/queryCacher";
import { slopVoteIDToNames, slopVoteNamesToID } from "../utils/slop";

export async function postSlop(req: Request, res: Response) {
    const { userID, contentID, profileID, comment, rating, votes, wholeProfile } = req.body as SlopSubmission;
    const userAgent = req.body.userAgent ?? parseUserAgent(req.get("user-agent")) ?? "";

    if (!contentID || !userID || userID.length < 30 || votes.some((v) => slopVoteNamesToID[v] === undefined || v === "rating")) {
        res.status(400).send("Bad Request");
        return;
    }

    try {
        const hashedUserID = await getHashCache(userID);
        // todo: use isvip for all human box only
        const isVip = await isUserVIP(hashedUserID);
        const hashedContentID = await getHashCache(contentID, 1);
        const hashedProfileID = profileID ? await getHashCache(profileID, 1) : null;
        const hashedIP = await getHashCache(getIP(req) + config.globalSalt as IPAddress);
        const isBanned = await checkBanStatus(hashedUserID, hashedIP);

        const matchedRule = isRequestInvalid({
            userAgent,
            userAgentHeader: req.headers["user-agent"],
            userID,
            endpoint: "slop-postSlop",
        });
        if (matchedRule !== null) {
            //todo: add webhook
            // sendNewUserWebhook(config.discordRejectedNewUserWebhookURL, hashedUserID, videoID, userAgent, req, videoDuration, title, `Caught by rule: ${matchedRule}`);
            Logger.warn(`Slop submission rejected by request validator: ${hashedUserID} ${contentID} ${userAgent} ${req.headers["user-agent"]}`);
            res.status(200).send("OK");
            return;
        }

        // todo: handle bans
        // const permission = isBanned ? {
        //     canSubmit: true,
        //     newUser: false,
        //     reason: "",
        // } : await canSubmitDeArrow(hashedUserID);
        // if (!permission.canSubmit) {
        //     Logger.warn(`New user trying to submit dearrow: ${hashedUserID} ${videoID} ${videoDuration} ${Object.keys(req.body)} ${userAgent} ${title?.title} ${req.headers["user-agent"]}`);

        //     res.status(403).send(permission.reason);
        //     return;
        // } else if (permission.newUser) {
        //     sendNewUserWebhook(config.discordNewUserWebhookURL, hashedUserID, videoID, userAgent, req, videoDuration, title, undefined);
        // }

        const lock = await acquireLock(`postSlop:${contentID}.${hashedUserID}`);
        if (!lock.status) {
            res.status(429).send("Vote already in progress");
            return;
        }

        const now = Date.now();

        // Add seperate rating vote to store these
        if (comment || rating) {
            votes.push("rating");
        }

        const existingVotes = await db.prepare("all", `SELECT "id", "UUID", "wholeProfile" FROM "slopVoteSubmissions" WHERE "contentID" = ? AND "userID" = ?`
            , [contentID, hashedUserID]
        );

        for (const voteType of votes) {
            const isRating = voteType === "rating";
            const voteId = slopVoteNamesToID[voteType];
            const votedBefore = existingVotes.some((v) => v.id === voteId);

            if (voteId && !votedBefore) {
                const UUID = crypto.randomUUID();
                await db.prepare("run", `INSERT INTO "slopVoteSubmissions" ("UUID", "contentID", "userID", "hashedIP", "id", "comment", "rating", "wholeProfile", "timeSubmitted") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    , [UUID, contentID, hashedUserID, hashedIP, voteId, isRating ? comment : null, isRating ? rating : null, wholeProfile, now]);

                if (!isRating) {
                    const wholeProfileIncreaseValue = wholeProfile ? 1 : 0;

                    await db.prepare("run", `INSERT INTO "slopVotes" ("contentID", "profileID", "id", "hashedContentID", "hashedProfileID", "count", "wholeProfile")
                        VALUES (?, ?, ?, ?, ?, 1, ?)
                        ON CONFLICT ("contentID", "id")
                        DO UPDATE SET
                            "count" = "slopVotes"."count" + EXCLUDED."count",
                            "wholeProfile" = "slopVotes"."wholeProfile" + EXCLUDED."wholeProfile"`
                    , [contentID, profileID, voteId, hashedContentID, hashedProfileID, wholeProfileIncreaseValue]);
                }
            } else if (voteId && votedBefore && isRating) {
                // Update the comment or rating if there already was a submission
                await db.prepare("run", `UPDATE "slopVoteSubmissions"
                    SET "comment" = ?, "rating" = ?
                    WHERE "contentID" = ? AND "userID" = ? AND "id" = ?`
                , [comment, rating, contentID, hashedUserID, voteId]);
            }
        }

        for (const vote of existingVotes) {
            const isRating = vote.id === 30;
            if (!votes.includes(slopVoteIDToNames[vote.id])) {
                await db.prepare("run", `DELETE FROM "slopVoteSubmissions" WHERE "contentID" = ? AND "userID" = ? AND "id" = ?`
                    , [contentID, hashedUserID, vote.id]
                );

                if (!isRating) {
                    await db.prepare("run", `UPDATE "slopVotes"
                        SET "count" = "count" - 1,
                            "wholeProfile" = "wholeProfile" - ?
                        WHERE "contentID" = ? AND "id" = ?`
                    , [vote.wholeProfile ? 1 : 0, contentID, vote.id]);

                    const newVoteCount = (await db.prepare("get", `SELECT "count" FROM "slopVotes"
                            WHERE "contentID" = ? AND "id" = ?`
                    , [contentID, vote.id]))?.count;
                    if (newVoteCount <= 0) {
                        await db.prepare("run", `DELETE FROM "slopVotes"
                            WHERE "contentID" = ? AND "id" = ?`
                        , [contentID, vote.id]);
                    }
                }
            }
        }

        await modifyBloomFilters(contentID, profileID);

        QueryCacher.clearSlopCache({ contentID, hashedContentID, profileID, hashedProfileID });
        res.status(200).send("OK");

        lock.unlock();
    } catch (e) {
        Logger.error(e as string);
        res.status(500).send("Internal Server Error");
    }
}
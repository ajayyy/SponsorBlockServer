import { db, privateDB } from "../../databases/databases";
import { getHash } from "../../utils/getHash";
import { getHashCache } from "../../utils/getHashCache";
import { Logger } from "../../utils/logger";
import { Request, Response } from "express";
import { HashedUserID, UserID } from "../../types/user.model";
import { HashedIP, IPAddress, VideoID } from "../../types/segments.model";
import { getIP } from "../../utils/getIP";
import { getService } from "../../utils/getService";
import { RatingType, RatingTypes } from "../../types/ratings.model";
import { config } from "../../config";
import { QueryCacher } from "../../utils/queryCacher";

export async function postRating(req: Request, res: Response): Promise<Response> {
    const privateUserID = req.body.userID as UserID;
    const videoID = req.body.videoID as VideoID;
    const service = getService(req.query.service, req.body.service);
    const type = req.body.type as RatingType;
    const enabled = req.body.enabled ?? true;

    if (privateUserID == undefined || videoID == undefined || service == undefined || type == undefined
          || (typeof privateUserID !== "string") || (typeof videoID !== "string") || (typeof service !== "string")
          || (typeof type !== "number") || (enabled && (typeof enabled !== "boolean")) || !RatingTypes.includes(type)) {
        //invalid request
        return res.sendStatus(400);
    }

    const hashedIP: HashedIP = getHash(getIP(req) + config.globalSalt as IPAddress, 1);
    const hashedUserID: HashedUserID = await getHashCache(privateUserID);
    const hashedVideoID = getHash(videoID, 1);

    try {
        // Check if this user has voted before
        const existingVote = await privateDB.prepare("get", `SELECT count(*) as "count" FROM "ratings" WHERE "videoID" = ? AND "service" = ? AND "type" = ? AND "userID" = ?`, [videoID, service, type, hashedUserID]);
        if (existingVote.count > 0 && !enabled) {
            // Undo the vote
            await db.prepare("run", `UPDATE "ratings" SET "count" = "count" - 1 WHERE "videoID" = ? AND "service" = ? AND type = ?`, [videoID, service, type]);
            await privateDB.prepare("run", `DELETE FROM "ratings" WHERE "videoID" = ? AND "service" = ? AND "type" = ? AND "userID" = ?`, [videoID, service, type, hashedUserID]);
        } else if (existingVote.count === 0 && enabled) {
            // Make sure there hasn't been another vote from this IP
            const existingIPVote = (await privateDB.prepare("get", `SELECT count(*) as "count" FROM "ratings" WHERE "videoID" = ? AND "service" = ? AND "type" = ? AND "hashedIP" = ?`, [videoID, service, type, hashedIP]))
                .count > 0;
            if (existingIPVote) { // if exisiting vote, exit early instead
                return res.sendStatus(200);
            }
            // Check if general rating already exists, if so increase it
            const rating = await db.prepare("get", `SELECT count(*) as "count" FROM "ratings" WHERE "videoID" = ? AND "service" = ? AND type = ?`, [videoID, service, type]);
            if (rating.count > 0) {
                await db.prepare("run", `UPDATE "ratings" SET "count" = "count" + 1 WHERE "videoID" = ? AND "service" = ? AND type = ?`, [videoID, service, type]);
            } else {
                await db.prepare("run", `INSERT INTO "ratings" ("videoID", "service", "type", "count", "hashedVideoID") VALUES (?, ?, ?, 1, ?)`, [videoID, service, type, hashedVideoID]);
            }

            // Create entry in privateDB
            await privateDB.prepare("run", `INSERT INTO "ratings" ("videoID", "service", "type", "userID", "timeSubmitted", "hashedIP") VALUES (?, ?, ?, ?, ?, ?)`, [videoID, service, type, hashedUserID, Date.now(), hashedIP]);
        }
        // clear rating cache
        QueryCacher.clearRatingCache({ hashedVideoID, service });
        return res.sendStatus(200);
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}
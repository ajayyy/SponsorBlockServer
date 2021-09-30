import { Request, Response } from "express";
import { db } from "../databases/databases";
import { getService } from "../utils/getService";
import { Logger } from "../utils/logger";

/**
 * Optional API method that will be used temporarily to help collect
 * unlisted videos created before 2017
 *
 * https://support.google.com/youtube/answer/9230970
 */

export function addUnlistedVideo(req: Request, res: Response): Response {
    const videoID = req.body.videoID;
    const year = req.body.year || 0;
    const views = req.body.views || 0;
    const channelID = req.body.channelID || "Unknown";
    const service = getService(req.body.service);

    if (videoID === undefined || typeof(videoID) !== "string" || videoID.length !== 11) {
        return res.status(400).send("Invalid parameters");
    }

    try {
        const timeSubmitted = Date.now();
        db.prepare("run", `INSERT INTO "unlistedVideos" ("videoID", "year", "views", "channelID", "timeSubmitted", "service") values (?, ?, ?, ?, ?, ?)`, [videoID, year, views, channelID, timeSubmitted, service]);
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }

    return res.sendStatus(200);
}
import {Request, Response} from "express";
import { db } from "../databases/databases";
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

    if (videoID === undefined || typeof(videoID) !== "string" || videoID.length !== 11) {
        return res.status(400).send("Invalid parameters");
    }

    try {
        const timeSubmitted = Date.now();
        db.prepare("run", `INSERT INTO "unlistedVideos" ("videoID", "year", "views", "channelID", "timeSubmitted") values (?, ?, ?, ?, ?)`, [videoID, year, views, channelID, timeSubmitted]);
    } catch (err) {
        Logger.error(err);
        return res.sendStatus(500);
    }

    return res.sendStatus(200);
}
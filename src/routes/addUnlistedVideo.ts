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

export async function addUnlistedVideo(req: Request, res: Response): Promise<Response> {
    const {
        body: {
            videoID = null,
            year = 0,
            views = 0,
            channelID = "Unknown",
            service
        }
    } = req;

    if (typeof(videoID) !== "string" || videoID.length !== 11) {
        return res.status(400).send("Invalid parameters");
    }

    try {
        const timeSubmitted = Date.now();
        await db.prepare(
            "run",
            `INSERT INTO "unlistedVideos" ("videoID", "year", "views", "channelID", "timeSubmitted", "service") values (?, ?, ?, ?, ?, ?)`,
            [videoID, year, views, channelID, timeSubmitted, getService(service)]
        );

        return res.sendStatus(200);
    } catch (err) {
        Logger.error(err as string);
    }

    return res.sendStatus(500);
}

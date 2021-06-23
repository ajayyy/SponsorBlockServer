import { time } from 'console';
import {Request, Response} from 'express';
import { db } from '../databases/databases';
import { Logger } from '../utils/logger';

/**
 * Optional API method that will be used temporarily to help collect
 * unlisted videos created before 2017
 * 
 * https://support.google.com/youtube/answer/9230970
 */

export function addUnlistedVideo(req: Request, res: Response) {
    const videoID = req.body.videoID;
    console.log(req.body)

    if (videoID === undefined || typeof(videoID) !== "string" || videoID.length !== 11) {
        res.status(400).send("Invalid parameters");
        return;
    }

    try {
        const timeSubmitted = Date.now();
        db.prepare('run', `INSERT INTO "unlistedVideos" ("videoID", "timeSubmitted") values (?, ?)`, [videoID, timeSubmitted]);
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }

    res.sendStatus(200);
}
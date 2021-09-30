import { Logger } from "../utils/logger";
import { getHash } from "../utils/getHash";
import { isUserVIP } from "../utils/isUserVIP";
import { db } from "../databases/databases";
import { Request, Response } from "express";
import { VideoIDHash } from "../types/segments.model";
import { getService } from "../utils/getService";

export async function postLockCategories(req: Request, res: Response): Promise<string[]> {
    // Collect user input data
    const videoID = req.body.videoID;
    let userID = req.body.userID;
    const categories = req.body.categories;
    const reason: string = req.body.reason ?? "";
    const service = getService(req.body.service);

    // Check input data is valid
    if (!videoID
        || !userID
        || !categories
        || !Array.isArray(categories)
        || categories.length === 0
    ) {
        res.status(400).json({
            message: "Bad Format",
        });
        return;
    }

    // Check if user is VIP
    userID = getHash(userID);
    const userIsVIP = await isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({
            message: "Must be a VIP to mark videos.",
        });
        return;
    }

    // Get existing lock categories markers
    let noCategoryList = await db.prepare("all", 'SELECT "category" from "lockCategories" where "videoID" = ? AND "service" = ?', [videoID, service]);
    if (!noCategoryList || noCategoryList.length === 0) {
        noCategoryList = [];
    } else {
        noCategoryList = noCategoryList.map((obj: any) => {
            return obj.category;
        });
    }

    // get user categories not already submitted that match accepted format
    let filteredCategories = categories.filter((category) => {
        return !!category.match(/^[_a-zA-Z]+$/);
    });
    // remove any duplicates
    filteredCategories = filteredCategories.filter((category, index) => {
        return filteredCategories.indexOf(category) === index;
    });

    const categoriesToMark = filteredCategories.filter((category) => {
        return noCategoryList.indexOf(category) === -1;
    });

    // calculate hash of videoID
    const hashedVideoID: VideoIDHash = getHash(videoID, 1);

    // create database entry
    for (const category of categoriesToMark) {
        try {
            await db.prepare("run", `INSERT INTO "lockCategories" ("videoID", "userID", "category", "hashedVideoID", "reason", "service") VALUES(?, ?, ?, ?, ?, ?)`, [videoID, userID, category, hashedVideoID, reason, service]);
        } catch (err) {
            Logger.error(`Error submitting 'lockCategories' marker for category '${category}' for video '${videoID}' (${service})`);
            Logger.error(err as string);
            res.status(500).json({
                message: "Internal Server Error: Could not write marker to the database.",
            });
        }
    }

    // update reason for existed categories
    let overlapCategories = [];
    if (reason.length !== 0) {
        overlapCategories = filteredCategories.filter((category) => {
            return noCategoryList.indexOf(category) !== -1;
        });

        for (const category of overlapCategories) {
            try {
                await db.prepare("run",
                    'UPDATE "lockCategories" SET "reason" = ?, "userID" = ? WHERE "videoID" = ? AND "category" = ? AND "service" = ?',
                    [reason, userID, videoID, category, service]);
            } catch (err) {
                Logger.error(`Error submitting 'lockCategories' marker for category '${category}' for video '${videoID} (${service})'`);
                Logger.error(err as string);
                res.status(500).json({
                    message: "Internal Server Error: Could not write marker to the database.",
                });
            }
        }
    }

    res.status(200).json({
        submitted: [...categoriesToMark, ...overlapCategories],
    });
}

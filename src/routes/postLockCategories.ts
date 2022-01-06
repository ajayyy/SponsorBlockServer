import { Logger } from "../utils/logger";
import { getHashCache } from "../utils/getHashCache";
import { isUserVIP } from "../utils/isUserVIP";
import { db } from "../databases/databases";
import { Request, Response } from "express";
import { ActionType, Category, VideoIDHash } from "../types/segments.model";
import { getService } from "../utils/getService";

export async function postLockCategories(req: Request, res: Response): Promise<string[]> {
    // Collect user input data
    const videoID = req.body.videoID;
    let userID = req.body.userID;
    const categories = req.body.categories as Category[];
    const actionTypes = req.body.actionTypes as ActionType[] || [ActionType.Skip, ActionType.Mute];
    const reason: string = req.body.reason ?? "";
    const service = getService(req.body.service);

    // Check input data is valid
    if (!videoID
        || !userID
        || !categories
        || !Array.isArray(categories)
        || categories.length === 0
        || !Array.isArray(actionTypes)
        || actionTypes.length === 0
    ) {
        res.status(400).json({
            message: "Bad Format",
        });
        return;
    }

    // Check if user is VIP
    userID = await getHashCache(userID);
    const userIsVIP = await isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({
            message: "Must be a VIP to mark videos.",
        });
        return;
    }

    const existingLocks = (await db.prepare("all", 'SELECT "category", "actionType" from "lockCategories" where "videoID" = ? AND "service" = ?', [videoID, service])) as
                            { category: Category, actionType: ActionType }[];

    const filteredCategories = filterData(categories);
    const filteredActionTypes = filterData(actionTypes);

    const locksToApply: { category: Category, actionType: ActionType }[] = [];
    const overwrittenLocks: { category: Category, actionType: ActionType }[] = [];
    for (const category of filteredCategories) {
        for (const actionType of filteredActionTypes) {
            if (!existingLocks.some((lock) => lock.category === category && lock.actionType === actionType)) {
                locksToApply.push({
                    category,
                    actionType
                });
            } else {
                overwrittenLocks.push({
                    category,
                    actionType
                });
            }
        }
    }

    // calculate hash of videoID
    const hashedVideoID: VideoIDHash = await getHashCache(videoID, 1);

    // create database entry
    for (const lock of locksToApply) {
        try {
            await db.prepare("run", `INSERT INTO "lockCategories" ("videoID", "userID", "actionType", "category", "hashedVideoID", "reason", "service") VALUES(?, ?, ?, ?, ?, ?, ?)`, [videoID, userID, lock.actionType, lock.category, hashedVideoID, reason, service]);
        } catch (err) {
            Logger.error(`Error submitting 'lockCategories' marker for category '${lock.category}' and actionType '${lock.actionType}' for video '${videoID}' (${service})`);
            Logger.error(err as string);
            res.status(500).json({
                message: "Internal Server Error: Could not write marker to the database.",
            });
        }
    }

    // update reason for existed categories
    if (reason.length !== 0) {
        for (const lock of overwrittenLocks) {
            try {
                await db.prepare("run",
                    'UPDATE "lockCategories" SET "reason" = ?, "userID" = ? WHERE "videoID" = ? AND "actionType" = ? AND "category" = ? AND "service" = ?',
                    [reason, userID, videoID, lock.actionType, lock.category, service]);
            } catch (err) {
                Logger.error(`Error submitting 'lockCategories' marker for category '${lock.category}' and actionType '${lock.actionType}' for video '${videoID}' (${service})`);
                Logger.error(err as string);
                res.status(500).json({
                    message: "Internal Server Error: Could not write marker to the database.",
                });
            }
        }
    }

    res.status(200).json({
        submitted: reason.length === 0
            ? [...filteredCategories.filter(((category) => locksToApply.some((lock) => category === lock.category)))]
            : [...filteredCategories], // Legacy
        submittedValues: [...locksToApply, ...overwrittenLocks],
    });
}

function filterData<T extends string>(data: T[]): T[] {
    // get user categories not already submitted that match accepted format
    const filtered = data.filter((elem) => {
        return !!elem.match(/^[_a-zA-Z]+$/);
    });
    // remove any duplicates
    return filtered.filter((elem, index) => {
        return filtered.indexOf(elem) === index;
    });
}

import { Logger } from "../utils/logger";
import { getHashCache } from "../utils/getHashCache";
import { isUserVIP } from "../utils/isUserVIP";
import { db } from "../databases/databases";
import { Request, Response } from "express";
import { ActionType, Category, VideoIDHash } from "../types/segments.model";
import { getService } from "../utils/getService";
import { config } from "../config";

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
            message: "Must be a VIP to lock videos.",
        });
        return;
    }

    const existingLocks = (await db.prepare("all", 'SELECT "category", "actionType" from "lockCategories" where "videoID" = ? AND "service" = ?', [videoID, service])) as
                            { category: Category, actionType: ActionType }[];

    const locksToApply: { category: Category, actionType: ActionType }[] = [];
    const overwrittenLocks: { category: Category, actionType: ActionType }[] = [];

    // push new/ existing locks
    const validLocks = createLockArray(categories, actionTypes);
    for (const { category, actionType } of validLocks) {
        const targetArray = existingLocks.some((lock) => lock.category === category && lock.actionType === actionType)
            ? overwrittenLocks
            : locksToApply;
        targetArray.push({
            category, actionType
        });
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
        submitted: deDupArray(validLocks.map(e => e.category)),
        submittedValues: validLocks,
    });
}

const isValidCategoryActionPair = (category: Category, actionType: ActionType): boolean =>
    config.categorySupport?.[category]?.includes(actionType);

// filter out any invalid category/action pairs
type validLockArray = { category: Category, actionType: ActionType }[];
const createLockArray = (categories: Category[], actionTypes: ActionType[]): validLockArray => {
    const validLocks: validLockArray = [];
    categories.forEach(category => {
        if (category === "poi_highlight") validLocks.push({ category, actionType: ActionType.Poi });
        actionTypes.forEach(actionType => {
            if (isValidCategoryActionPair(category, actionType)) {
                validLocks.push({ category, actionType });
            }
        });
    });
    return validLocks;
};

const deDupArray = (arr: any[]): any[] => [...new Set(arr)];
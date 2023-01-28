import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";
import { Category, VideoID, ActionType } from "../types/segments.model";
import { filterInvalidCategoryActionType, parseActionTypes, parseCategories } from "../utils/parseParams";

interface lockArray {
    category: Category;
    locked: number,
    reason: string,
    userID: string,
    userName: string,
}

export async function getLockReason(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    const actionTypes = parseActionTypes(req, [ActionType.Skip, ActionType.Mute]);
    const categories = parseCategories(req, []);

    // invalid requests
    const errors = [];
    if (!videoID) errors.push("No videoID provided");
    if (!Array.isArray(actionTypes)) errors.push("actionTypes parameter does not match format requirements");
    if (!Array.isArray(categories)) errors.push("Categories parameter does not match format requirements.");
    if (errors.length) return res.status(400).send(errors.join(", "));
    // only take valid categories
    const searchCategories = filterInvalidCategoryActionType(categories, actionTypes);

    try {
        // Get existing lock categories markers
        const row = await db.prepare("all", 'SELECT "category", "reason", "actionType", "userID" from "lockCategories" where "videoID" = ?', [videoID]) as {category: Category, reason: string, actionType: ActionType, userID: string }[];
        // map to object array
        const locks = [];
        const userIDs = new Set();
        // get all locks for video, check if requested later
        for (const lock of row) {
            if (actionTypes.includes(lock.actionType))
                locks.push({
                    category: lock.category,
                    locked: 1,
                    reason: lock.reason,
                    userID: lock?.userID || "",
                    userName: "",
                } as lockArray);
            userIDs.add(lock.userID);
        }
        // all userName from userIDs
        const userNames = await db.prepare(
            "all",
            `SELECT "userName", "userID" FROM "userNames" WHERE "userID" IN (${Array.from("?".repeat(userIDs.size)).join()}) LIMIT ?`,
            [...userIDs, userIDs.size]
        ) as { userName: string, userID: string }[];

        const results = [];
        for (const category of searchCategories)  {
            const lock = locks.find(l => l.category === category);
            if (lock?.userID) {
                // mapping userName to locks
                const user = userNames.find(u => u.userID === lock.userID);
                lock.userName = user?.userName || "";
                results.push(lock);
            } else {
                // add empty locks for categories requested but not locked
                results.push({
                    category,
                    locked: 0,
                    reason: "",
                    userID: "",
                    userName: "",
                } as lockArray);
            }
        }

        return res.send(results);
    } catch (err) /* istanbul ignore next */ {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

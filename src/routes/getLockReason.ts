import {db} from "../databases/databases";
import {Logger} from "../utils/logger";
import {Request, Response} from "express";
import { Category, VideoID } from "../types/segments.model";
import {config} from "../config";

const possibleCategoryList = config.categoryList;
interface lockArray {
    category: Category;
    locked: number,
    reason: string
}

export async function getLockReason(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    let categories: Category[] = [];
    try {
        categories = req.query.categories
            ? JSON.parse(req.query.categories as string)
            : req.query.category
                ? Array.isArray(req.query.category)
                    ? req.query.category
                    : [req.query.category]
                : []; // default to empty, will be set to all
        if (!Array.isArray(categories)) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        }
    } catch(error) {
        return res.status(400).send("Bad parameter: categories (invalid JSON)");
    }
    // only take valid categories
    const searchCategories = (categories.length === 0 ) ? possibleCategoryList : categories.filter(x => possibleCategoryList.includes(x));

    if (videoID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        // Get existing lock categories markers
        const row = await db.prepare("all", 'SELECT "category", "reason" from "lockCategories" where "videoID" = ?', [videoID]) as {category: Category, reason: string}[];
        // map to object array
        const locks = [];
        const lockedCategories = [] as string[];
        // get all locks for video, check if requested later
        for (const lock of row) {
            locks.push({
                category: lock.category,
                locked: 1,
                reason: lock.reason
            } as lockArray);
            lockedCategories.push(lock.category);
        }
        // add empty locks for categories requested but not locked
        const noLockCategories = searchCategories.filter(x => !lockedCategories.includes(x));
        for (const noLock of noLockCategories) {
            locks.push({
                category: noLock,
                locked: 0,
                reason: ""
            } as lockArray);
        }
        // return real and fake locks that were requested
        const filtered = locks.filter(lock => searchCategories.includes(lock.category));
        return res.send(filtered);
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

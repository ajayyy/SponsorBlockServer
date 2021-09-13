import {db} from "../databases/databases";
import {Logger} from "../utils/logger";
import {Request, Response} from "express";
import { Category, VideoID } from "../types/segments.model";
import {config} from "../config";

export async function getLockCategories(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    let categories: Category[] = [];
    try {
        categories = req.query.categories
            ? JSON.parse(req.query.categories as string)
            : req.query.category
                ? Array.isArray(req.query.category)
                    ? req.query.category
                    : [req.query.category]
                : ["sponsor"];
        if (!Array.isArray(categories)) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        }
    } catch(error) {
        return res.status(400).send("Bad parameter: categories (invalid JSON)");
    }

    if (videoID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        // Get existing lock categories markers
        const row = await db.prepare("all", 'SELECT "category", "reason" from "lockCategories" where "videoID" = ?', [videoID]) as {category: Category, reason: string}[];
        // map to object array
        const locks = [];
        for (const lock of row) {
            locks.push({
                category: lock.category,
                locked: 1,
                reason: lock.reason
            });
        }
        const notLocked = categories.filter(reqCategory => config.categoryList.includes(reqCategory));
        for (const noLock of notLocked) {
            locks.push({
                category: noLock,
                locked: 0,
                reason: ""
            });
        }
        const filtered = locks.filter(lock => categories.includes(lock.category));
        return res.send(...filtered, ...notLocked );
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

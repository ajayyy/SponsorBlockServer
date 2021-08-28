import {db} from "../databases/databases";
import {Logger} from "../utils/logger";
import {Request, Response} from "express";
import { Category, VideoID } from "../types/segments.model";

export async function getLockCategories(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;

    if (videoID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        // Get existing lock categories markers
        const row = await db.prepare("all", 'SELECT "category", "reason" from "lockCategories" where "videoID" = ?', [videoID]) as {category: Category, reason: string}[];
        // map categories to array in JS becaues of SQL incompatibilities
        const categories = row.map(item => item.category);
        if (categories.length === 0 || !categories[0]) return res.sendStatus(404);
        // Get longest lock reason
        const reason = row.map(item => item.reason)
            .reduce((a,b) => (a.length > b.length) ? a : b);
        return res.send({
            reason,
            categories
        });
    } catch (err) {
        Logger.error(err);
        return res.sendStatus(500);
    }
}

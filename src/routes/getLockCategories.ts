import {db} from '../databases/databases';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';
import { Category, VideoID } from "../types/segments.model";

export async function getLockCategories(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;

    if (videoID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        // Get existing lock categories markers
        const lockedCategories = await db.prepare('all', 'SELECT "category" from "lockCategories" where "videoID" = ?', [videoID]) as {category: Category}[];
        if (lockedCategories.length === 0 || !lockedCategories[0]) return res.sendStatus(404);
        // map to array in JS becaues of SQL incompatibilities
        const categories = Object.values(lockedCategories).map((entry) => entry.category);
        return res.send({
            categories
        });
    } catch (err) {
        Logger.error(err);
        return res.sendStatus(500);
    }
}

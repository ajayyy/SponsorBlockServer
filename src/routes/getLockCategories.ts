import {db} from '../databases/databases';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';
import { Category, VideoID } from "../types/segments.model";
import { UserID } from '../types/user.model';

export async function getLockCategories(req: Request, res: Response) {
    const videoID = req.query.videoID as VideoID;

    if (videoID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        // Get existing lock categories markers
        let lockCategoryList = await db.prepare('all', 'SELECT "category", "userID" from "lockCategories" where "videoID" = ?', [videoID]) as {category: Category, userID: UserID}[]
        if (lockCategoryList.length === 0 || !lockCategoryList[0]) {
            return res.sendStatus(404);
        } else {
            return res.send(lockCategoryList)
        }
    } catch (err) {
        Logger.error(err);
        return res.sendStatus(500);
    }
}

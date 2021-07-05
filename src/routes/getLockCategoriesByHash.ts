import {db} from '../databases/databases';
import {Logger} from '../utils/logger';
import {Request, Response} from 'express';
import {hashPrefixTester} from '../utils/hashPrefixTester';
import { Category, VideoID, VideoIDHash } from "../types/segments.model";
import { UserID } from '../types/user.model';

export async function getLockCategoriesByHash(req: Request, res: Response): Promise<Response> {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    try {
        // Get existing lock categories markers
        const lockCategoryList = await db.prepare('all', 'SELECT * from "lockCategories" where "hashedVideoID" LIKE ? ORDER BY videoID', [hashPrefix + '%']) as {videoID: VideoID, userID: UserID,category: Category}[];
        if (lockCategoryList.length === 0 || !lockCategoryList[0]) {
            return res.sendStatus(404);
        } else {
            return res.send(lockCategoryList);
        }
    } catch (err) {
        Logger.error(err);
        return res.sendStatus(500);
    }
}

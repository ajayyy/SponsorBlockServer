import {db} from "../databases/databases";
import {Logger} from "../utils/logger";
import {Request, Response} from "express";
import {hashPrefixTester} from "../utils/hashPrefixTester";
import { Category, VideoID, VideoIDHash } from "../types/segments.model";

interface LockResultByHash {
    videoID: VideoID,
    hash: VideoIDHash,
    categories: Category[]
}

interface DBLock {
    videoID: VideoID,
    hash: VideoIDHash,
    category: Category
}

const mergeLocks = (source: DBLock[]) => {
    const dest: LockResultByHash[] = [];
    for (const obj of source) {
        // videoID already exists
        const destMatch = dest.find(s => s.videoID === obj.videoID);
        if (destMatch) {
            // push to categories
            destMatch.categories.push(obj.category);
        } else {
            dest.push({
                videoID: obj.videoID,
                hash: obj.hash,
                categories: [obj.category]
            });
        }
    }
    return dest;
};


export async function getLockCategoriesByHash(req: Request, res: Response): Promise<Response> {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    try {
        // Get existing lock categories markers
        const lockedRows = await db.prepare("all", 'SELECT "videoID", "hashedVideoID" as "hash", "category" from "lockCategories" where "hashedVideoID" LIKE ?', [`${hashPrefix}%`]) as DBLock[];
        if (lockedRows.length === 0 || !lockedRows[0]) return res.sendStatus(404);
        // merge all locks
        return res.send(mergeLocks(lockedRows));
    } catch (err) {
        Logger.error(err);
        return res.sendStatus(500);
    }
}

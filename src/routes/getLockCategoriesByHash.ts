import { db } from "../databases/databases.js";
import { Logger } from "../utils/logger.js";
import { Request, Response } from "express";
import { hashPrefixTester } from "../utils/hashPrefixTester.js";
import { Category, VideoID, VideoIDHash } from "../types/segments.model.js";

interface LockResultByHash {
    videoID: VideoID,
    hash: VideoIDHash,
    reason: string,
    categories: Category[]
}

interface DBLock {
    videoID: VideoID,
    hash: VideoIDHash,
    category: Category,
    reason: string,
}

const mergeLocks = (source: DBLock[]) => {
    const dest: LockResultByHash[] = [];
    for (const obj of source) {
        // videoID already exists
        const destMatch = dest.find(s => s.videoID === obj.videoID);
        if (destMatch) {
            // override longer reason
            if (obj.reason?.length > destMatch.reason?.length) destMatch.reason = obj.reason;
            // push to categories
            destMatch.categories.push(obj.category);
        } else {
            dest.push({
                videoID: obj.videoID,
                hash: obj.hash,
                reason: obj.reason,
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
        const lockedRows = await db.prepare("all", 'SELECT "videoID", "hashedVideoID" as "hash", "category", "reason" from "lockCategories" where "hashedVideoID" LIKE ?', [`${hashPrefix}%`]) as DBLock[];
        if (lockedRows.length === 0 || !lockedRows[0]) return res.sendStatus(404);
        // merge all locks
        return res.send(mergeLocks(lockedRows));
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Response } from "express";
import { hashPrefixTester } from "../utils/hashPrefixTester";
import { Category, VideoID, VideoIDHash } from "../types/segments.model";
import { APIRequest } from "../types/APIRequest";

interface DBLock {
    videoID: VideoID,
    hash: VideoIDHash,
    category: Category,
    reason: string,
}

interface LockResultByHash extends Omit<DBLock, "category"> {
    categories: Category[];
}

const mergeLocks = (source: DBLock[]) : LockResultByHash[]=> {
    const dest: { [videoID: VideoID]: LockResultByHash } = {};
    for (const { videoID, reason, hash, category } of source) {
        // videoID already exists
        if (videoID in dest) {
            // override longer reason
            const destMatch = dest[videoID];
            destMatch.reason = (reason?.length > destMatch.reason?.length) ? reason : destMatch.reason;
            // push to categories
            destMatch.categories.push(category);
        } else {
            dest[videoID] = {
                videoID,
                hash,
                reason,
                categories: [category]
            };
        }
    }

    return Object.values(dest);
};

export async function getLockCategoriesByHash(req: APIRequest, res: Response): Promise<Response> {
    let { params: { prefix: hashPrefix } }= req;
    if (!hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as APIRequest["params"]["prefix"];

    try {
        // Get existing lock categories markers
        const lockedRows = await db.prepare("all", 'SELECT "videoID", "hashedVideoID" as "hash", "category", "reason" from "lockCategories" where "hashedVideoID" LIKE ?', [`${hashPrefix}%`]) as DBLock[];
        if (lockedRows.length === 0) {
            return res.sendStatus(404);
        }

        // merge all locks
        return res.send(mergeLocks(lockedRows));
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

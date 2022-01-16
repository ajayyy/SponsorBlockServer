import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";
import { hashPrefixTester } from "../utils/hashPrefixTester";
import { ActionType, Category, VideoID, VideoIDHash } from "../types/segments.model";

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
    actionType: ActionType,
}

const mergeLocks = (source: DBLock[], actionTypes: ActionType[]): LockResultByHash[] => {
    const dest: { [videoID: VideoID]: LockResultByHash } = {};
    for (const obj of source) {
        if (!actionTypes.includes(obj.actionType)) continue;
        // videoID already exists
        if (obj.videoID in dest) {
            // override longer reason
            const destMatch = dest[obj.videoID];
            if (obj.reason?.length > destMatch.reason?.length) destMatch.reason = obj.reason;
            // push to categories
            destMatch.categories.push(obj.category);
        } else {
            dest[obj.videoID] = {
                videoID: obj.videoID,
                hash: obj.hash,
                reason: obj.reason,
                categories: [obj.category]
            };
        }
    }
    return Object.values(dest);
};

export async function getLockCategoriesByHash(req: Request, res: Response): Promise<Response> {
    let hashPrefix = req.params.prefix as VideoIDHash;
    const actionTypes = req.query.actionTypes as ActionType[] || [ActionType.Mute, ActionType.Skip];
    if (!hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    try {
        // Get existing lock categories markers
        const lockedRows = await db.prepare("all", 'SELECT "videoID", "hashedVideoID" as "hash", "category", "reason", "actionType" from "lockCategories" where "hashedVideoID" LIKE ?', [`${hashPrefix}%`]) as DBLock[];
        if (lockedRows.length === 0 || !lockedRows[0]) return res.sendStatus(404);
        // merge all locks
        return res.send(mergeLocks(lockedRows, actionTypes));
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

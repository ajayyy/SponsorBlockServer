import { Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { getHash } from "../utils/getHash";
import { db } from "../databases/databases";
import { Category, Service, VideoID } from "../types/segments.model";
import { getService } from "../utils/getService";
import { APIRequest } from "../types/APIRequest";

export async function deleteLockCategoriesEndpoint(req: APIRequest, res: Response): Promise<Response> {
    // Collect user input data
    const {
        body: {
            videoID,
            userID,
            categories,
            service
        }
    } = req;

    // Check input data is valid
    if (!videoID
        || !userID
        || !categories
        || !Array.isArray(categories)
        || categories.length === 0
    ) {
        return res.status(400).json({
            message: "Bad Format",
        });
    }

    // Check if user is VIP
    const hashedUserID = getHash(userID);
    const userIsVIP = await isUserVIP(hashedUserID);

    if (!userIsVIP) {
        return res.status(403).json({
            message: "Must be a VIP to mark videos.",
        });
    }

    await deleteLockCategories(videoID, categories, getService(service));

    return res.status(200).json({ message: `Removed lock categories entries for video ${videoID}` });
}

/**
 *
 * @param videoID
 * @param categories If null, will remove all
 * @param service
 */
export async function deleteLockCategories(videoID: VideoID, categories: Category[], service: Service): Promise<void> {
    type DBEntry = { category: Category };
    const dbEntries = await db.prepare(
        "all",
        'SELECT * FROM "lockCategories" WHERE "videoID" = ? AND "service" = ?',
        [videoID, service]
    ) as Array<DBEntry>;

    const entries = dbEntries.filter(
        ({ category }: DBEntry) => categories === null || categories.indexOf(category) !== -1);

    await Promise.all(
        entries.map(({ category }: DBEntry) => db.prepare(
            "run",
            'DELETE FROM "lockCategories" WHERE "videoID" = ? AND "service" = ? AND "category" = ?',
            [videoID, service, category]
        ))
    );
}

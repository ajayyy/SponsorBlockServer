import { Request, Response } from "express";
import { isUserVIP } from "../utils/isUserVIP";
import { getHashCache } from "../utils/getHashCache";
import { db } from "../databases/databases";
import { ActionType, Category, Service, VideoID } from "../types/segments.model";
import { UserID } from "../types/user.model";
import { getService } from "../utils/getService";
import { config } from "../config";

interface DeleteLockCategoriesRequest extends Request {
    body: {
        categories: Category[];
        service: string;
        userID: UserID;
        videoID: VideoID;
        actionTypes: ActionType[];
    };
}

export async function deleteLockCategoriesEndpoint(req: DeleteLockCategoriesRequest, res: Response): Promise<Response> {
    // Collect user input data
    const {
        body: {
            videoID,
            userID,
            categories,
            service,
            actionTypes
        }
    } = req;

    // Check input data is valid
    if (!videoID
        || !userID
        || !categories
        || !Array.isArray(categories)
        || categories.length === 0
        || actionTypes.length === 0
    ) {
        return res.status(400).json({
            message: "Bad Format",
        });
    }

    // Check if user is VIP
    const hashedUserID = await getHashCache(userID);
    const userIsVIP = await isUserVIP(hashedUserID);

    if (!userIsVIP) {
        return res.status(403).json({
            message: "Must be a VIP to mark videos.",
        });
    }

    await deleteLockCategories(videoID, categories, actionTypes, getService(service));

    return res.status(200).json({ message: `Removed lock categories entries for video ${videoID}` });
}

export async function deleteLockCategories(videoID: VideoID, categories = config.categoryList, actionTypes = [ActionType.Skip, ActionType.Mute], service: Service): Promise<void> {
    const arrJoin = (arr: string[]): string => `'${arr.join(`','`)}'`;
    const categoryString = arrJoin(categories);
    const actionTypeString = arrJoin(actionTypes);
    await db.prepare("run", `DELETE FROM "lockCategories" WHERE "videoID" = ? AND "service" = ? AND "category" IN (${categoryString}) AND "actionType" IN (${actionTypeString})`, [videoID, service]);
}

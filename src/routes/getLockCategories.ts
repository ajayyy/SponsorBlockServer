import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Request, Response } from "express";
import { ActionType, Category, VideoID } from "../types/segments.model";
import { getService } from "../utils/getService";

export async function getLockCategories(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    const service = getService(req.query.service as string);
    const actionTypes: ActionType[] = req.query.actionTypes
        ? JSON.parse(req.query.actionTypes as string)
        : req.query.actionType
            ? Array.isArray(req.query.actionType)
                ? req.query.actionType
                : [req.query.actionType]
            : [ActionType.Skip, ActionType.Mute];
    if (!videoID || !Array.isArray(actionTypes)) {
        //invalid request
        return res.sendStatus(400);
    }
    try {
        // Get existing lock categories markers
        const row = await db.prepare("all", 'SELECT "category", "reason", "actionType" from "lockCategories" where "videoID" = ? AND "service" = ?', [videoID, service]) as {category: Category, reason: string, actionType: ActionType}[];
        const actionTypeMatches = row.filter((lock) => actionTypes.includes(lock.actionType));
        // map categories to array in JS becaues of SQL incompatibilities
        const categories = actionTypeMatches.map(item => item.category);
        if (categories.length === 0 || !categories[0]) return res.sendStatus(404);
        // Get longest lock reason
        const reason = actionTypeMatches.map(item => item.reason)
            .reduce((a,b) => (a.length > b.length) ? a : b);
        return res.send({
            reason,
            categories,
            actionTypes
        });
    } catch (err) /* istanbul ignore next */{
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

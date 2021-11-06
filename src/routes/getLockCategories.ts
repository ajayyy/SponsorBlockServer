import { db } from "../databases/databases";
import { Logger } from "../utils/logger";
import { Response } from "express";
import { Category } from "../types/segments.model";
import { getService } from "../utils/getService";
import { APIRequest } from "../types/APIRequest";

export async function getLockCategories(req: APIRequest, res: Response): Promise<Response> {
    const { query: { videoID, service } } = req;
    const qualifiedServiceName = getService(service);

    if (videoID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    try {
        // Get existing lock categories markers
        const row = await db.prepare("all", 'SELECT "category", "reason" from "lockCategories" where "videoID" = ? AND "service" = ?', [videoID, qualifiedServiceName]) as {category: Category, reason: string}[];
        // map categories to array in JS becaues of SQL incompatibilities
        const categories = row.map(item => item.category);
        if (categories.length === 0) {
            return res.sendStatus(404);
        }
        // Get longest lock reason
        const reason = row.map(item => item.reason)
            .reduce((a,b) => (a.length > b.length) ? a : b);

        return res.send({
            reason,
            categories
        });
    } catch (err) {
        Logger.error(err as string);

        return res.sendStatus(500);
    }
}

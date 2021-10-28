import { db } from "../databases/databases";
import { Response } from "express";
import { APIRequest } from "../types/APIRequest";

export async function getDaysSavedFormatted(_req: APIRequest, res: Response): Promise<Response> {
    const row = await db.prepare("get", 'SELECT SUM(("endTime" - "startTime") / 60 / 60 / 24 * "views") as "daysSaved" from "sponsorTimes" where "shadowHidden" != 1', []);

    if (row !== undefined) {
        //send this result
        return res.send({
            daysSaved: row.daysSaved.toFixed(2),
        });
    }
}

import { db } from "../databases/databases";
import { Request, Response } from "express";
import { Logger } from "../utils/logger";

export async function getDaysSavedFormatted(req: Request, res: Response): Promise<Response> {
    try {
        const row = await db.prepare("get", 'SELECT SUM(("endTime" - "startTime") / 60 / 60 / 24 * "views") as "daysSaved" from "sponsorTimes" where "shadowHidden" != 1', []);

        if (row !== undefined) {
            //send this result
            return res.send({
                daysSaved: row.daysSaved?.toFixed(2) ?? "0",
            });
        } else {
            return res.send({
                daysSaved: 0
            });
        }
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

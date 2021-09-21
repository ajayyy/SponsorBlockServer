import { db } from "../databases/databases";
import { Request, Response } from "express";
import { getHash } from "../utils/getHash";
import { Logger } from "../utils/logger";

export async function getViewsForUser(req: Request, res: Response): Promise<Response> {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //hash the userID
    userID = getHash(userID);

    try {
        const row = await db.prepare("get", `SELECT SUM("views") as "viewCount" FROM "sponsorTimes" WHERE "userID" = ?`, [userID]);

        //increase the view count by one
        if (row.viewCount != null) {
            return res.send({
                viewCount: row.viewCount,
            });
        } else {
            return res.sendStatus(404);
        }
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

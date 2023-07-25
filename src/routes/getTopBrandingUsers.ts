import { db } from "../databases/databases";
import { Request, Response } from "express";
import { Logger } from "../utils/logger";

async function generateTopUsersStats(sortBy: string) {
    const rows = await db.prepare("all", `SELECT COUNT(distinct "titles"."UUID") as "titleCount", COUNT(distinct "thumbnails"."UUID") as "thumbnailCount", COALESCE("userName", "titles"."userID") as "userName"
        FROM "titles" 
            LEFT JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID"
            LEFT JOIN "userNames" ON "titles"."userID"="userNames"."userID"
            LEFT JOIN "thumbnails" ON "titles"."userID" = "thumbnails"."userID" 
            LEFT JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID"
            WHERE "titleVotes"."votes" > -1 AND "titleVotes"."shadowHidden" != 1
            GROUP BY COALESCE("userName", "titles"."userID") HAVING SUM("titleVotes"."votes") > 2 OR SUM("thumbnailVotes"."votes") > 2
        ORDER BY "${sortBy}" DESC LIMIT 100`, []) as { titleCount: number, thumbnailCount: number, userName: string }[];

    return rows.map((row) => ({
        userName: row.userName,
        titles: row.titleCount,
        thumbnails: row.thumbnailCount
    }));
}

export async function getTopBrandingUsers(req: Request, res: Response): Promise<Response> {
    const sortType = parseInt(req.query.sortType as string);

    let sortBy = "";
    if (sortType == 0) {
        sortBy = "titleCount";
    } else if (sortType == 1) {
        sortBy = "thumbnailCount";
    } else {
        //invalid request
        return res.sendStatus(400);
    }

    if (db.highLoad()) {
        return res.status(503).send("Disabled for load reasons");
    }

    try {
        const stats = await generateTopUsersStats(sortBy);

        //send this result
        return res.send(stats);
    } catch (e) {
        Logger.error(e as string);
        return res.sendStatus(500);
    }
}

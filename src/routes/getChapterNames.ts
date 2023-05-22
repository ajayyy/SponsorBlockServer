import { Logger } from "../utils/logger";
import { Request, Response } from "express";
import { db } from "../databases/databases";
import { Postgres } from "../databases/Postgres";

export async function getChapterNames(req: Request, res: Response): Promise<Response> {
    const description = req.query.description as string;
    const channelID = req.query.channelID as string;

    if (!description || typeof(description) !== "string"
            || !channelID || typeof(channelID) !== "string") {
        return res.sendStatus(400);
    }

    if (!(db instanceof Postgres)) {
        return res.sendStatus(500).json({
            message: "Not supported on this instance"
        });
    }

    try {
        const descriptions = await db.prepare("all", `
            SELECT "description"
            FROM "sponsorTimes"
            WHERE ("locked" = 1 OR "votes" >= 0) AND "videoID" IN (
                SELECT "videoID"
                FROM "videoInfo"
                WHERE "channelID" = ?
            ) AND "description" != ''
            GROUP BY "description"
            ORDER BY SUM("votes"), similarity("description", ?) DESC
            LIMIT 5;`
        , [channelID, description]) as { description: string }[];

        if (descriptions?.length > 0) {
            return res.status(200).json(descriptions.map(d => ({
                description: d.description
            })));
        }
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }

    return res.status(404).json([]);
}

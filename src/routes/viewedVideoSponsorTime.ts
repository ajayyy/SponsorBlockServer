import { db } from "../databases/databases";
import { Request, Response } from "express";

export async function viewedVideoSponsorTime(req: Request, res: Response): Promise<Response> {
    const UUID = req.query?.UUID;
    const videoID = req.query?.videoID;

    if (!UUID) {
        //invalid request
        return res.sendStatus(400);
    }

    if (!videoID) {
        await db.prepare("run", `UPDATE "sponsorTimes" SET views = views + 1 WHERE "UUID" = ?`, [UUID]);
    } else {
        await db.prepare("run", `UPDATE "sponsorTimes" SET views = views + 1 WHERE "UUID" LIKE ? AND "videoID" = ?`, [`${UUID}%`, videoID]);
    }

    return res.sendStatus(200);
}

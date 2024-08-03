import { db } from "../databases/databases";
import { Request, Response } from "express";

export async function viewedVideoSponsorTime(req: Request, res: Response): Promise<Response> {
    const UUID = req.query?.UUID;
    const currentTime = Date.now();

    if (!UUID) {
        //invalid request
        return res.sendStatus(400);
    }

    //up the view count by one
    await db.prepare("run", `UPDATE "sponsorTimes" SET views = views + 1, "updatedAt" = ? WHERE "UUID" = ?`, [currentTime, UUID]);

    return res.sendStatus(200);
}

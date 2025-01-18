import { db } from "../databases/databases";
import { Request, Response } from "express";

export async function getSegmentID(req: Request, res: Response): Promise<Response> {
    const partialUUID = req.query?.UUID;
    const videoID = req.query?.videoID;

    if (!partialUUID || !videoID) {
        //invalid request
        return res.sendStatus(400);
    }

    const data = await db.prepare("get", `SELECT "UUID" from "sponsorTimes" WHERE "UUID" LIKE ? AND "videoID" = ?`, [`${partialUUID}%`, videoID]);

    if (data) {
        return res.status(200).send(data.UUID);
    } else {
        return res.sendStatus(404);
    }
}

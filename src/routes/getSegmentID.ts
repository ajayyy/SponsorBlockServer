import { db } from "../databases/databases";
import { Request, Response } from "express";
import { getService } from "../utils/getService";

export async function getSegmentID(req: Request, res: Response): Promise<Response> {
    const partialUUID = req.query?.UUID;
    const videoID = req.query?.videoID;
    const service = getService(req.query?.service as string);

    if (!partialUUID || !videoID) {
        //invalid request
        return res.sendStatus(400);
    }

    const data = await db.prepare("get", `SELECT "UUID" from "sponsorTimes" WHERE "UUID" LIKE ? AND "videoID" = ? AND "service" = ?`, [`${partialUUID}%`, videoID, service]);

    if (data) {
        return res.status(200).send(data.UUID);
    } else {
        return res.sendStatus(404);
    }
}

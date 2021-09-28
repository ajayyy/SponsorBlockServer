import { handleGetSegments } from "./getSkipSegments";
import { Request, Response } from "express";

export async function oldGetVideoSponsorTimes(req: Request, res: Response): Promise<Response> {
    const segments = await handleGetSegments(req, res);

    if (segments) {
        // Convert to old outputs
        const sponsorTimes = [];
        const UUIDs = [];

        for (const segment of segments) {
            sponsorTimes.push(segment.segment);
            UUIDs.push(segment.UUID);
        }

        return res.send({
            sponsorTimes,
            UUIDs,
        });
    }

    // Error has already been handled in the other method
}

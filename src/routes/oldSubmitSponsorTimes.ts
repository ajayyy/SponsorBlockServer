import { Request, Response } from "express";

import { postSkipSegments } from "#routes/postSkipSegments";

export function oldSubmitSponsorTimes(req: Request, res: Response): Promise<Response> {
    return postSkipSegments(req, res);
}

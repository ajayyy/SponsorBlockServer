import { Request, Response } from "express";

import { postSkipSegments } from "./postSkipSegments.js";

export function oldSubmitSponsorTimes(req: Request, res: Response): Promise<Response> {
    req.query.category = "sponsor";
    return postSkipSegments(req, res);
}

import {postSkipSegments} from "./postSkipSegments";
import {Request, Response} from "express";

export async function oldSubmitSponsorTimes(req: Request, res: Response): Promise<Response> {
    req.query.category = "sponsor";
    return postSkipSegments(req, res);
}

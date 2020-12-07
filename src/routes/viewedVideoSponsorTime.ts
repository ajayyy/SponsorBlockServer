import {db} from '../databases/databases';
import {Request, Response} from 'express';

export function viewedVideoSponsorTime(req: Request, res: Response): Response {
    let UUID = req.query.UUID;

    if (UUID == undefined) {
        //invalid request
        return res.sendStatus(400);
    }

    //up the view count by one
    db.prepare('run', "UPDATE sponsorTimes SET views = views + 1 WHERE UUID = ?", [UUID]);

    return res.sendStatus(200);
}

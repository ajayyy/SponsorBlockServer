import {db} from '../databases/databases';
import {Request, Response} from 'express';

export function getDaysSavedFormatted(req: Request, res: Response) {
    let row = db.prepare('get', "SELECT SUM((endTime - startTime) / 60 / 60 / 24 * views) as daysSaved from sponsorTimes where shadowHidden != 1", []);

    if (row !== undefined) {
        //send this result
        res.send({
            daysSaved: row.daysSaved.toFixed(2),
        });
    }
}

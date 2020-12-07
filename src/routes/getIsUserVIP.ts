import {Logger} from '../utils/logger';
import {getHash} from '../utils/getHash';
import {isUserVIP} from '../utils/isUserVIP';
import {Request, Response} from 'express';

export function getIsUserVIP(req: Request, res: Response): void {
    let userID = req.query.userID as string;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    try {
        let vipState = isUserVIP(userID);
        res.status(200).json({
            hashedUserID: userID,
            vip: vipState,
        });
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }
}

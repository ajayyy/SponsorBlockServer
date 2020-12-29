import {Logger} from '../utils/logger';
import {getHash} from '../utils/getHash';
import {isUserVIP} from '../utils/isUserVIP';
import {Request, Response} from 'express';
import { HashedUserID, UserID } from '../types/user.model';

export function getIsUserVIP(req: Request, res: Response): void {
    const userID = req.query.userID as UserID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    const hashedUserID: HashedUserID = getHash(userID);

    try {
        let vipState = isUserVIP(hashedUserID);
        res.status(200).json({
            hashedUserID: hashedUserID,
            vip: vipState,
        });
    } catch (err) {
        Logger.error(err);
        res.sendStatus(500);

        return;
    }
}

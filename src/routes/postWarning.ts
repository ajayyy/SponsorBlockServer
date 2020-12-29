import {Request, Response} from 'express';
import {Logger} from '../utils/logger';
import {db} from '../databases/databases';
import {isUserVIP} from '../utils/isUserVIP';
import {getHash} from '../utils/getHash';

export function postWarning(req: Request, res: Response) {
    // Collect user input data
    let issuerUserID = getHash(req.body.issuerUserID);
    let userID = req.body.userID;
    let issueTime = new Date().getTime();

    // Ensure user is a VIP
    if (!isUserVIP(issuerUserID)) {
        Logger.debug("Permission violation: User " + issuerUserID + " attempted to warn user " + userID + "."); // maybe warn?
        res.status(403).json({"message": "Not a VIP"});
        return;
    }

    db.prepare('run', 'INSERT INTO warnings (userID, issueTime, issuerUserID) VALUES (?, ?, ?)', [userID, issueTime, issuerUserID]);
    res.status(200).json({
        message: "Warning issued to user '" + userID + "'.",
    });

}

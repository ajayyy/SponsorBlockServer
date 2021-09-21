import { Request, Response } from "express";
import { Logger } from "../utils/logger";
import { db } from "../databases/databases";
import { isUserVIP } from "../utils/isUserVIP";
import { getHash } from "../utils/getHash";
import { HashedUserID, UserID } from "../types/user.model";
import { config } from "../config";

type warningEntry = {
    userID: HashedUserID,
    issueTime: number,
    issuerUserID: HashedUserID,
    enabled: boolean,
    reason: string
}

function checkExpiredWarning(warning: warningEntry): boolean {
    const MILLISECONDS_IN_HOUR = 3600000;
    const now = Date.now();
    const expiry =  Math.floor(now - (config.hoursAfterWarningExpires * MILLISECONDS_IN_HOUR));
    return warning.issueTime > expiry && !warning.enabled;
}

export async function postWarning(req: Request, res: Response): Promise<Response> {
    // exit early if no body passed in
    if (!req.body.userID && !req.body.issuerUserID) return res.status(400).json({ "message": "Missing parameters" });
    // Collect user input data
    const issuerUserID: HashedUserID = getHash(<UserID> req.body.issuerUserID);
    const userID: UserID = req.body.userID;
    const issueTime = new Date().getTime();
    const enabled: boolean = req.body.enabled ?? true;
    const reason: string = req.body.reason ?? "";

    // Ensure user is a VIP
    if (!await isUserVIP(issuerUserID)) {
        Logger.warn(`Permission violation: User ${issuerUserID} attempted to warn user ${userID}.`);
        return res.status(403).json({ "message": "Not a VIP" });
    }

    let resultStatus = "";

    if (enabled) {
        const previousWarning = await db.prepare("get", 'SELECT * FROM "warnings" WHERE "userID" = ? AND "issuerUserID" = ?', [userID, issuerUserID]) as warningEntry;

        if (!previousWarning) {
            await db.prepare(
                "run",
                'INSERT INTO "warnings" ("userID", "issueTime", "issuerUserID", "enabled", "reason") VALUES (?, ?, ?, 1, ?)',
                [userID, issueTime, issuerUserID, reason]
            );
            resultStatus = "issued to";
        // check if warning is still within issue time and warning is not enabled
        } else if (checkExpiredWarning(previousWarning) ) {
            await db.prepare(
                "run", 'UPDATE "warnings" SET "enabled" = 1 WHERE "userID" = ? AND "issueTime" = ?',
                [userID, previousWarning.issueTime]
            );
            resultStatus = "re-enabled";
        } else {
            return res.sendStatus(409);
        }
    } else {
        await db.prepare("run", 'UPDATE "warnings" SET "enabled" = 0 WHERE "userID" = ?', [userID]);
        resultStatus = "removed from";
    }

    return res.status(200).json({
        message: `Warning ${resultStatus} user '${userID}'.`,
    });
}

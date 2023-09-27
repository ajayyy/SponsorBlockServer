import { Request, Response } from "express";
import { Logger } from "../utils/logger";
import { db } from "../databases/databases";
import { isUserVIP } from "../utils/isUserVIP";
import { getHashCache } from "../utils/getHashCache";
import { HashedUserID, UserID } from "../types/user.model";
import { config } from "../config";
import { generateWarningDiscord, warningData, dispatchEvent } from "../utils/webhookUtils";
import { WarningType } from "../types/warning.model";

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

const getUsername = (userID: HashedUserID) => db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID], { useReplica: true });

export async function postWarning(req: Request, res: Response): Promise<Response> {
    if (!req.body.userID) return res.status(400).json({ "message": "Missing parameters" });

    const issuerUserID: HashedUserID = req.body.issuerUserID ? await getHashCache(req.body.issuerUserID as UserID) : null;
    const userID: HashedUserID = issuerUserID ? req.body.userID : await getHashCache(req.body.userID as UserID);
    const issueTime = new Date().getTime();
    const enabled: boolean = req.body.enabled ?? true;
    const reason: string = req.body.reason ?? "";
    const type: WarningType = req.body.type ?? WarningType.SponsorBlock;

    if ((!issuerUserID && enabled) || (issuerUserID && !await isUserVIP(issuerUserID))) {
        Logger.warn(`Permission violation: User ${issuerUserID} attempted to warn user ${userID}.`);
        return res.status(403).json({ "message": "Not a VIP" });
    }

    let resultStatus = "";

    try {
        if (enabled) {
            const previousWarning = await db.prepare("get", 'SELECT * FROM "warnings" WHERE "userID" = ? AND "issuerUserID" = ? AND "type" = ?', [userID, issuerUserID, type]) as warningEntry;

            if (!previousWarning) {
                if (!reason) {
                    return res.status(400).json({ "message": "Missing warning reason" });
                }
                await db.prepare(
                    "run",
                    'INSERT INTO "warnings" ("userID", "issueTime", "issuerUserID", "enabled", "reason", "type") VALUES (?, ?, ?, 1, ?, ?)',
                    [userID, issueTime, issuerUserID, reason, type]
                );
                resultStatus = "issued to";
            // check if warning is still within issue time and warning is not enabled
            } else if (checkExpiredWarning(previousWarning) ) {
                await db.prepare(
                    "run", 'UPDATE "warnings" SET "enabled" = 1, "reason" = ? WHERE "userID" = ? AND "issueTime" = ?',
                    [reason, userID, previousWarning.issueTime]
                );
                resultStatus = "re-enabled";
            } else {
                return res.sendStatus(409);
            }
        } else {
            await db.prepare("run", 'UPDATE "warnings" SET "enabled" = 0 WHERE "userID" = ? AND "type" = ?', [userID, type]);
            resultStatus = "removed from";
        }

        const targetUsername = await getUsername(userID) ?? null;
        const issuerUsername = await getUsername(issuerUserID) ?? null;
        const webhookData = {
            target: {
                userID,
                username: targetUsername
            },
            issuer: {
                userID: issuerUserID,
                username: issuerUsername
            },
            reason
        } as warningData;

        try {
            const warning = generateWarningDiscord(webhookData);
            dispatchEvent("warning", warning);
        } catch /* istanbul ignore next */ (err) {
            Logger.error(`Error sending warning to Discord ${err}`);
        }

        return res.status(200).json({
            message: `Warning ${resultStatus} user '${userID}'.`,
        });
    } catch (e) {
        Logger.error(e as string);
        return res.sendStatus(500);
    }
}

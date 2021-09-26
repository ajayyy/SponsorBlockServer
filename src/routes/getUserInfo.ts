import { db } from "../databases/databases";
import { getHash } from "../utils/getHash";
import { isUserVIP } from "../utils/isUserVIP";
import { Request, Response } from "express";
import { Logger } from "../utils/logger";
import { HashedUserID, UserID } from "../types/user.model";
import { getReputation } from "../utils/reputation";
import { SegmentUUID } from "../types/segments.model";
import { config } from "../config";
const maxRewardTime = config.maxRewardTimePerSegmentInSeconds;

async function dbGetSubmittedSegmentSummary(userID: HashedUserID): Promise<{ minutesSaved: number, segmentCount: number }> {
    try {
        const row = await db.prepare("get",
            `SELECT SUM(((CASE WHEN "endTime" - "startTime" > ? THEN ? ELSE "endTime" - "startTime" END) / 60) * "views") as "minutesSaved",
            count(*) as "segmentCount" FROM "sponsorTimes"
            WHERE "userID" = ? AND "votes" > -2 AND "shadowHidden" != 1`, [maxRewardTime, maxRewardTime, userID]);
        if (row.minutesSaved != null) {
            return {
                minutesSaved: row.minutesSaved,
                segmentCount: row.segmentCount,
            };
        } else {
            return {
                minutesSaved: 0,
                segmentCount: 0,
            };
        }
    } catch (err) {
        return null;
    }
}

async function dbGetIgnoredSegmentCount(userID: HashedUserID): Promise<number> {
    try {
        const row = await db.prepare("get", `SELECT COUNT(*) as "ignoredSegmentCount" FROM "sponsorTimes" WHERE "userID" = ? AND ( "votes" <= -2 OR "shadowHidden" = 1 )`, [userID]);
        return row?.ignoredSegmentCount ?? 0;
    } catch (err) {
        return null;
    }
}

async function dbGetUsername(userID: HashedUserID) {
    try {
        const row = await db.prepare("get", `SELECT "userName" FROM "userNames" WHERE "userID" = ?`, [userID]);
        return row?.userName ?? userID;
    } catch (err) {
        return false;
    }
}

async function dbGetViewsForUser(userID: HashedUserID) {
    try {
        const row = await db.prepare("get", `SELECT SUM("views") as "viewCount" FROM "sponsorTimes" WHERE "userID" = ? AND "votes" > -2 AND "shadowHidden" != 1`, [userID]);
        return row?.viewCount ?? 0;
    } catch (err) {
        return false;
    }
}

async function dbGetIgnoredViewsForUser(userID: HashedUserID) {
    try {
        const row = await db.prepare("get", `SELECT SUM("views") as "ignoredViewCount" FROM "sponsorTimes" WHERE "userID" = ? AND ( "votes" <= -2 OR "shadowHidden" = 1 )`, [userID]);
        return row?.ignoredViewCount ?? 0;
    } catch (err) {
        return false;
    }
}

async function dbGetWarningsForUser(userID: HashedUserID): Promise<number> {
    try {
        const row = await db.prepare("get", `SELECT COUNT(*) as total FROM "warnings" WHERE "userID" = ? AND "enabled" = 1`, [userID]);
        return row?.total ?? 0;
    } catch (err) {
        Logger.error(`Couldn't get warnings for user ${userID}. returning 0`);
        return 0;
    }
}

async function dbGetLastSegmentForUser(userID: HashedUserID): Promise<SegmentUUID> {
    try {
        const row = await db.prepare("get", `SELECT "UUID" FROM "sponsorTimes" WHERE "userID" = ? ORDER BY "timeSubmitted" DESC LIMIT 1`, [userID]);
        return row?.UUID ?? null;
    } catch (err) {
        return null;
    }
}

async function dbGetActiveWarningReasonForUser(userID: HashedUserID): Promise<string> {
    try {
        const row = await db.prepare("get", `SELECT reason FROM "warnings" WHERE "userID" = ? AND "enabled" = 1 ORDER BY "issueTime" DESC LIMIT 1`, [userID]);
        return row?.reason ?? "";
    } catch (err) {
        Logger.error(`Couldn't get reason for user ${userID}. returning blank`);
        return "";
    }
}

async function dbGetBanned(userID: HashedUserID): Promise<boolean> {
    try {
        const row = await db.prepare("get", `SELECT count(*) as "userCount" FROM "shadowBannedUsers" WHERE "userID" = ? LIMIT 1`, [userID]);
        return row?.userCount > 0 ?? false;
    } catch (err) {
        return false;
    }
}

type cases = Record<string, any>

const executeIfFunction = (f: any) =>
    typeof f === "function" ? f() : f;

const objSwitch = (cases: cases) => (defaultCase: string) => (key: string) =>
    Object.prototype.hasOwnProperty.call(cases, key) ? cases[key] : defaultCase;

const functionSwitch = (cases: cases) => (defaultCase: string) => (key: string) =>
    executeIfFunction(objSwitch(cases)(defaultCase)(key));

const dbGetValue = (userID: HashedUserID, property: string): Promise<string|SegmentUUID|number> => {
    return functionSwitch({
        userID,
        userName: dbGetUsername(userID),
        ignoredSegmentCount: dbGetIgnoredSegmentCount(userID),
        viewCount: dbGetViewsForUser(userID),
        ignoredViewCount: dbGetIgnoredViewsForUser(userID),
        warnings: dbGetWarningsForUser(userID),
        warningReason: dbGetActiveWarningReasonForUser(userID),
        banned: dbGetBanned(userID),
        reputation: getReputation(userID),
        vip: isUserVIP(userID),
        lastSegmentID: dbGetLastSegmentForUser(userID),
    })("")(property);
};

async function getUserInfo(req: Request, res: Response): Promise<Response> {
    const userID = req.query.userID as UserID;
    const hashedUserID: HashedUserID = userID ? getHash(userID) : req.query.publicUserID as HashedUserID;
    const defaultProperties: string[] = ["userID", "userName", "minutesSaved", "segmentCount", "ignoredSegmentCount",
        "viewCount", "ignoredViewCount", "warnings", "warningReason", "reputation",
        "vip", "lastSegmentID"];
    const allProperties: string[] = [...defaultProperties, "banned"];
    let paramValues: string[] = req.query.values
        ? JSON.parse(req.query.values as string)
        : req.query.value
            ? Array.isArray(req.query.value)
                ? req.query.value
                : [req.query.value]
            : defaultProperties;
    if (!Array.isArray(paramValues)) {
        return res.status(400).send("Invalid values");
    }
    // filter array to only include from allProperties
    paramValues = paramValues.filter(param => allProperties.includes(param));
    if (paramValues.length === 0) {
        // invalid values
        return res.status(400).send("No valid values specified");
    }

    if (hashedUserID == undefined) {
        //invalid request
        return res.status(400).send("Invalid userID or publicUserID parameter");
    }

    const segmentsSummary = await dbGetSubmittedSegmentSummary(hashedUserID);
    const responseObj = {} as Record<string, string|SegmentUUID|number>;
    for (const property of paramValues) {
        responseObj[property] = await dbGetValue(hashedUserID, property);
    }
    // add minutesSaved and segmentCount after to avoid getting overwritten
    if (paramValues.includes("minutesSaved")) responseObj["minutesSaved"] = segmentsSummary.minutesSaved;
    if (paramValues.includes("segmentCount")) responseObj["segmentCount"] = segmentsSummary.segmentCount;
    return res.send(responseObj);
}

export async function endpoint(req: Request, res: Response): Promise<Response> {
    try {
        return await getUserInfo(req, res);
    } catch (err) {
        if (err instanceof SyntaxError) { // catch JSON.parse error
            return res.status(400).send("Invalid values JSON");
        } else return res.sendStatus(500);
    }
}
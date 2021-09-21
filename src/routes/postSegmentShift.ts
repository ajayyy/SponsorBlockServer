import { Request, Response } from "express";
import { Logger } from "../utils/logger";
import { isUserVIP } from "../utils/isUserVIP";
import { getHash } from "../utils/getHash";
import { db } from "../databases/databases";

const ACTION_NONE = Symbol("none");
const ACTION_UPDATE = Symbol("update");
const ACTION_REMOVE = Symbol("remove");

function shiftSegment(segment: any, shift: { startTime: any; endTime: any }) {
    if (segment.startTime >= segment.endTime) return { action: ACTION_NONE, segment };
    if (shift.startTime >= shift.endTime) return { action: ACTION_NONE, segment };
    const duration = shift.endTime - shift.startTime;
    if (shift.endTime < segment.startTime) {
        // Scenario #1 cut before segment
        segment.startTime -= duration;
        segment.endTime -= duration;
        return { action: ACTION_UPDATE, segment };
    }
    if (shift.startTime > segment.endTime) {
        // Scenario #2 cut after segment
        return { action: ACTION_NONE, segment };
    }
    if (segment.startTime < shift.startTime && segment.endTime > shift.endTime) {
        // Scenario #3 cut inside segment
        segment.endTime -= duration;
        return { action: ACTION_UPDATE, segment };
    }
    if (segment.startTime >= shift.startTime && segment.endTime > shift.endTime) {
        // Scenario #4 cut overlap startTime
        segment.startTime = shift.startTime;
        segment.endTime -= duration;
        return { action: ACTION_UPDATE, segment };
    }
    if (segment.startTime < shift.startTime && segment.endTime <= shift.endTime) {
        // Scenario #5 cut overlap endTime
        segment.endTime = shift.startTime;
        return { action: ACTION_UPDATE, segment };
    }
    if (segment.startTime >= shift.startTime && segment.endTime <= shift.endTime) {
        // Scenario #6 cut overlap startTime and endTime
        return { action: ACTION_REMOVE, segment };
    }
    return { action: ACTION_NONE, segment };
}

export async function postSegmentShift(req: Request, res: Response): Promise<Response> {
    // Collect user input data
    const videoID = req.body.videoID;
    const startTime = req.body.startTime;
    const endTime = req.body.endTime;
    let userID = req.body.userID;

    // Check input data is valid
    if (!videoID
        || !userID
        || !startTime
        || !endTime
    ) {
        return res.status(400).json({
            message: "Bad Format",
        });
    }

    // Check if user is VIP
    userID = getHash(userID);
    const userIsVIP = await isUserVIP(userID);

    if (!userIsVIP) {
        return res.status(403).json({
            message: "Must be a VIP to perform this action.",
        });
    }

    try {
        const segments = await db.prepare("all", 'SELECT "startTime", "endTime", "UUID" FROM "sponsorTimes" WHERE "videoID" = ?', [videoID]);
        const shift = {
            startTime,
            endTime,
        };

        for (const segment of segments) {
            const result = shiftSegment(segment, shift);
            switch (result.action) {
                case ACTION_UPDATE:
                    await db.prepare("run", 'UPDATE "sponsorTimes" SET "startTime" = ?, "endTime" = ? WHERE "UUID" = ?', [result.segment.startTime, result.segment.endTime, result.segment.UUID]);
                    break;
                case ACTION_REMOVE:
                    await db.prepare("run", 'UPDATE "sponsorTimes" SET "startTime" = ?, "endTime" = ?, "votes" = -2 WHERE "UUID" = ?', [result.segment.startTime, result.segment.endTime, result.segment.UUID]);
                    break;
            }
        }
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }

    return res.sendStatus(200);
}

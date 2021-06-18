import { Request, Response } from 'express';
import { db } from '../databases/databases';
import { DBSegment, SegmentUUID } from "../types/segments.model";

const isValidSegmentUUID = (str: string): Boolean => /^([a-f0-9]{64}|[a-f0-9]{8}\-[a-f0-9]{4}\-[a-f0-9]{4}\-[a-f0-9]{4}\-[a-f0-9]{12})/.test(str)

async function getSegmentFromDBByUUID(UUID: SegmentUUID): Promise<DBSegment> {
    try {
        return await db.prepare('get',
            `SELECT "videoID", "startTime", "endTime", "votes", "locked",
                "UUID", "userID", "timeSubmitted", "views", "category",
                "service", "videoDuration", "hidden", "reputation", "shadowHidden" FROM "sponsorTimes"
            WHERE "UUID" = ?`, [UUID]);
    } catch (err) {
        return null;
    }
}

async function getSegmentsByUUID(UUIDs: SegmentUUID[]): Promise<DBSegment[]> {
    const DBSegments: DBSegment[] = [];
    for (let UUID of UUIDs) {
        // if UUID is invalid, skip
        if (!isValidSegmentUUID(UUID)) {
            continue;
        }
        DBSegments.push(await getSegmentFromDBByUUID(UUID as SegmentUUID));
    }
    return DBSegments;
}

async function handleGetSegmentInfo(req: Request, res: Response) {
    // If using params instead of JSON, only one UUID can be pulled
    let UUIDs = req.query.UUIDs
    ? JSON.parse(req.query.UUIDs as string)
    : req.query.UUID
        ? [req.query.UUID]
        : null;
    // deduplicate with set
    UUIDs = [ ...new Set(UUIDs)];
    // if more than 10 entries, slice
    if (UUIDs.length > 10) UUIDs = UUIDs.slice(0, 10);
    if (!Array.isArray(UUIDs) || !UUIDs) {
        res.status(400).send("UUIDs parameter does not match format requirements.");
        return false;
    }
    const DBSegments = await getSegmentsByUUID(UUIDs);
    // all uuids failed lookup
    if (DBSegments.length === 0) {
        res.sendStatus(400);
        return false;
    }
    // uuids valid but not found
    if (DBSegments[0] === null || DBSegments[0] === undefined) {
        res.sendStatus(400);
        return false;
    }
    return DBSegments;
}

async function endpoint(req: Request, res: Response): Promise<void> {
    try {
        const DBSegments = await handleGetSegmentInfo(req, res);

        // If false, res.send has already been called
        if (DBSegments) {
            //send result
            res.send(DBSegments);
        }
    } catch (err) {
        if (err instanceof SyntaxError) { // catch JSON.parse error
            res.status(400).send("UUIDs parameter does not match format requirements.");
        } else res.status(500).send();
    }
}

export {
    getSegmentFromDBByUUID,
    getSegmentsByUUID,
    handleGetSegmentInfo,
    endpoint
};

import { Request, Response } from "express";
import { db } from "../databases/databases";
import { DBSegment, SegmentUUID } from "../types/segments.model";
import { parseUUIDs } from "../utils/parseParams";

async function getSegmentFromDBByUUID(UUID: SegmentUUID): Promise<DBSegment> {
    try {
        return await db.prepare("get", `SELECT * FROM "sponsorTimes" WHERE "UUID" = ?`, [UUID]);
    } catch (err) /* istanbul ignore next */ {
        return null;
    }
}

async function getSegmentsByUUID(UUIDs: SegmentUUID[]): Promise<DBSegment[]> {
    const DBSegments: DBSegment[] = [];
    for (const UUID of UUIDs) {
        DBSegments.push(await getSegmentFromDBByUUID(UUID as SegmentUUID));
    }
    return DBSegments;
}

async function getSegmentInfo(req: Request, res: Response): Promise<Response> {
    // If using params instead of JSON, only one UUID can be pulled
    let UUIDs = parseUUIDs(req);
    // verify format
    if (!Array.isArray(UUIDs) || !UUIDs?.length) {
        res.status(400).send("UUIDs parameter does not match format requirements.");
        return;
    }
    // deduplicate with set
    UUIDs = [ ...new Set(UUIDs)];
    // if more than 10 entries, slice
    if (UUIDs.length > 10) UUIDs = UUIDs.slice(0, 10);
    const DBSegments = await getSegmentsByUUID(UUIDs);
    // uuids valid but not found
    if (!DBSegments?.length || DBSegments[0] === null || DBSegments[0] === undefined) {
        res.status(404).send("UUIDs not found in database.");
        return;
    }
    return res.send(DBSegments);
}

export {
    getSegmentFromDBByUUID,
    getSegmentsByUUID,
    getSegmentInfo
};

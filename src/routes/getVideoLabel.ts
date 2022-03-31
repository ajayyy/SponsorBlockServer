import { Request, Response } from "express";
import { db } from "../databases/databases";
import { videoLabelsHashKey, videoLabelsKey } from "../utils/redisKeys";
import { SBRecord } from "../types/lib.model";
import { DBSegment, Segment, Service, VideoData, VideoID, VideoIDHash } from "../types/segments.model";
import { Logger } from "../utils/logger";
import { QueryCacher } from "../utils/queryCacher";
import { getService } from "../utils/getService";

function transformDBSegments(segments: DBSegment[]): Segment[] {
    return segments.map((chosenSegment) => ({
        category: chosenSegment.category,
        actionType: chosenSegment.actionType,
        segment: [chosenSegment.startTime, chosenSegment.endTime],
        UUID: chosenSegment.UUID,
        locked: chosenSegment.locked,
        votes: chosenSegment.votes,
        videoDuration: chosenSegment.videoDuration,
        userID: chosenSegment.userID,
        description: chosenSegment.description
    }));
}

async function getLabelsByVideoID(videoID: VideoID, service: Service): Promise<Segment[]> {
    try {
        const segments: DBSegment[] = await getSegmentsFromDBByVideoID(videoID, service);
        return chooseSegment(segments);
    } catch (err) {
        if (err) {
            Logger.error(err as string);
            return null;
        }
    }
}

async function getLabelsByHash(hashedVideoIDPrefix: VideoIDHash, service: Service): Promise<SBRecord<VideoID, VideoData>> {
    const segments: SBRecord<VideoID, VideoData> = {};

    try {
        type SegmentWithHashPerVideoID = SBRecord<VideoID, { hash: VideoIDHash, segments: DBSegment[] }>;

        const segmentPerVideoID: SegmentWithHashPerVideoID = (await getSegmentsFromDBByHash(hashedVideoIDPrefix, service))
            .reduce((acc: SegmentWithHashPerVideoID, segment: DBSegment) => {
                acc[segment.videoID] = acc[segment.videoID] || {
                    hash: segment.hashedVideoID,
                    segments: []
                };

                acc[segment.videoID].segments ??= [];
                acc[segment.videoID].segments.push(segment);

                return acc;
            }, {});

        for (const [videoID, videoData] of Object.entries(segmentPerVideoID)) {
            const data: VideoData = {
                hash: videoData.hash,
                segments: chooseSegment(videoData.segments),
            };

            if (data.segments.length > 0) {
                segments[videoID] = data;
            }
        }

        return segments;
    } catch (err) {
        Logger.error(err as string);
        return null;
    }
}

async function getSegmentsFromDBByHash(hashedVideoIDPrefix: VideoIDHash, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            "all",
            `SELECT "startTime", "endTime", "videoID", "votes", "locked", "UUID", "userID", "category", "actionType", "hashedVideoID", "description" FROM "sponsorTimes"
            WHERE "hashedVideoID" LIKE ? AND "service" = ? AND "actionType" = 'full' AND "hidden" = 0 AND "shadowHidden" = 0`,
            [`${hashedVideoIDPrefix}%`, service]
        ) as Promise<DBSegment[]>;

    if (hashedVideoIDPrefix.length === 4) {
        return await QueryCacher.get(fetchFromDB, videoLabelsHashKey(hashedVideoIDPrefix, service));
    }

    return await fetchFromDB();
}

async function getSegmentsFromDBByVideoID(videoID: VideoID, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            "all",
            `SELECT "startTime", "endTime", "votes", "locked", "UUID", "userID", "category", "actionType", "description" FROM "sponsorTimes" 
            WHERE "videoID" = ? AND "service" = ? AND "actionType" = 'full' AND "hidden" = 0 AND "shadowHidden" = 0`,
            [videoID, service]
        ) as Promise<DBSegment[]>;

    return await QueryCacher.get(fetchFromDB, videoLabelsKey(videoID, service));
}

function chooseSegment<T extends DBSegment>(choices: T[]): Segment[] {
    // filter out -2 segments
    choices = choices.filter((segment) => segment.votes > -2);
    const results = [];
    // trivial decisions
    if (choices.length === 0) {
        return [];
    } else if (choices.length === 1) {
        return transformDBSegments(choices);
    }
    // if locked, only choose from locked
    const locked = choices.filter((segment) => segment.locked);
    if (locked.length > 0) {
        choices = locked;
    }
    //no need to filter, just one label
    if (choices.length === 1) {
        return transformDBSegments(choices);
    }
    // sponsor > exclusive > selfpromo
    const sponsorResult = choices.find((segment) => segment.category === "sponsor");
    const eaResult = choices.find((segment) => segment.category === "exclusive_access");
    const selfpromoResult = choices.find((segment) => segment.category === "selfpromo");
    if (sponsorResult) {
        results.push(sponsorResult);
    } else if (eaResult) {
        results.push(eaResult);
    } else if (selfpromoResult) {
        results.push(selfpromoResult);
    }
    return transformDBSegments(results);
}

async function handleGetLabel(req: Request, res: Response): Promise<Segment[] | false> {
    const videoID = req.query.videoID as VideoID;
    if (!videoID) {
        res.status(400).send("videoID not specified");
        return false;
    }

    const service = getService(req.query.service, req.body.service);
    const segments = await getLabelsByVideoID(videoID, service);

    if (!segments || segments.length === 0) {
        res.sendStatus(404);
        return false;
    }

    return segments;
}

async function endpoint(req: Request, res: Response): Promise<Response> {
    try {
        const segments = await handleGetLabel(req, res);

        // If false, res.send has already been called
        if (segments) {
            //send result
            return res.send(segments);
        }
    } catch (err) {
        if (err instanceof SyntaxError) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        } else return res.sendStatus(500);
    }
}

export {
    getLabelsByVideoID,
    getLabelsbyHash,
    endpoint
};

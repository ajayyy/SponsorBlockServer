import { Request, Response } from "express";
import { db } from "../databases/databases";
import { videoLabelsHashKey, videoLabelsKey, videoLabelsLargerHashKey } from "../utils/redisKeys";
import { SBRecord } from "../types/lib.model";
import { ActionType, Category, DBSegment, Service, VideoID, VideoIDHash } from "../types/segments.model";
import { Logger } from "../utils/logger";
import { QueryCacher } from "../utils/queryCacher";
import { getEtag } from "../middleware/etag";
import { getService } from "../utils/getService";

interface FullVideoSegment {
    category: Category;
}

interface FullVideoSegmentVideoData {
    segments: FullVideoSegment[];
    hasStartSegment: boolean;
}

function transformDBSegments(segments: DBSegment[]): FullVideoSegment[] {
    return segments.map((chosenSegment) => ({
        category: chosenSegment.category
    }));
}

async function getLabelsByVideoID(videoID: VideoID, service: Service): Promise<FullVideoSegmentVideoData> {
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

async function getLabelsByHash(hashedVideoIDPrefix: VideoIDHash, service: Service, checkHasStartSegment: boolean): Promise<SBRecord<VideoID, FullVideoSegmentVideoData>> {
    const segments: SBRecord<VideoID, FullVideoSegmentVideoData> = {};

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
            const result = chooseSegment(videoData.segments);
            const data: FullVideoSegmentVideoData = {
                segments: result.segments,
                hasStartSegment: checkHasStartSegment ? result.hasStartSegment : undefined
            };

            if (data.segments.length > 0 || (data.hasStartSegment && checkHasStartSegment)) {
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
            WHERE "hashedVideoID" LIKE ? AND "service" = ? AND "hidden" = 0 AND "shadowHidden" = 0`,
            [`${hashedVideoIDPrefix}%`, service]
        ) as Promise<DBSegment[]>;

    if (hashedVideoIDPrefix.length === 3) {
        return await QueryCacher.get(fetchFromDB, videoLabelsHashKey(hashedVideoIDPrefix, service));
    } else if (hashedVideoIDPrefix.length === 4) {
        return await QueryCacher.get(fetchFromDB, videoLabelsLargerHashKey(hashedVideoIDPrefix, service));
    }

    return await fetchFromDB();
}

async function getSegmentsFromDBByVideoID(videoID: VideoID, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            "all",
            `SELECT "startTime", "endTime", "votes", "locked", "UUID", "userID", "category", "actionType", "description" FROM "sponsorTimes" 
            WHERE "videoID" = ? AND "service" = ? AND "hidden" = 0 AND "shadowHidden" = 0`,
            [videoID, service]
        ) as Promise<DBSegment[]>;

    return await QueryCacher.get(fetchFromDB, videoLabelsKey(videoID, service));
}

function chooseSegment<T extends DBSegment>(choices: T[]): FullVideoSegmentVideoData {
    // filter out -2 segments
    choices = choices.filter((segment) => segment.votes > -2);

    const hasStartSegment = !!choices.some((segment) => segment.startTime < 5
        && (segment.actionType === ActionType.Skip || segment.actionType === ActionType.Mute));

    choices = choices.filter((segment) => segment.actionType === ActionType.Full);

    const results = [];
    // trivial decisions
    if (choices.length === 0) {
        return {
            segments: [],
            hasStartSegment
        };
    } else if (choices.length === 1) {
        return {
            segments: transformDBSegments(choices),
            hasStartSegment
        }
    }
    // if locked, only choose from locked
    const locked = choices.filter((segment) => segment.locked);
    if (locked.length > 0) {
        choices = locked;
    }
    //no need to filter, just one label
    if (choices.length === 1) {
        return {
            segments: transformDBSegments(choices),
            hasStartSegment
        };
    }
    // sponsor > exclusive > selfpromo
    const findCategory = (category: string) => choices.find((segment) => segment.category === category);

    const categoryResult = findCategory("sponsor") ?? findCategory("exclusive_access") ?? findCategory("selfpromo");
    if (categoryResult) results.push(categoryResult);

    return {
        segments: transformDBSegments(results),
        hasStartSegment
    };
}

async function handleGetLabel(req: Request, res: Response): Promise<FullVideoSegmentVideoData | FullVideoSegment[] | false> {
    const videoID = req.query.videoID as VideoID;
    if (!videoID) {
        res.status(400).send("videoID not specified");
        return false;
    }

    const hasStartSegment = req.query.hasStartSegment === "true";

    const service = getService(req.query.service, req.body.service);
    const segmentData = await getLabelsByVideoID(videoID, service);
    const segments = segmentData.segments;

    if (!segments || segments.length === 0) {
        res.sendStatus(404);
        return false;
    }

    await getEtag("videoLabel", (videoID as string), service)
        .then(etag => res.set("ETag", etag))
        .catch(() => null);

    if (hasStartSegment) {
        return segmentData;
    } else {
        return segments;
    }

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
    getLabelsByHash,
    endpoint
};

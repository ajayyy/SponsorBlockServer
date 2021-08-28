import { Request, Response } from "express";
import { db } from "../databases/databases";
import { ActionType, Category, DBSegment, Service, VideoID } from "../types/segments.model";
const segmentsPerPage = 10;

type searchSegmentResponse = {
    segmentCount: number,
    page: number,
    segments: DBSegment[]
};

async function getSegmentsFromDBByVideoID(videoID: VideoID, service: Service): Promise<DBSegment[]> {
    return db.prepare(
        "all",
        `SELECT "UUID", "timeSubmitted", "startTime", "endTime", "category", "actionType", "votes", "views", "locked", "hidden", "shadowHidden", FROM "sponsorTimes" 
        WHERE "videoID" = ? AND "service" = ? ORDER BY "UUID"`,
        [videoID, service]
    ) as Promise<DBSegment[]>;
}

/**
 *
 * Returns what would be sent to the client.
 * Will respond with errors if required. Returns false if it errors.
 *
 * @param req
 * @param res
 *
 * @returns
 */
async function handleGetSegments(req: Request, res: Response): Promise<searchSegmentResponse | false> {
    const videoID = req.query.videoID as VideoID;
    if (!videoID) {
        res.status(400).send("videoID not specified");
        return false;
    }
    // Default to sponsor
    // If using params instead of JSON, only one category can be pulled
    const categories: Category[] = req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category]
            : ["sponsor"];
    if (!Array.isArray(categories)) {
        res.status(400).send("Categories parameter does not match format requirements.");
        return false;
    }

    const actionTypes: ActionType[] = req.query.actionTypes
        ? JSON.parse(req.query.actionTypes as string)
        : req.query.actionType
            ? Array.isArray(req.query.actionType)
                ? req.query.actionType
                : [req.query.actionType]
            : [ActionType.Skip];
    if (!Array.isArray(actionTypes)) {
        res.status(400).send("actionTypes parameter does not match format requirements.");
        return false;
    }

    let service: Service = req.query.service ?? req.body.service ?? Service.YouTube;
    if (!Object.values(Service).some((val) => val == service)) {
        service = Service.YouTube;
    }

    const page: number = req.query.page ?? req.body.page ?? 0;

    const minVotes: number = req.query.minVotes ?? req.body.minVotes ?? -2;
    const maxVotes: number = req.query.maxVotes ?? req.body.maxVotes ?? Infinity;

    const minViews: number = req.query.minViews ?? req.body.minViews ?? 0;
    const maxViews: number = req.query.maxViews ?? req.body.maxViews ?? Infinity;

    const locked: boolean = req.query.locked ?? req.body.locked ?? true;
    const hidden: boolean = req.query.hidden ?? req.body.hidden ?? true;
    const ignored: boolean = req.query.ignored ?? req.body.ignored ?? true;

    const filters = {
        minVotes,
        maxVotes,
        minViews,
        maxViews,
        locked,
        hidden,
        ignored
    };

    const segments = await getSegmentsFromDBByVideoID(videoID, service);

    if (segments === null || segments === undefined) {
        res.sendStatus(500);
        return false;
    }

    if (segments.length === 0) {
        res.sendStatus(404);
        return false;
    }

    return filterSegments(segments, page, filters);
}

function filterSegments(segments: DBSegment[], page: number, filters: Record<string, string|boolean|number>) {
    const startIndex = 0+(page*segmentsPerPage);
    const endIndex = segmentsPerPage+(page*segmentsPerPage);
    const filteredSegments = segments.filter((segment) =>
        (!(segment.votes <= filters.minVotes || segment.votes >= filters.maxVotes)
            || (segment.views <= filters.minViews || segment.views >= filters.maxViews)
            || (filters.locked && segment.locked)
            || (filters.hidden && segment.hidden)
            || (filters.ignored && (segment.hidden || segment.shadowHidden))
        )
        // return false if any of the conditions are met
        // return true if none of the conditions are met
    );
    return {
        segmentCount: filteredSegments.length,
        page,
        segments: filteredSegments.slice(startIndex, endIndex)
    };
}


async function endpoint(req: Request, res: Response): Promise<Response> {
    try {
        const segmentResponse = await handleGetSegments(req, res);
        // If false, res.send has already been called
        if (segmentResponse) {
            //send result
            return res.send(segmentResponse);
        }
    } catch (err) {
        if (err instanceof SyntaxError) {
            return res.status(400).send("Invalid array in parameters");
        } else return res.sendStatus(500);
    }
}

export {
    endpoint
};

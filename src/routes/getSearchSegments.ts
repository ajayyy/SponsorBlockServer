import { Request, Response } from "express";
import { db } from "../databases/databases";
import { ActionType, Category, DBSegment, Service, VideoID, SortableFields } from "../types/segments.model";
import { getService } from "../utils/getService";
const maxSegmentsPerPage = 100;
const defaultSegmentsPerPage = 10;

type searchSegmentResponse = {
    segmentCount: number,
    page: number,
    segments: DBSegment[]
};

function getSegmentsFromDBByVideoID(videoID: VideoID, service: Service): Promise<DBSegment[]> {
    return db.prepare(
        "all",
        `SELECT "UUID", "timeSubmitted", "startTime", "endTime", "category", "actionType", "votes", "views", "locked", "hidden", "shadowHidden", "userID", "description" FROM "sponsorTimes" 
        WHERE "videoID" = ? AND "service" = ? ORDER BY "timeSubmitted"`,
        [videoID, service]
    ) as Promise<DBSegment[]>;
}

function getSortField<T extends string>(...value: T[]): SortableFields {
    const fieldByName = Object.values(SortableFields).reduce((acc, fieldName) => {
        acc[fieldName.toLowerCase()] = fieldName;

        return acc;
    }, {} as Record<string, SortableFields>);

    for (const name of value) {
        if (name?.trim()?.toLowerCase() in fieldByName) {
            return fieldByName[name.trim().toLowerCase()];
        }
    }

    return SortableFields.timeSubmitted;
}

function getLimit<T extends string>(value: T): number {
    const limit = Number(value);
    if (Number.isInteger(limit)
        && limit >= 1
        && limit <= maxSegmentsPerPage) {
        return limit;
    }

    return defaultSegmentsPerPage;
}

function getPage<T extends string>(value: T): number {
    const page = Number(value);
    if (Number.isInteger(page) && page >= 0) {
        return page;
    }

    return 0;
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
    const categories: Category[] = req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category]
            : [];
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

    const service = getService(req.query.service, req.body.service);

    const page: number = getPage(req.query.page ?? req.body.page);
    const limit: number = getLimit(req.query.limit ?? req.body.limit);
    const sortBy: SortableFields = getSortField(req.query.sortBy, req.body.sortBy);
    const sortDir: string = req.query.sortDir ?? req.body.sortDir ?? "asc";

    const minVotes: number = req.query.minVotes ?? req.body.minVotes ?? -3;
    const maxVotes: number = req.query.maxVotes ?? req.body.maxVotes ?? Infinity;

    const minViews: number = req.query.minViews ?? req.body.minViews ?? -1;
    const maxViews: number = req.query.maxViews ?? req.body.maxViews ?? Infinity;

    const locked: boolean = (req.query.locked ?? req.body.locked ?? "") !== "false";
    const hidden: boolean = (req.query.hidden ?? req.body.hidden ?? "") !== "false";
    const ignored: boolean = (req.query.ignored ?? req.body.ignored ?? "") !== "false";

    const filters = {
        minVotes,
        maxVotes,
        minViews,
        maxViews,
        locked,
        hidden,
        ignored,
        categories,
        actionTypes
    };

    const segments = await getSegmentsFromDBByVideoID(videoID, service);

    if (!segments?.length) {
        res.sendStatus(404);
        return false;
    }

    return filterSegments(segments, filters, page, limit, sortBy, sortDir);
}
function filterSegments(segments: DBSegment[], filters: Record<string, any>, page: number, limit: number, sortBy: SortableFields, sortDir: string) {
    const startIndex = 0+(page*limit);
    const endIndex = limit+(page*limit);
    const filteredSegments = segments.filter((segment) =>
        !((segment.votes < filters.minVotes || segment.votes > filters.maxVotes)
            || (segment.views < filters.minViews || segment.views > filters.maxViews)
            || (!filters.locked && segment.locked)
            || (!filters.hidden && segment.hidden)
            || (!filters.ignored && ((segment.votes <= -2) || segment.hidden || segment.shadowHidden))
            || (filters.categories.length > 0 && !filters.categories.includes(segment.category)))
        // return false if any of the conditions are met
        // return true if none of the conditions are met
    );

    if (sortBy !== SortableFields.timeSubmitted) {
        /* istanbul ignore next */
        filteredSegments.sort((a,b) => {
            const key = sortDir === "desc" ? 1 : -1;
            if (a[sortBy] < b[sortBy]) {
                return key;
            }

            if (a[sortBy] > b[sortBy]) {
                return -key;
            }

            return 0;
        });
    }

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
        /* istanbul ignore next */
        if (err instanceof SyntaxError) {
            return res.status(400).send("Invalid array in parameters");
        } else return res.sendStatus(500);
    }
}

export {
    endpoint
};

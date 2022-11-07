import { Request, Response } from "express";
import { partition } from "lodash";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";
import { skipSegmentsHashKey, skipSegmentsKey, skipSegmentGroupsKey, shadowHiddenIPKey } from "../utils/redisKeys";
import { SBRecord } from "../types/lib.model";
import { ActionType, Category, DBSegment, HashedIP, IPAddress, OverlappingSegmentGroup, Segment, SegmentCache, SegmentUUID, Service, VideoData, VideoID, VideoIDHash, Visibility, VotableObject } from "../types/segments.model";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { Logger } from "../utils/logger";
import { QueryCacher } from "../utils/queryCacher";
import { getReputation } from "../utils/reputation";
import { getService } from "../utils/getService";
import { promiseOrTimeout } from "../utils/promise";
import { segmentOverlapping } from "../utils/segments";


async function prepareCategorySegments(req: Request, videoID: VideoID, service: Service, segments: DBSegment[], cache: SegmentCache = { shadowHiddenSegmentIPs: {} }, useCache: boolean): Promise<Segment[]> {
    const shouldFilter: boolean[] = await Promise.all(segments.map(async (segment) => {
        if (segment.required) {
            return true; //required - always send
        }

        if (segment.hidden || segment.votes < -1) {
            return false; //too untrustworthy, just ignore it
        }

        //check if shadowHidden
        //this means it is hidden to everyone but the original ip that submitted it
        if (segment.shadowHidden != Visibility.HIDDEN) {
            return true;
        }

        if (cache.shadowHiddenSegmentIPs[videoID] === undefined) cache.shadowHiddenSegmentIPs[videoID] = {};
        if (cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted] === undefined) {
            if (cache.userHashedIP === undefined && cache.userHashedIPPromise === undefined) {
                cache.userHashedIPPromise = getHashCache((getIP(req) + config.globalSalt) as IPAddress);
            }

            const service = getService(req?.query?.service as string);
            const fetchData = () => privateDB.prepare("all", 'SELECT "hashedIP" FROM "sponsorTimes" WHERE "videoID" = ? AND "timeSubmitted" = ? AND "service" = ?',
                [videoID, segment.timeSubmitted, service], { useReplica: true }) as Promise<{ hashedIP: HashedIP }[]>;
            try {
                cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted] = await promiseOrTimeout(QueryCacher.get(fetchData, shadowHiddenIPKey(videoID, segment.timeSubmitted, service)), 150);
            } catch (e) {
                // give up on shadowhide for now
                cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted] = null;
            }
        }

        const ipList = cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted];

        if (ipList?.length > 0 && cache.userHashedIP === undefined) {
            cache.userHashedIP = await cache.userHashedIPPromise;
        }
        //if this isn't their ip, don't send it to them
        const shouldShadowHide = cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted]?.some(
            (shadowHiddenSegment) => shadowHiddenSegment.hashedIP === cache.userHashedIP) ?? false;

        if (shouldShadowHide) useCache = false;
        return shouldShadowHide;
    }));

    const filteredSegments = segments.filter((_, index) => shouldFilter[index]);

    return (await chooseSegments(videoID, service, filteredSegments, useCache)).map((chosenSegment) => ({
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

async function getSegmentsByVideoID(req: Request, videoID: VideoID, categories: Category[],
    actionTypes: ActionType[], requiredSegments: SegmentUUID[], service: Service): Promise<Segment[]> {
    const cache: SegmentCache = { shadowHiddenSegmentIPs: {} };

    // For old clients
    const forcePoiAsSkip = !actionTypes.includes(ActionType.Poi) && categories.includes("poi_highlight" as Category);
    if (forcePoiAsSkip) {
        actionTypes.push(ActionType.Poi);
    }

    try {
        categories = categories.filter((category) => !/[^a-z|_|-]/.test(category));
        if (categories.length === 0) return null;

        const segments: DBSegment[] = (await getSegmentsFromDBByVideoID(videoID, service))
            .map((segment: DBSegment) => {
                if (filterRequiredSegments(segment.UUID, requiredSegments)) segment.required = true;
                return segment;
            }, {});

        const canUseCache = requiredSegments.length === 0;
        let processedSegments: Segment[] = (await prepareCategorySegments(req, videoID, service, segments, cache, canUseCache))
            .filter((segment: Segment) => categories.includes(segment?.category) && (actionTypes.includes(segment?.actionType)));

        if (forcePoiAsSkip) {
            processedSegments = processedSegments.map((segment) => ({
                ...segment,
                actionType: segment.actionType === ActionType.Poi ? ActionType.Skip : segment.actionType
            }));
        }

        return processedSegments;
    } catch (err) /* istanbul ignore next */ {
        if (err) {
            Logger.error(err as string);
            return null;
        }
    }
}

async function getSegmentsByHash(req: Request, hashedVideoIDPrefix: VideoIDHash, categories: Category[],
    actionTypes: ActionType[], requiredSegments: SegmentUUID[], service: Service): Promise<SBRecord<VideoID, VideoData>> {
    const cache: SegmentCache = { shadowHiddenSegmentIPs: {} };
    const segments: SBRecord<VideoID, VideoData> = {};

    // For old clients
    const forcePoiAsSkip = !actionTypes.includes(ActionType.Poi) && categories.includes("poi_highlight" as Category);
    if (forcePoiAsSkip) {
        actionTypes.push(ActionType.Poi);
    }

    try {
        type SegmentWithHashPerVideoID = SBRecord<VideoID, { hash: VideoIDHash, segments: DBSegment[] }>;

        categories = categories.filter((category) => !(/[^a-z|_|-]/.test(category)));
        if (categories.length === 0) return null;

        const segmentPerVideoID: SegmentWithHashPerVideoID = (await getSegmentsFromDBByHash(hashedVideoIDPrefix, service))
            .reduce((acc: SegmentWithHashPerVideoID, segment: DBSegment) => {
                acc[segment.videoID] = acc[segment.videoID] || {
                    hash: segment.hashedVideoID,
                    segments: []
                };
                if (filterRequiredSegments(segment.UUID, requiredSegments)) segment.required = true;

                acc[segment.videoID].segments ??= [];
                acc[segment.videoID].segments.push(segment);

                return acc;
            }, {});

        await Promise.all(Object.entries(segmentPerVideoID).map(async ([videoID, videoData]) => {
            const data: VideoData = {
                hash: videoData.hash,
                segments: [],
            };

            const canUseCache = requiredSegments.length === 0;
            data.segments = (await prepareCategorySegments(req, videoID as VideoID, service, videoData.segments, cache, canUseCache))
                .filter((segment: Segment) => categories.includes(segment?.category) && actionTypes.includes(segment?.actionType));

            if (forcePoiAsSkip) {
                data.segments = data.segments.map((segment) => ({
                    ...segment,
                    actionType: segment.actionType === ActionType.Poi ? ActionType.Skip : segment.actionType
                }));
            }

            if (data.segments.length > 0) {
                segments[videoID] = data;
            }
        }));

        return segments;
    } catch (err) /* istanbul ignore next */ {
        Logger.error(err as string);
        return null;
    }
}

async function getSegmentsFromDBByHash(hashedVideoIDPrefix: VideoIDHash, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            "all",
            `SELECT "videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "category", "actionType", "videoDuration", "hidden", "reputation", "shadowHidden", "hashedVideoID", "timeSubmitted", "description" FROM "sponsorTimes"
            WHERE "hashedVideoID" LIKE ? AND "service" = ? ORDER BY "startTime"`,
            [`${hashedVideoIDPrefix}%`, service],
            { useReplica: true }
        ) as Promise<DBSegment[]>;

    if (hashedVideoIDPrefix.length === 4) {
        return await QueryCacher.get(fetchFromDB, skipSegmentsHashKey(hashedVideoIDPrefix, service));
    }

    return await fetchFromDB();
}

async function getSegmentsFromDBByVideoID(videoID: VideoID, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            "all",
            `SELECT "startTime", "endTime", "votes", "locked", "UUID", "userID", "category", "actionType", "videoDuration", "hidden", "reputation", "shadowHidden", "timeSubmitted", "description" FROM "sponsorTimes" 
            WHERE "videoID" = ? AND "service" = ? ORDER BY "startTime"`,
            [videoID, service],
            { useReplica: true }
        ) as Promise<DBSegment[]>;

    return await QueryCacher.get(fetchFromDB, skipSegmentsKey(videoID, service));
}

// Gets a weighted random choice from the choices array based on their `votes` property.
// amountOfChoices specifies the maximum amount of choices to return, 1 or more.
// Choices are unique
// If a predicate is given, it will only filter choices following it, and will leave the rest in the list
function getWeightedRandomChoice<T extends VotableObject>(choices: T[], amountOfChoices: number, filterLocked = false, predicate?: (choice: T) => void): T[] {
    //trivial case: no need to go through the whole process
    if (amountOfChoices >= choices.length) {
        return choices;
    }

    type TWithWeight = T & {
        weight: number
    }

    let forceIncludedChoices: T[] = [];
    let filteredChoices = choices;
    if (predicate) {
        const splitArray = partition(choices, predicate);
        filteredChoices = splitArray[0];
        forceIncludedChoices = splitArray[1];

        if (filterLocked && filteredChoices.some((value) => value.locked)) {
            filteredChoices = filteredChoices.filter((value) => value.locked);
        }
    }

    //assign a weight to each choice
    let totalWeight = 0;
    const choicesWithWeights: TWithWeight[] = filteredChoices.map(choice => {
        const boost = Math.min(choice.reputation, 4);

        //The 3 makes -2 the minimum votes before being ignored completely
        //this can be changed if this system increases in popularity.
        const repFactor = choice.votes > 0 ? Math.max(1, choice.reputation + 1) : 1;
        const weight = Math.exp(choice.votes * repFactor + 3 + boost);
        totalWeight += Math.max(weight, 0);

        return { ...choice, weight };
    });

    // Nothing to filter for
    if (amountOfChoices >= choicesWithWeights.length) {
        return [...forceIncludedChoices, ...filteredChoices];
    }

    //iterate and find amountOfChoices choices
    const chosen = [...forceIncludedChoices];
    while (amountOfChoices-- > 0) {
        //weighted random draw of one element of choices
        const randomNumber = Math.random() * totalWeight;
        let stackWeight = choicesWithWeights[0].weight;
        let i = 0;
        while (stackWeight < randomNumber) {
            stackWeight += choicesWithWeights[++i].weight;
        }

        //add it to the chosen ones and remove it from the choices before the next iteration
        chosen.push(choicesWithWeights[i]);
        totalWeight -= choicesWithWeights[i].weight;
        choicesWithWeights.splice(i, 1);
    }

    return chosen;
}

async function chooseSegments(videoID: VideoID, service: Service, segments: DBSegment[], useCache: boolean): Promise<DBSegment[]> {
    const fetchData = async () => await buildSegmentGroups(segments);

    const groups = useCache
        ? await QueryCacher.get(fetchData, skipSegmentGroupsKey(videoID, service))
        : await fetchData();

    // Filter for only 1 item for POI categories and Full video
    let chosenGroups = getWeightedRandomChoice(groups, 1, true, (choice) => choice.segments[0].actionType === ActionType.Full);
    chosenGroups = getWeightedRandomChoice(chosenGroups, 1, true, (choice) => choice.segments[0].actionType === ActionType.Poi);
    return chosenGroups.map(//randomly choose 1 good segment per group and return them
        group => getWeightedRandomChoice(group.segments, 1)[0]
    );
}

//This function will find segments that are contained inside of eachother, called similar segments
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Segments with less than -1 votes are already ignored before this function is called
async function buildSegmentGroups(segments: DBSegment[]): Promise<OverlappingSegmentGroup[]> {
    const reputationPromises = segments.map(segment =>
        segment.userID ? getReputation(segment.userID).catch((e) => Logger.error(e)) : null);

    //Create groups of segments that are similar to eachother
    //Segments must be sorted by their startTime so that we can build groups chronologically:
    //1. As long as the segments' startTime fall inside the currentGroup, we keep adding them to that group
    //2. If a segment starts after the end of the currentGroup (> cursor), no other segment will ever fall
    //   inside that group (because they're sorted) so we can create a new one
    let overlappingSegmentsGroups: OverlappingSegmentGroup[] = [];
    let currentGroup: OverlappingSegmentGroup;
    let cursor = -1; //-1 to make sure that, even if the 1st segment starts at 0, a new group is created
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment.startTime >= cursor) {
            currentGroup = { segments: [], votes: 0, reputation: 0, locked: false, required: false };
            overlappingSegmentsGroups.push(currentGroup);
        }

        currentGroup.segments.push(segment);
        //only if it is a positive vote, otherwise it is probably just a sponsor time with slightly wrong time
        if (segment.votes > 0) {
            currentGroup.votes += segment.votes;
        }

        if (segment.userID) segment.reputation = Math.min(segment.reputation, (await reputationPromises[i]) || Infinity);
        if (segment.reputation > 0) {
            currentGroup.reputation += segment.reputation;
        }

        if (segment.locked) {
            currentGroup.locked = true;
        }

        if (segment.required) {
            currentGroup.required = true;
        }

        cursor = Math.max(cursor, segment.endTime);
    }

    overlappingSegmentsGroups = splitPercentOverlap(overlappingSegmentsGroups);
    overlappingSegmentsGroups.forEach((group) => {
        if (group.required) {
            // Required beats locked
            group.segments = group.segments.filter((segment) => segment.required);
        } else if (group.locked) {
            group.segments = group.segments.filter((segment) => segment.locked);
        }

        group.reputation = group.reputation / group.segments.length;
    });

    //if there are too many groups, find the best ones
    return overlappingSegmentsGroups;
}

function splitPercentOverlap(groups: OverlappingSegmentGroup[]): OverlappingSegmentGroup[] {
    return groups.flatMap((group) => {
        const result: OverlappingSegmentGroup[] = [];
        group.segments.forEach((segment) => {
            const bestGroup = result.find((group) => {
                // At least one segment in the group must have high % overlap or the same action type
                // Since POI and Full video segments will always have <= 0 overlap, they will always be in their own groups
                return group.segments.some((compareSegment) => segmentOverlapping(segment, compareSegment));
            });

            if (bestGroup) {
                bestGroup.segments.push(segment);
                bestGroup.votes += segment.votes;
                bestGroup.reputation += segment.reputation;
                bestGroup.locked ||= segment.locked;
                bestGroup.required ||= segment.required;
            } else {
                result.push({ segments: [segment], votes: segment.votes, reputation: segment.reputation, locked: segment.locked, required: segment.required });
            }
        });

        return result;
    });
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
async function handleGetSegments(req: Request, res: Response): Promise<Segment[] | false> {
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

    const requiredSegments: SegmentUUID[] = req.query.requiredSegments
        ? JSON.parse(req.query.requiredSegments as string)
        : req.query.requiredSegment
            ? Array.isArray(req.query.requiredSegment)
                ? req.query.requiredSegment
                : [req.query.requiredSegment]
            : [];
    if (!Array.isArray(requiredSegments)) {
        res.status(400).send("requiredSegments parameter does not match format requirements.");
        return false;
    }

    const service = getService(req.query.service, req.body.service);

    const segments = await getSegmentsByVideoID(req, videoID, categories, actionTypes, requiredSegments, service);

    if (segments === null || segments === undefined) {
        res.sendStatus(500);
        return false;
    }

    if (segments.length === 0) {
        res.sendStatus(404);
        return false;
    }

    return segments;
}

const filterRequiredSegments = (UUID: SegmentUUID, requiredSegments: SegmentUUID[]): boolean => {
    for (const search of requiredSegments) {
        if (search === UUID || UUID.indexOf(search) == 0) return true;
    }
    return false;
};

async function endpoint(req: Request, res: Response): Promise<Response> {
    try {
        const segments = await handleGetSegments(req, res);

        // If false, res.send has already been called
        if (segments) {
            //send result
            return res.send(segments);
        }
    } catch (err) /* istanbul ignore next */ {
        if (err instanceof SyntaxError) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        } else return res.sendStatus(500);
    }
}

export {
    getSegmentsByVideoID,
    getSegmentsByHash,
    endpoint,
    handleGetSegments
};

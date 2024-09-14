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
import { parseSkipSegments } from "../utils/parseSkipSegments";
import { getEtag } from "../middleware/etag";
import { shuffleArray } from "../utils/array";
import { Postgres } from "../databases/Postgres";
import { getRedisStats } from "../utils/redis";

async function prepareCategorySegments(req: Request, videoID: VideoID, service: Service, segments: DBSegment[], cache: SegmentCache = { shadowHiddenSegmentIPs: {} }, useCache: boolean): Promise<Segment[]> {
    const shouldFilter: boolean[] = await Promise.all(segments.map(async (segment) => {
        if (segment.required) {
            return true; //required - always send
        }

        if (segment.hidden
                || segment.votes < -1
                || segment.shadowHidden === Visibility.MORE_HIDDEN) {
            return false; //too untrustworthy, just ignore it
        }

        //check if shadowHidden
        //this means it is hidden to everyone but the original ip that submitted it
        if (segment.shadowHidden === Visibility.VISIBLE) {
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
                if (db.highLoad() || privateDB.highLoad()) {
                    Logger.error("High load, not handling shadowhide");
                    if (db instanceof Postgres && privateDB instanceof Postgres) {
                        Logger.error(`Postgres stats: ${JSON.stringify(db.getStats())}`);
                        Logger.error(`Postgres private stats: ${JSON.stringify(privateDB.getStats())}`);
                    }
                    Logger.error(`Redis stats: ${JSON.stringify(getRedisStats())}`);
                    return false;
                }

                cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted] = promiseOrTimeout(QueryCacher.get(fetchData, shadowHiddenIPKey(videoID, segment.timeSubmitted, service)), 150);
            } catch (e) {
                // give up on shadowhide for now
                cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted] = null;
            }
        }

        let ipList = [];
        try {
            ipList = await cache.shadowHiddenSegmentIPs[videoID][segment.timeSubmitted];
        } catch (e) {
            Logger.error(`skipSegments: Error while trying to find IP: ${e}`);
            if (db instanceof Postgres && privateDB instanceof Postgres) {
                Logger.error(`Postgres stats: ${JSON.stringify(db.getStats())}`);
                Logger.error(`Postgres private stats: ${JSON.stringify(privateDB.getStats())}`);
            }

            return false;
        }

        if (ipList?.length > 0 && cache.userHashedIP === undefined) {
            cache.userHashedIP = await cache.userHashedIPPromise;
        }
        //if this isn't their ip, don't send it to them
        const shouldShadowHide = ipList?.some(
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
        const segments: DBSegment[] = (await getSegmentsFromDBByVideoID(videoID, service))
            .map((segment: DBSegment) => {
                if (filterRequiredSegments(segment.UUID, requiredSegments)) segment.required = true;
                return segment;
            }, {});

        const canUseCache = requiredSegments.length === 0;
        let processedSegments: Segment[] = (await prepareCategorySegments(req, videoID, service, segments, cache, canUseCache))
            .filter((segment: Segment) => categories.includes(segment?.category) && (actionTypes.includes(segment?.actionType)))
            .map((segment: Segment) => ({
                category: segment.category,
                actionType: segment.actionType,
                segment: segment.segment,
                UUID: segment.UUID,
                videoDuration: segment.videoDuration,
                locked: segment.locked,
                votes: segment.votes,
                description: segment.description
            }));

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
        type SegmentPerVideoID = SBRecord<VideoID, { segments: DBSegment[] }>;

        const segmentPerVideoID: SegmentPerVideoID = (await getSegmentsFromDBByHash(hashedVideoIDPrefix, service))
            .reduce((acc: SegmentPerVideoID, segment: DBSegment) => {
                acc[segment.videoID] = acc[segment.videoID] || {
                    segments: []
                };
                if (filterRequiredSegments(segment.UUID, requiredSegments)) segment.required = true;

                acc[segment.videoID].segments ??= [];
                acc[segment.videoID].segments.push(segment);

                return acc;
            }, {});

        await Promise.all(Object.entries(segmentPerVideoID).map(async ([videoID, videoData]) => {
            const data: VideoData = {
                segments: [],
            };

            const canUseCache = requiredSegments.length === 0;
            data.segments = (await prepareCategorySegments(req, videoID as VideoID, service, videoData.segments, cache, canUseCache))
                .filter((segment: Segment) => categories.includes(segment?.category) && actionTypes.includes(segment?.actionType))
                .map((segment) => ({
                    category: segment.category,
                    actionType: segment.actionType,
                    segment: segment.segment,
                    UUID: segment.UUID,
                    videoDuration: segment.videoDuration,
                    locked: segment.locked,
                    votes: segment.votes,
                    description: segment.description
                }));

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
        Logger.error(`get segments by hash error: ${err}`);
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

// Gets the best choice from the choices array based on their `votes` property.
// amountOfChoices specifies the maximum amount of choices to return, 1 or more.
// Choices are unique
// If a predicate is given, it will only filter choices following it, and will leave the rest in the list
function getBestChoice<T extends VotableObject>(choices: T[], amountOfChoices: number, filterLocked = false, predicate?: (choice: T) => void): T[] {
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
    const choicesWithWeights: TWithWeight[] = shuffleArray(filteredChoices.map(choice => {
        const boost = choice.reputation;

        const weight = choice.votes + boost;
        return { ...choice, weight };
    })).sort((a, b) => b.weight - a.weight);

    // Nothing to filter for
    if (amountOfChoices >= choicesWithWeights.length) {
        return [...forceIncludedChoices, ...filteredChoices];
    }

    // Pick the top options
    const chosen = [...forceIncludedChoices];
    for (let i = 0; i < amountOfChoices; i++) {
        chosen.push(choicesWithWeights[i]);
    }

    return chosen;
}

async function chooseSegments(videoID: VideoID, service: Service, segments: DBSegment[], useCache: boolean): Promise<DBSegment[]> {
    const fetchData = async () => await buildSegmentGroups(segments);

    const groups = useCache && config.useCacheForSegmentGroups
        ? await QueryCacher.get(fetchData, skipSegmentGroupsKey(videoID, service))
        : await fetchData();

    // Filter for only 1 item for POI categories and Full video
    let chosenGroups = getBestChoice(groups, 1, true, (choice) => choice.segments[0].actionType === ActionType.Full);
    chosenGroups = getBestChoice(chosenGroups, 1, true, (choice) => choice.segments[0].actionType === ActionType.Poi);
    return chosenGroups.map(// choose 1 good segment per group and return them
        group => getBestChoice(group.segments, 1)[0]
    );
}

//This function will find segments that are contained inside of eachother, called similar segments
//Only one similar time will be returned, based on its score
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Segments with less than -1 votes are already ignored before this function is called
async function buildSegmentGroups(segments: DBSegment[]): Promise<OverlappingSegmentGroup[]> {
    const reputationPromises = segments.map(segment =>
        segment.userID && !db.highLoad() ? getReputation(segment.userID).catch((e) => Logger.error(e)) : null);

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
                return group.segments.some((compareSegment) => {
                    const overlap = Math.min(segment.endTime, compareSegment.endTime) - Math.max(segment.startTime, compareSegment.startTime);
                    const overallDuration = Math.max(segment.endTime, compareSegment.endTime) - Math.min(segment.startTime, compareSegment.startTime);
                    const overlapPercent = overlap / overallDuration;
                    return (overlapPercent >= 0.1 && segment.actionType === compareSegment.actionType && segment.category === compareSegment.category && segment.actionType !== ActionType.Chapter)
                        || (overlapPercent >= 0.6 && segment.actionType !== compareSegment.actionType && segment.category === compareSegment.category)
                        || (overlapPercent >= 0.8 && segment.actionType === ActionType.Chapter && compareSegment.actionType === ActionType.Chapter);
                });
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

async function getSkipSegments(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    if (!videoID) {
        return res.status(400).send("videoID not specified");
    }

    const parseResult = parseSkipSegments(req);
    if (parseResult.errors.length > 0) {
        return res.status(400).send(parseResult.errors);
    }

    const { categories, actionTypes, requiredSegments, service } = parseResult;
    const segments = await getSegmentsByVideoID(req, videoID, categories, actionTypes, requiredSegments, service);

    if (segments === null || segments === undefined) {
        return res.sendStatus(500);
    } else if (segments.length === 0) {
        return res.sendStatus(404);
    }

    await getEtag("skipSegments", (videoID as string), service)
        .then(etag => res.set("ETag", etag))
        .catch(() => null);
    return res.send(segments);
}

async function oldGetVideoSponsorTimes(req: Request, res: Response): Promise<Response> {
    const videoID = req.query.videoID as VideoID;
    if (!videoID) {
        return res.status(400).send("videoID not specified");
    }

    const segments = await getSegmentsByVideoID(req, videoID, ["sponsor"] as Category[], [ActionType.Skip], [], Service.YouTube);

    if (segments === null || segments === undefined) {
        return res.sendStatus(500);
    } else if (segments.length === 0) {
        return res.sendStatus(404);
    }

    // Convert to old outputs
    const sponsorTimes = [];
    const UUIDs = [];

    for (const segment of segments) {
        sponsorTimes.push(segment.segment);
        UUIDs.push(segment.UUID);
    }

    return res.send({
        sponsorTimes,
        UUIDs,
    });
}

const filterRequiredSegments = (UUID: SegmentUUID, requiredSegments: SegmentUUID[]): boolean => {
    for (const search of requiredSegments) {
        if (search === UUID || UUID.indexOf(search) == 0) return true;
    }
    return false;
};

export {
    getSegmentsByVideoID,
    getSegmentsByHash,
    getSkipSegments,
    oldGetVideoSponsorTimes
};

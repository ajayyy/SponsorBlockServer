import { Request, Response } from 'express';
import { config } from '../config';
import { db, privateDB } from '../databases/databases';
import { skipSegmentsHashKey, skipSegmentsKey } from '../utils/redisKeys';
import { SBRecord } from '../types/lib.model';
import { ActionType, Category, CategoryActionType, DBSegment, HashedIP, IPAddress, OverlappingSegmentGroup, Segment, SegmentCache, SegmentUUID, Service, VideoData, VideoID, VideoIDHash, Visibility, VotableObject } from "../types/segments.model";
import { getCategoryActionType } from '../utils/categoryInfo';
import { getHash } from '../utils/getHash';
import { getIP } from '../utils/getIP';
import { Logger } from '../utils/logger';
import { QueryCacher } from '../utils/queryCacher';
import { getReputation } from '../utils/reputation';


async function prepareCategorySegments(req: Request, videoID: VideoID, segments: DBSegment[], cache: SegmentCache = {shadowHiddenSegmentIPs: {}}): Promise<Segment[]> {
    const shouldFilter: boolean[] = await Promise.all(segments.map(async (segment) => {
        if (segment.votes < -1 && !segment.required) {
            return false; //too untrustworthy, just ignore it
        }

        //check if shadowHidden
        //this means it is hidden to everyone but the original ip that submitted it
        if (segment.shadowHidden != Visibility.HIDDEN) {
            return true;
        }

        if (cache.shadowHiddenSegmentIPs[videoID] === undefined) {
            cache.shadowHiddenSegmentIPs[videoID] = await privateDB.prepare('all', 'SELECT "hashedIP" FROM "sponsorTimes" WHERE "videoID" = ?', [videoID]) as { hashedIP: HashedIP }[];
        }

        //if this isn't their ip, don't send it to them
        return cache.shadowHiddenSegmentIPs[videoID].some((shadowHiddenSegment) => {
            if (cache.userHashedIP === undefined) {
                //hash the IP only if it's strictly necessary
                cache.userHashedIP = getHash((getIP(req) + config.globalSalt) as IPAddress);
            }

            return shadowHiddenSegment.hashedIP === cache.userHashedIP;
        });
    }));
    
    const filteredSegments = segments.filter((_, index) => shouldFilter[index]);

    const maxSegments = getCategoryActionType(segments[0]?.category) === CategoryActionType.Skippable ? 32 : 1;
    return (await chooseSegments(filteredSegments, maxSegments)).map((chosenSegment) => ({
        category: chosenSegment.category,
        actionType: chosenSegment.actionType,
        segment: [chosenSegment.startTime, chosenSegment.endTime],
        UUID: chosenSegment.UUID,
        videoDuration: chosenSegment.videoDuration
    }));
}

async function getSegmentsByVideoID(req: Request, videoID: VideoID, categories: Category[], 
        actionTypes: ActionType[], requiredSegments: SegmentUUID[], service: Service): Promise<Segment[]> {
    const cache: SegmentCache = {shadowHiddenSegmentIPs: {}};
    const segments: Segment[] = [];

    try {
        categories = categories.filter((category) => !/[^a-z|_|-]/.test(category));
        if (categories.length === 0) return null;

        const segmentsByType: SBRecord<string, DBSegment[]> = (await getSegmentsFromDBByVideoID(videoID, service))
            .filter((segment: DBSegment) => categories.includes(segment?.category) && actionTypes.includes(segment?.actionType))
            .reduce((acc: SBRecord<Category, DBSegment[]>, segment: DBSegment) => {
                if (requiredSegments.includes(segment.UUID)) segment.required = true;

                acc[segment.category + segment.actionType] ??= [];
                acc[segment.category + segment.actionType].push(segment);

                return acc;
            }, {});

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_key, typeSegments] of Object.entries(segmentsByType)) {
            segments.push(...(await prepareCategorySegments(req, videoID, typeSegments, cache)));
        }

        return segments;
    } catch (err) {
        if (err) {
            Logger.error(err);
            return null;
        }
    }
}

async function getSegmentsByHash(req: Request, hashedVideoIDPrefix: VideoIDHash, categories: Category[], 
        actionTypes: ActionType[], requiredSegments: SegmentUUID[], service: Service): Promise<SBRecord<VideoID, VideoData>> {
    const cache: SegmentCache = {shadowHiddenSegmentIPs: {}};
    const segments: SBRecord<VideoID, VideoData> = {};

    try {
        type SegmentWithHashPerVideoID = SBRecord<VideoID, {hash: VideoIDHash, segmentPerType: SBRecord<string, DBSegment[]>}>;

        categories = categories.filter((category) => !(/[^a-z|_|-]/.test(category)));
        if (categories.length === 0) return null;

        const segmentPerVideoID: SegmentWithHashPerVideoID = (await getSegmentsFromDBByHash(hashedVideoIDPrefix, service))
            .filter((segment: DBSegment) => categories.includes(segment?.category) && actionTypes.includes(segment?.actionType))
            .reduce((acc: SegmentWithHashPerVideoID, segment: DBSegment) => {
                acc[segment.videoID] = acc[segment.videoID] || {
                    hash: segment.hashedVideoID,
                    segmentPerType: {}
                };
                if (requiredSegments.includes(segment.UUID)) segment.required = true;

                acc[segment.videoID].segmentPerType[segment.category + segment.actionType] ??= [];
                acc[segment.videoID].segmentPerType[segment.category + segment.actionType].push(segment);

                return acc;
            }, {});

        for (const [videoID, videoData] of Object.entries(segmentPerVideoID)) {
            segments[videoID] = {
                hash: videoData.hash,
                segments: [],
            };

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [_key, segmentPerType] of Object.entries(videoData.segmentPerType)) {
                segments[videoID].segments.push(...(await prepareCategorySegments(req, videoID as VideoID, segmentPerType, cache)));
            }
        }

        return segments;
    } catch (err) {
        if (err) {
            Logger.error(err);
            return null;
        }
    }
}

async function getSegmentsFromDBByHash(hashedVideoIDPrefix: VideoIDHash, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            'all',
            `SELECT "videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "category", "actionType", "videoDuration", "reputation", "shadowHidden", "hashedVideoID" FROM "sponsorTimes"
            WHERE "hashedVideoID" LIKE ? AND "service" = ? AND "hidden" = 0 ORDER BY "startTime"`,
            [hashedVideoIDPrefix + '%', service]
        ) as Promise<DBSegment[]>;

    if (hashedVideoIDPrefix.length === 4) {
        return await QueryCacher.get(fetchFromDB, skipSegmentsHashKey(hashedVideoIDPrefix, service));
    }

    return await fetchFromDB();
}

async function getSegmentsFromDBByVideoID(videoID: VideoID, service: Service): Promise<DBSegment[]> {
    const fetchFromDB = () => db
        .prepare(
            'all',
            `SELECT "startTime", "endTime", "votes", "locked", "UUID", "userID", "category", "actionType", "videoDuration", "reputation", "shadowHidden" FROM "sponsorTimes" 
            WHERE "videoID" = ? AND "service" = ? AND "hidden" = 0 ORDER BY "startTime"`,
            [videoID, service]
        ) as Promise<DBSegment[]>;

    return await QueryCacher.get(fetchFromDB, skipSegmentsKey(videoID, service));
}

//gets a weighted random choice from the choices array based on their `votes` property.
//amountOfChoices specifies the maximum amount of choices to return, 1 or more.
//choices are unique
function getWeightedRandomChoice<T extends VotableObject>(choices: T[], amountOfChoices: number): T[] {
    //trivial case: no need to go through the whole process
    if (amountOfChoices >= choices.length) {
        return choices;
    }

    type TWithWeight = T & {
        weight: number
    }

    //assign a weight to each choice
    let totalWeight = 0;
    const choicesWithWeights: TWithWeight[] = choices.map(choice => {
        const boost = Math.min(choice.reputation, 4);

        //The 3 makes -2 the minimum votes before being ignored completely
        //this can be changed if this system increases in popularity.
        const weight = Math.exp(choice.votes * Math.max(1, choice.reputation + 1) + 3 + boost);
        totalWeight += Math.max(weight, 0);

        return {...choice, weight};
    });

    //iterate and find amountOfChoices choices
    const chosen = [];
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

//This function will find segments that are contained inside of eachother, called similar segments
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Segments with less than -1 votes are already ignored before this function is called
async function chooseSegments(segments: DBSegment[], max: number): Promise<DBSegment[]> {
    //Create groups of segments that are similar to eachother
    //Segments must be sorted by their startTime so that we can build groups chronologically:
    //1. As long as the segments' startTime fall inside the currentGroup, we keep adding them to that group
    //2. If a segment starts after the end of the currentGroup (> cursor), no other segment will ever fall
    //   inside that group (because they're sorted) so we can create a new one
    const overlappingSegmentsGroups: OverlappingSegmentGroup[] = [];
    let currentGroup: OverlappingSegmentGroup;
    let cursor = -1; //-1 to make sure that, even if the 1st segment starts at 0, a new group is created
    for (const segment of segments) {
        if (segment.startTime > cursor) {
            currentGroup = {segments: [], votes: 0, reputation: 0, locked: false, required: false};
            overlappingSegmentsGroups.push(currentGroup);
        }

        currentGroup.segments.push(segment);
        //only if it is a positive vote, otherwise it is probably just a sponsor time with slightly wrong time
        if (segment.votes > 0) {
            currentGroup.votes += segment.votes;
        }

        if (segment.userID) segment.reputation = Math.min(segment.reputation, await getReputation(segment.userID));
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
    return getWeightedRandomChoice(overlappingSegmentsGroups, max).map(
        //randomly choose 1 good segment per group and return them
        group => getWeightedRandomChoice(group.segments, 1)[0],
    );
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
    // Default to sponsor
    // If using params instead of JSON, only one category can be pulled
    const categories: Category[] = req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? Array.isArray(req.query.category)
                ? req.query.category
                : [req.query.category]
            : ['sponsor'];
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
    
    let service: Service = req.query.service ?? req.body.service ?? Service.YouTube;
    if (!Object.values(Service).some((val) => val == service)) {
        service = Service.YouTube;
    }

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

async function endpoint(req: Request, res: Response): Promise<Response> {
    try {
        const segments = await handleGetSegments(req, res);

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
    getSegmentsByVideoID,
    getSegmentsByHash,
    endpoint,
    handleGetSegments
};


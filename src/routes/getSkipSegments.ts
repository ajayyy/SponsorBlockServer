import { Request, Response } from 'express';
import { config } from '../config';
import { db, privateDB } from '../databases/databases';
import { Category, DBSegment, OverlappingSegmentGroup, Segment, SegmentCache, VideoData, VideoID, VideoIDHash, VotableObject } from "../types/segments.model";
import { getHash } from '../utils/getHash';
import { getIP } from '../utils/getIP';
import { Logger } from '../utils/logger';


function prepareCategorySegments(req: Request, videoID: VideoID, category: Category, segments: DBSegment[], cache: SegmentCache = {shadowHiddenSegmentIPs: {}}): Segment[] {
    const filteredSegments = segments.filter((segment) => {
        if (segment.votes < -1) {
            return false; //too untrustworthy, just ignore it
        }

        //check if shadowHidden
        //this means it is hidden to everyone but the original ip that submitted it
        if (segment.shadowHidden != 1) {
            return true;
        }

        if (cache.shadowHiddenSegmentIPs[videoID] === undefined) {
            cache.shadowHiddenSegmentIPs[videoID] = privateDB.prepare('all', 'SELECT hashedIP FROM sponsorTimes WHERE videoID = ?', [videoID]);
        }

        //if this isn't their ip, don't send it to them
        return cache.shadowHiddenSegmentIPs[videoID].some((shadowHiddenSegment) => {
            if (cache.userHashedIP === undefined) {
                //hash the IP only if it's strictly necessary
                cache.userHashedIP = getHash(getIP(req) + config.globalSalt);
            }

            return shadowHiddenSegment.hashedIP === cache.userHashedIP;
        });
    });

    return chooseSegments(filteredSegments).map((chosenSegment) => ({
        category,
        segment: [chosenSegment.startTime, chosenSegment.endTime],
        UUID: chosenSegment.UUID
    }));
}

function getSegmentsByVideoID(req: Request, videoID: string, categories: Category[]): Segment[] {
    const cache: SegmentCache = {shadowHiddenSegmentIPs: {}};
    const segments: Segment[] = [];

    try {
        const segmentsByCategory: Record<Category, DBSegment[]> = db
            .prepare(
                'all',
                `SELECT startTime, endTime, votes, UUID, category, shadowHidden FROM sponsorTimes WHERE videoID = ? AND category IN (${Array(categories.length).fill('?').join()}) ORDER BY startTime`,
                [videoID, categories]
            ).reduce((acc: Record<Category, DBSegment[]>, segment: DBSegment) => {
                acc[segment.category] = acc[segment.category] || [];
                acc[segment.category].push(segment);

                return acc;
            }, {});

        for (const [category, categorySegments] of Object.entries(segmentsByCategory)) {
            segments.push(...prepareCategorySegments(req, videoID, category, categorySegments, cache));
        }

        return segments;
    } catch (err) {
        if (err) {
            Logger.error(err);
            return null;
        }
    }
}

function getSegmentsByHash(req: Request, hashedVideoIDPrefix: VideoIDHash, categories: Category[]): Record<VideoID, VideoData> {
    const cache: SegmentCache = {shadowHiddenSegmentIPs: {}};
    const segments: Record<VideoID, VideoData> = {};

    try {
        type SegmentWithHashPerVideoID = Record<VideoID, {hash: VideoIDHash, segmentPerCategory: Record<Category, DBSegment[]>}>;

        const segmentPerVideoID: SegmentWithHashPerVideoID = db
            .prepare(
                'all',
                `SELECT videoID, startTime, endTime, votes, UUID, category, shadowHidden, hashedVideoID FROM sponsorTimes WHERE hashedVideoID LIKE ? AND category IN (${Array(categories.length).fill('?').join()}) ORDER BY startTime`,
                [hashedVideoIDPrefix + '%', categories]
            ).reduce((acc: SegmentWithHashPerVideoID, segment: DBSegment) => {
                acc[segment.videoID] = acc[segment.videoID] || {
                    hash: segment.hashedVideoID,
                    segmentPerCategory: {},
                };
                const videoCategories = acc[segment.videoID].segmentPerCategory;

                videoCategories[segment.category] = videoCategories[segment.category] || [];
                videoCategories[segment.category].push(segment);

                return acc;
            }, {});

        for (const [videoID, videoData] of Object.entries(segmentPerVideoID)) {
            segments[videoID] = {
                hash: videoData.hash,
                segments: [],
            };

            for (const [category, segmentPerCategory] of Object.entries(videoData.segmentPerCategory)) {
                segments[videoID].segments.push(...prepareCategorySegments(req, videoID, category, segmentPerCategory, cache));
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
    let choicesWithWeights: TWithWeight[] = choices.map(choice => {
        //The 3 makes -2 the minimum votes before being ignored completely
        //this can be changed if this system increases in popularity.
        const weight = Math.exp((choice.votes + 3));
        totalWeight += weight;

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
function chooseSegments(segments: DBSegment[]): DBSegment[] {
    //Create groups of segments that are similar to eachother
    //Segments must be sorted by their startTime so that we can build groups chronologically:
    //1. As long as the segments' startTime fall inside the currentGroup, we keep adding them to that group
    //2. If a segment starts after the end of the currentGroup (> cursor), no other segment will ever fall
    //   inside that group (because they're sorted) so we can create a new one
    const overlappingSegmentsGroups: OverlappingSegmentGroup[] = [];
    let currentGroup: OverlappingSegmentGroup;
    let cursor = -1; //-1 to make sure that, even if the 1st segment starts at 0, a new group is created
    segments.forEach(segment => {
        if (segment.startTime > cursor) {
            currentGroup = {segments: [], votes: 0};
            overlappingSegmentsGroups.push(currentGroup);
        }

        currentGroup.segments.push(segment);
        //only if it is a positive vote, otherwise it is probably just a sponsor time with slightly wrong time
        if (segment.votes > 0) {
            currentGroup.votes += segment.votes;
        }

        cursor = Math.max(cursor, segment.endTime);
    });

    //if there are too many groups, find the best 8
    return getWeightedRandomChoice(overlappingSegmentsGroups, 32).map(
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
function handleGetSegments(req: Request, res: Response) {
    const videoID = req.query.videoID as string;
    // Default to sponsor
    // If using params instead of JSON, only one category can be pulled
    const categories = req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? [req.query.category]
            : ['sponsor'];

    const segments = getSegmentsByVideoID(req, videoID, categories);

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

function endpoint(req: Request, res: Response): void {
    let segments = handleGetSegments(req, res);

    if (segments) {
        //send result
        res.send(segments);
    }
}

export {
    getSegmentsByVideoID,
    getSegmentsByHash,
    endpoint,
    handleGetSegments
};


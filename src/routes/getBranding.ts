import { Request, Response } from "express";
import { isEmpty } from "lodash";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";
import { Postgres } from "../databases/Postgres";
import { BrandingDBSubmission, BrandingDBSubmissionData, BrandingHashDBResult, BrandingResult, BrandingSegmentDBResult, BrandingSegmentHashDBResult, ThumbnailDBResult, ThumbnailResult, TitleDBResult, TitleResult } from "../types/branding.model";
import { HashedIP, IPAddress, Service, VideoID, VideoIDHash, Visibility } from "../types/segments.model";
import { shuffleArray } from "../utils/array";
import { getHashCache } from "../utils/getHashCache";
import { getIP } from "../utils/getIP";
import { getService } from "../utils/getService";
import { hashPrefixTester } from "../utils/hashPrefixTester";
import { Logger } from "../utils/logger";
import { promiseOrTimeout } from "../utils/promise";
import { QueryCacher } from "../utils/queryCacher";
import { brandingHashKey, brandingIPKey, brandingKey } from "../utils/redisKeys";
import * as SeedRandom from "seedrandom";

enum BrandingSubmissionType {
    Title = "title",
    Thumbnail = "thumbnail"
}

export async function getVideoBranding(res: Response, videoID: VideoID, service: Service, ip: IPAddress): Promise<BrandingResult> {
    const getTitles = () => db.prepare(
        "all",
        `SELECT "titles"."title", "titles"."original", "titleVotes"."votes", "titleVotes"."locked", "titleVotes"."shadowHidden", "titles"."UUID", "titles"."videoID", "titles"."hashedVideoID"
        FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID"
        WHERE "titles"."videoID" = ? AND "titles"."service" = ? AND "titleVotes"."votes" > -2`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<TitleDBResult[]>;

    const getThumbnails = () => db.prepare(
        "all",
        `SELECT "thumbnailTimestamps"."timestamp", "thumbnails"."original", "thumbnailVotes"."votes", "thumbnailVotes"."locked", "thumbnailVotes"."shadowHidden", "thumbnails"."UUID", "thumbnails"."videoID", "thumbnails"."hashedVideoID"
        FROM "thumbnails" LEFT JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" LEFT JOIN "thumbnailTimestamps" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
        WHERE "thumbnails"."videoID" = ? AND "thumbnails"."service" = ? AND "thumbnailVotes"."votes" > -2`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<ThumbnailDBResult[]>;

    const getSegments = () => db.prepare(
        "all",
        `SELECT "startTime", "endTime", "videoDuration" FROM "sponsorTimes" 
        WHERE "votes" >= 0 AND "shadowHidden" = 0 AND "hidden" = 0 AND "actionType" = 'skip' AND "videoID" = ? AND "service" = ?`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<BrandingSegmentDBResult[]>;

    const getBranding = async () => {
        const titles = getTitles();
        const thumbnails = getThumbnails();
        const segments = getSegments();

        return {
            titles: await titles,
            thumbnails: await thumbnails,
            segments: await segments
        };
    };

    const brandingTrace = await QueryCacher.getTraced(getBranding, brandingKey(videoID, service));
    const branding = brandingTrace.data;

    // Add trace info to request for debugging purposes
    res.setHeader("X-Start-Time", brandingTrace.startTime);
    if (brandingTrace.dbStartTime) res.setHeader("X-DB-Start-Time", brandingTrace.dbStartTime);
    res.setHeader("X-End-Time", brandingTrace.endTime);
    const stats = (db as Postgres)?.getStats?.();
    if (stats) {
        res.setHeader("X-DB-Pool-Total", stats.pool.total);
        res.setHeader("X-DB-Pool-Idle", stats.pool.idle);
        res.setHeader("X-DB-Pool-Waiting", stats.pool.waiting);
    }

    const cache = {
        currentIP: null as Promise<HashedIP> | null
    };

    return filterAndSortBranding(videoID, branding.titles, branding.thumbnails, branding.segments, ip, cache);
}

export async function getVideoBrandingByHash(videoHashPrefix: VideoIDHash, service: Service, ip: IPAddress): Promise<Record<VideoID, BrandingResult>> {
    const getTitles = () => db.prepare(
        "all",
        `SELECT "titles"."title", "titles"."original", "titleVotes"."votes", "titleVotes"."locked", "titleVotes"."shadowHidden", "titles"."UUID", "titles"."videoID", "titles"."hashedVideoID"
        FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID"
        WHERE "titles"."hashedVideoID" LIKE ? AND "titles"."service" = ? AND "titleVotes"."votes" > -2`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<TitleDBResult[]>;

    const getThumbnails = () => db.prepare(
        "all",
        `SELECT "thumbnailTimestamps"."timestamp", "thumbnails"."original", "thumbnailVotes"."votes", "thumbnailVotes"."locked", "thumbnailVotes"."shadowHidden", "thumbnails"."UUID", "thumbnails"."videoID", "thumbnails"."hashedVideoID"
        FROM "thumbnails" LEFT JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" LEFT JOIN "thumbnailTimestamps" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
        WHERE "thumbnails"."hashedVideoID" LIKE ? AND "thumbnails"."service" = ? AND "thumbnailVotes"."votes" > -2`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<ThumbnailDBResult[]>;

    const getSegments = () => db.prepare(
        "all",
        `SELECT "videoID", "startTime", "endTime", "videoDuration" FROM "sponsorTimes" 
        WHERE "votes" >= 0 AND "shadowHidden" = 0 AND "hidden" = 0 AND "actionType" = 'skip' AND "hashedVideoID" LIKE ? AND "service" = ?`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<BrandingSegmentHashDBResult[]>;

    const branding = await QueryCacher.get(async () => {
        // Make sure they are both called in parallel
        const branding = {
            titles: getTitles(),
            thumbnails: getThumbnails(),
            segments: getSegments()
        };

        const dbResult: Record<VideoID, BrandingHashDBResult> = {};
        const initResult = (submission: BrandingDBSubmissionData) => {
            dbResult[submission.videoID] = dbResult[submission.videoID] || {
                titles: [],
                thumbnails: [],
                segments: []
            };
        };

        (await branding.titles).map((title) => {
            initResult(title);
            dbResult[title.videoID].titles.push(title);
        });
        (await branding.thumbnails).map((thumbnail) => {
            initResult(thumbnail);
            dbResult[thumbnail.videoID].thumbnails.push(thumbnail);
        });

        (await branding.segments).map((segment) => {
            initResult(segment);
            dbResult[segment.videoID].segments.push(segment);
        });

        return dbResult;
    }, brandingHashKey(videoHashPrefix, service));


    const cache = {
        currentIP: null as Promise<HashedIP> | null
    };

    const processedResult: Record<VideoID, BrandingResult> = {};
    await Promise.all(Object.keys(branding).map(async (key) => {
        const castedKey = key as VideoID;
        processedResult[castedKey] = await filterAndSortBranding(castedKey, branding[castedKey].titles,
            branding[castedKey].thumbnails, branding[castedKey].segments, ip, cache);
    }));

    return processedResult;
}

async function filterAndSortBranding(videoID: VideoID, dbTitles: TitleDBResult[],
    dbThumbnails: ThumbnailDBResult[], dbSegments: BrandingSegmentDBResult[],
    ip: IPAddress, cache: { currentIP: Promise<HashedIP> | null }): Promise<BrandingResult> {

    const shouldKeepTitles = shouldKeepSubmission(dbTitles, BrandingSubmissionType.Title, ip, cache);
    const shouldKeepThumbnails = shouldKeepSubmission(dbThumbnails, BrandingSubmissionType.Thumbnail, ip, cache);

    const titles = shuffleArray(dbTitles.filter(await shouldKeepTitles))
        .sort((a, b) => b.votes - a.votes)
        .sort((a, b) => b.locked - a.locked)
        .map((r) => ({
            title: r.title,
            original: r.original === 1,
            votes: r.votes,
            locked: r.locked === 1,
            UUID: r.UUID,
        })) as TitleResult[];

    const thumbnails = shuffleArray(dbThumbnails.filter(await shouldKeepThumbnails))
        .sort((a, b) => b.votes - a.votes)
        .sort((a, b) => b.locked - a.locked)
        .map((r) => ({
            timestamp: r.timestamp,
            original: r.original === 1,
            votes: r.votes,
            locked: r.locked === 1,
            UUID: r.UUID
        })) as ThumbnailResult[];

    return {
        titles,
        thumbnails,
        randomTime: findRandomTime(videoID, dbSegments)
    };
}

async function shouldKeepSubmission(submissions: BrandingDBSubmission[], type: BrandingSubmissionType, ip: IPAddress,
    cache: { currentIP: Promise<HashedIP> | null }): Promise<(_: unknown, index: number) => boolean> {

    const shouldKeep = await Promise.all(submissions.map(async (s) => {
        if (s.shadowHidden != Visibility.HIDDEN) return true;
        const table = type === BrandingSubmissionType.Title ? "titleVotes" : "thumbnailVotes";
        const fetchData = () => privateDB.prepare("get", `SELECT "hashedIP" FROM "${table}" WHERE "UUID" = ?`,
            [s.UUID], { useReplica: true }) as Promise<{ hashedIP: HashedIP }>;
        try {
            const submitterIP = await promiseOrTimeout(QueryCacher.get(fetchData, brandingIPKey(s.UUID)), 150);
            if (cache.currentIP === null) cache.currentIP = getHashCache((ip + config.globalSalt) as IPAddress);
            const hashedIP = await cache.currentIP;

            return submitterIP.hashedIP !== hashedIP;
        } catch (e) {
            // give up on shadow hide for now
            return false;
        }
    }));

    return (_, index) => shouldKeep[index];
}

export function findRandomTime(videoID: VideoID, segments: BrandingSegmentDBResult[]): number {
    const randomTime = SeedRandom.alea(videoID)();
    if (segments.length === 0) return randomTime;

    const videoDuration = segments[0].videoDuration;

    // There are segments, treat this as a relative time in the chopped up video
    const sorted = segments.sort((a, b) => a.startTime - b.startTime);
    const emptySegments: [number, number][] = [];
    let totalTime = 0;

    let nextEndTime = -1;
    for (const segment of sorted) {
        if (segment.startTime > nextEndTime) {
            if (nextEndTime !== -1) {
                emptySegments.push([nextEndTime, segment.startTime]);
                totalTime += segment.startTime - nextEndTime;
            }
        }

        nextEndTime = Math.max(segment.endTime, nextEndTime);
    }

    if (nextEndTime < videoDuration) {
        emptySegments.push([nextEndTime, videoDuration]);
        totalTime += videoDuration - nextEndTime;
    }

    let cursor = 0;
    for (const segment of emptySegments) {
        const duration = segment[1] - segment[0];

        if (cursor + duration >= randomTime * totalTime) {
            // Found it
            return (segment[0] + (randomTime * totalTime - cursor)) / videoDuration;
        }

        cursor += duration;
    }

    // Fallback to just the random time
    return randomTime;
}

export async function getBranding(req: Request, res: Response) {
    const videoID: VideoID = req.query.videoID as VideoID;
    const service: Service = getService(req.query.service as string);

    if (!videoID) {
        return res.status(400).send("Missing parameter: videoID");
    }

    const ip = getIP(req);
    try {
        const result = await getVideoBranding(res, videoID, service, ip);

        const status = result.titles.length > 0 || result.thumbnails.length > 0 ? 200 : 404;
        return res.status(status).json(result);
    } catch (e) {
        Logger.error(e as string);
        return res.status(500).send("Internal server error");
    }
}

export async function getBrandingByHashEndpoint(req: Request, res: Response) {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!hashPrefix || !hashPrefixTester(hashPrefix) || hashPrefix.length !== 4) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    const service: Service = getService(req.query.service as string);
    const ip = getIP(req);

    try {
        const result = await getVideoBrandingByHash(hashPrefix, service, ip);

        const status = !isEmpty(result) ? 200 : 404;
        return res.status(status).json(result);
    } catch (e) {
        Logger.error(e as string);
        return res.status(500).send([]);
    }
}
import { Request, Response } from "express";
import { isEmpty } from "lodash";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";
import { Postgres } from "../databases/Postgres";
import { BrandingDBSubmission, BrandingDBSubmissionData, BrandingHashDBResult, BrandingResult, BrandingSegmentDBResult, BrandingSegmentHashDBResult, CasualVoteDBResult, CasualVoteHashDBResult, ThumbnailDBResult, ThumbnailResult, TitleDBResult, TitleResult } from "../types/branding.model";
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
import { getEtag } from "../middleware/etag";

enum BrandingSubmissionType {
    Title = "title",
    Thumbnail = "thumbnail"
}

export async function getVideoBranding(res: Response, videoID: VideoID, service: Service, ip: IPAddress, returnUserID: boolean, fetchAll: boolean): Promise<BrandingResult> {
    const getTitles = () => db.prepare(
        "all",
        `SELECT "titles"."title", "titles"."original", "titleVotes"."votes", "titleVotes"."downvotes", "titleVotes"."locked", "titleVotes"."shadowHidden", "titles"."UUID", "titles"."videoID", "titles"."hashedVideoID", "titleVotes"."verification", "titles"."userID"
        FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID"
        WHERE "titles"."videoID" = ? AND "titles"."service" = ? AND "titleVotes"."votes" > -1 AND "titleVotes"."votes" - "titleVotes"."downvotes" > -2 AND "titleVotes"."removed" = 0`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<TitleDBResult[]>;

    const getThumbnails = () => db.prepare(
        "all",
        `SELECT "thumbnailTimestamps"."timestamp", "thumbnails"."original", "thumbnailVotes"."votes", "thumbnailVotes"."downvotes", "thumbnailVotes"."locked", "thumbnailVotes"."shadowHidden", "thumbnails"."UUID", "thumbnails"."videoID", "thumbnails"."hashedVideoID", "thumbnails"."userID"
        FROM "thumbnails" LEFT JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" LEFT JOIN "thumbnailTimestamps" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
        WHERE "thumbnails"."videoID" = ? AND "thumbnails"."service" = ? AND "thumbnailVotes"."votes" - "thumbnailVotes"."downvotes" > -2 AND "thumbnailVotes"."removed" = 0
        ORDER BY "thumbnails"."timeSubmitted" ASC`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<ThumbnailDBResult[]>;

    const getSegments = () => db.prepare(
        "all",
        `SELECT "startTime", "endTime", "category", "videoDuration" FROM "sponsorTimes" 
        WHERE "votes" > -2 AND "shadowHidden" = 0 AND "hidden" = 0 AND "actionType" = 'skip' AND "videoID" = ? AND "service" = ?
        ORDER BY "timeSubmitted" ASC`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<BrandingSegmentDBResult[]>;

    const getCasualVotes = () => db.prepare(
        "all",
        `SELECT "category", "upvotes", "downvotes" FROM "casualVotes" 
        WHERE "videoID" = ? AND "service" = ?
        ORDER BY "timeSubmitted" ASC`,
        [videoID, service],
        { useReplica: true }
    ) as Promise<CasualVoteDBResult[]>;

    const getBranding = async () => {
        const titles = getTitles();
        const thumbnails = getThumbnails();
        const segments = getSegments();
        const casualVotes = getCasualVotes();

        for (const title of await titles) {
            title.title = title.title.replace("<", "‹");
        }

        return {
            titles: await titles,
            thumbnails: await thumbnails,
            segments: await segments,
            casualVotes: await casualVotes
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

    return filterAndSortBranding(videoID, returnUserID, fetchAll, branding.titles,
        branding.thumbnails, branding.segments, branding.casualVotes, ip, cache);
}

export async function getVideoBrandingByHash(videoHashPrefix: VideoIDHash, service: Service, ip: IPAddress, returnUserID: boolean, fetchAll: boolean): Promise<Record<VideoID, BrandingResult>> {
    const getTitles = () => db.prepare(
        "all",
        `SELECT "titles"."title", "titles"."original", "titleVotes"."votes", "titleVotes"."downvotes", "titleVotes"."locked", "titleVotes"."shadowHidden", "titles"."UUID", "titles"."videoID", "titles"."hashedVideoID", "titleVotes"."verification"
        FROM "titles" JOIN "titleVotes" ON "titles"."UUID" = "titleVotes"."UUID"
        WHERE "titles"."hashedVideoID" LIKE ? AND "titles"."service" = ? AND "titleVotes"."votes" > -1 AND "titleVotes"."votes" - "titleVotes"."downvotes" > -2 AND "titleVotes"."removed" = 0`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<TitleDBResult[]>;

    const getThumbnails = () => db.prepare(
        "all",
        `SELECT "thumbnailTimestamps"."timestamp", "thumbnails"."original", "thumbnailVotes"."votes", "thumbnailVotes"."downvotes", "thumbnailVotes"."locked", "thumbnailVotes"."shadowHidden", "thumbnails"."UUID", "thumbnails"."videoID", "thumbnails"."hashedVideoID"
        FROM "thumbnails" LEFT JOIN "thumbnailVotes" ON "thumbnails"."UUID" = "thumbnailVotes"."UUID" LEFT JOIN "thumbnailTimestamps" ON "thumbnails"."UUID" = "thumbnailTimestamps"."UUID"
        WHERE "thumbnails"."hashedVideoID" LIKE ? AND "thumbnails"."service" = ? AND "thumbnailVotes"."votes" - "thumbnailVotes"."downvotes" > -2 AND "thumbnailVotes"."removed" = 0
        ORDER BY "thumbnails"."timeSubmitted" ASC`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<ThumbnailDBResult[]>;

    const getSegments = () => db.prepare(
        "all",
        `SELECT "videoID", "startTime", "endTime", "category", "videoDuration" FROM "sponsorTimes" 
        WHERE "votes" > -2 AND "shadowHidden" = 0 AND "hidden" = 0 AND "actionType" = 'skip' AND "hashedVideoID" LIKE ? AND "service" = ?
        ORDER BY "timeSubmitted" ASC`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<BrandingSegmentHashDBResult[]>;

    const getCasualVotes = () => db.prepare(
        "all",
        `SELECT "videoID", "category", "upvotes", "downvotes" FROM "casualVotes" 
        WHERE "hashedVideoID" LIKE ? AND "service" = ?
        ORDER BY "timeSubmitted" ASC`,
        [`${videoHashPrefix}%`, service],
        { useReplica: true }
    ) as Promise<CasualVoteHashDBResult[]>;

    const branding = await QueryCacher.get(async () => {
        // Make sure they are both called in parallel
        const branding = {
            titles: getTitles(),
            thumbnails: getThumbnails(),
            segments: getSegments(),
            casualVotes: getCasualVotes()
        };

        const dbResult: Record<VideoID, BrandingHashDBResult> = {};
        const initResult = (submission: BrandingDBSubmissionData) => {
            dbResult[submission.videoID] = dbResult[submission.videoID] || {
                titles: [],
                thumbnails: [],
                segments: [],
                casualVotes: []
            };
        };

        (await branding.titles).forEach((title) => {
            title.title = title.title.replace("<", "‹");

            initResult(title);
            dbResult[title.videoID].titles.push(title);
        });
        (await branding.thumbnails).forEach((thumbnail) => {
            initResult(thumbnail);
            dbResult[thumbnail.videoID].thumbnails.push(thumbnail);
        });

        (await branding.segments).forEach((segment) => {
            initResult(segment);
            dbResult[segment.videoID].segments.push(segment);
        });

        (await branding.casualVotes).forEach((casualVote) => {
            initResult(casualVote);
            dbResult[casualVote.videoID].casualVotes.push(casualVote);
        });

        return dbResult;
    }, brandingHashKey(videoHashPrefix, service));


    const cache = {
        currentIP: null as Promise<HashedIP> | null
    };

    const processedResult: Record<VideoID, BrandingResult> = {};
    await Promise.all(Object.keys(branding).map(async (key) => {
        const castedKey = key as VideoID;
        processedResult[castedKey] = await filterAndSortBranding(castedKey, returnUserID, fetchAll, branding[castedKey].titles,
            branding[castedKey].thumbnails, branding[castedKey].segments, branding[castedKey].casualVotes, ip, cache);
    }));

    return processedResult;
}

async function filterAndSortBranding(videoID: VideoID, returnUserID: boolean, fetchAll: boolean, dbTitles: TitleDBResult[],
    dbThumbnails: ThumbnailDBResult[], dbSegments: BrandingSegmentDBResult[], dbCasualVotes: CasualVoteDBResult[],
    ip: IPAddress, cache: { currentIP: Promise<HashedIP> | null }): Promise<BrandingResult> {

    const shouldKeepTitles = shouldKeepSubmission(dbTitles, BrandingSubmissionType.Title, ip, cache);
    const shouldKeepThumbnails = shouldKeepSubmission(dbThumbnails, BrandingSubmissionType.Thumbnail, ip, cache);

    const titles = shuffleArray(dbTitles.filter(await shouldKeepTitles))
        .map((r) => ({
            title: r.title,
            original: r.original === 1,
            votes: r.votes + r.verification - r.downvotes,
            locked: r.locked === 1,
            UUID: r.UUID,
            userID: returnUserID ? r.userID : undefined
        }))
        .filter((a) => fetchAll || a.votes >= 0 || a.locked)
        .sort((a, b) => b.votes - a.votes)
        .sort((a, b) => +b.locked - +a.locked) as TitleResult[];

    const thumbnails = dbThumbnails.filter(await shouldKeepThumbnails)
        .sort((a, b) => +a.original - +b.original)
        .sort((a, b) => b.votes - a.votes)
        .sort((a, b) => b.locked - a.locked)
        .map((r) => ({
            timestamp: r.timestamp,
            original: r.original === 1,
            votes: r.votes - r.downvotes,
            locked: r.locked === 1,
            UUID: r.UUID,
            userID: returnUserID ? r.userID : undefined
        }))
        .filter((a) => (fetchAll && !a.original) || a.votes >= 1 || (a.votes >= 0 && !a.original) || a.locked) as ThumbnailResult[];

    const casualVotes = dbCasualVotes.map((r) => ({
        id: r.category,
        count: r.upvotes - r.downvotes
    })).filter((a) => a.count > 0);

    const videoDuration = dbSegments.filter(s => s.videoDuration !== 0)[0]?.videoDuration ?? null;

    return {
        titles,
        thumbnails,
        casualVotes,
        randomTime: findRandomTime(videoID, dbSegments, videoDuration),
        videoDuration: videoDuration,
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

            return submitterIP?.hashedIP === hashedIP;
        } catch (e) {
            // give up on shadow hide for now
            Logger.error(`getBranding: Error while trying to find IP: ${e}`);

            return false;
        }
    }));

    return (_, index) => shouldKeep[index];
}

export function findRandomTime(videoID: VideoID, segments: BrandingSegmentDBResult[], videoDuration: number): number {
    let randomTime = SeedRandom.alea(videoID)();

    // Don't allow random times past 90% of the video if no endcard
    if (!segments.some((s) => s.category === "outro") && randomTime > 0.9) {
        randomTime -= 0.9;
    }

    if (segments.length === 0) return randomTime;

    videoDuration ||= Math.max(...segments.map((s) => s.endTime)); // use highest end time as a fallback here

    // There are segments, treat this as a relative time in the chopped up video
    const sorted = segments.sort((a, b) => a.startTime - b.startTime);
    const emptySegments: [number, number][] = [];
    let totalTime = 0;

    let nextEndTime = 0;
    for (const segment of sorted) {
        if (segment.startTime > nextEndTime) {
            emptySegments.push([nextEndTime, segment.startTime]);
            totalTime += segment.startTime - nextEndTime;
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
    const returnUserID = req.query.returnUserID === "true";
    const fetchAll = req.query.fetchAll === "true";

    if (!videoID) {
        return res.status(400).send("Missing parameter: videoID");
    }

    const ip = getIP(req);
    try {
        const result = await getVideoBranding(res, videoID, service, ip, returnUserID, fetchAll);

        await getEtag("branding", (videoID as string), service)
            .then(etag => res.set("ETag", etag))
            .catch(() => null);

        const status = result.titles.length > 0 || result.thumbnails.length > 0 || result.casualVotes.length > 0 ? 200 : 404;
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
    const returnUserID = req.query.returnUserID === "true";
    const fetchAll = req.query.fetchAll === "true";

    try {
        const result = await getVideoBrandingByHash(hashPrefix, service, ip, returnUserID, fetchAll);

        await getEtag("brandingHash", (hashPrefix as string), service)
            .then(etag => res.set("ETag", etag))
            .catch(() => null);

        const status = !isEmpty(result) ? 200 : 404;
        return res.status(status).json(result);
    } catch (e) {
        Logger.error(e as string);
        return res.status(500).send([]);
    }
}

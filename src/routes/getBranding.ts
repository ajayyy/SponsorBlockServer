import { Request, Response } from "express";
import { isEmpty } from "lodash";
import { config } from "../config";
import { db, privateDB } from "../databases/databases";
import { BrandingDBSubmission, BrandingHashDBResult, BrandingResult, ThumbnailDBResult, ThumbnailResult, TitleDBResult, TitleResult } from "../types/branding.model";
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

    const getBranding = async () => ({
        titles: await getTitles(),
        thumbnails: await getThumbnails()
    });

    const brandingTrace = await QueryCacher.getTraced(getBranding, brandingKey(videoID, service));
    const branding = brandingTrace.data;

    // Add trace info to request for debugging purposes
    res.setHeader("X-Start-Time", brandingTrace.startTime);
    if (brandingTrace.dbStartTime) res.setHeader("X-DB-Start-Time", brandingTrace.dbStartTime);
    res.setHeader("X-End-Time", brandingTrace.endTime);

    const cache = {
        currentIP: null as Promise<HashedIP> | null
    };

    return filterAndSortBranding(branding.titles, branding.thumbnails, ip, cache);
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

    const branding = await QueryCacher.get(async () => {
        // Make sure they are both called in parallel
        const branding = {
            titles: getTitles(),
            thumbnails: getThumbnails()
        };

        const dbResult: Record<VideoID, BrandingHashDBResult> = {};
        const initResult = (submission: BrandingDBSubmission) => {
            dbResult[submission.videoID] = dbResult[submission.videoID] || {
                titles: [],
                thumbnails: []
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

        return dbResult;
    }, brandingHashKey(videoHashPrefix, service));


    const cache = {
        currentIP: null as Promise<HashedIP> | null
    };

    const processedResult: Record<VideoID, BrandingResult> = {};
    await Promise.all(Object.keys(branding).map(async (key) => {
        const castedKey = key as VideoID;
        processedResult[castedKey] = await filterAndSortBranding(branding[castedKey].titles, branding[castedKey].thumbnails, ip, cache);
    }));

    return processedResult;
}

async function filterAndSortBranding(dbTitles: TitleDBResult[], dbThumbnails: ThumbnailDBResult[], ip: IPAddress, cache: { currentIP: Promise<HashedIP> | null }): Promise<BrandingResult> {
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
        thumbnails
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
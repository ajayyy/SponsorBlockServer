import { NextFunction, Request, Response } from "express";
import { VideoID, VideoIDHash, Service } from "../types/segments.model";
import { QueryCacher } from "../utils/queryCacher";
import { skipSegmentsHashKey, skipSegmentsKey, videoLabelsHashKey, videoLabelsKey } from "../utils/redisKeys";

type hashType = "skipSegments" | "skipSegmentsHash" | "videoLabel" | "videoLabelHash";
type ETag = `${hashType};${VideoIDHash};${Service};${number}`;
type hashKey = string | VideoID | VideoIDHash;

export function cacheMiddlware(req: Request, res: Response, next: NextFunction): void {
    const reqEtag = req.get("If-None-Match") as string;
    // if weak etag, do not handle
    if (!reqEtag || reqEtag.startsWith("W/")) return next();
    // split into components
    const [hashType, hashKey, service, lastModified] = reqEtag.split(";");
    // fetch last-modified
    getLastModified(hashType as hashType, hashKey as VideoIDHash, service as Service)
        .then(redisLastModified => {
            if (redisLastModified <= new Date(Number(lastModified) + 1000)) {
                // match cache, generate etag
                const etag = `${hashType};${hashKey};${service};${redisLastModified.getTime()}` as ETag;
                res.status(304).set("etag", etag).send();
            }
            else next();
        })
        .catch(next);
}

function getLastModified(hashType: hashType, hashKey: hashKey, service: Service): Promise<Date | null> {
    let redisKey: string | null;
    if (hashType === "skipSegments") redisKey = skipSegmentsKey(hashKey as VideoID, service);
    else if (hashType === "skipSegmentsHash") redisKey = skipSegmentsHashKey(hashKey as VideoIDHash, service);
    else if (hashType === "videoLabel") redisKey = videoLabelsKey(hashKey as VideoID, service);
    else if (hashType === "videoLabelHash") redisKey = videoLabelsHashKey(hashKey as VideoIDHash, service);
    else return Promise.reject();
    return QueryCacher.getKeyLastModified(redisKey);
}

export async function getEtag(hashType: hashType, hashKey: hashKey, service: Service): Promise<ETag> {
    const lastModified = await getLastModified(hashType, hashKey, service);
    return `${hashType};${hashKey};${service};${lastModified.getTime()}` as ETag;
}

/* example usage
import { getEtag } from "../middleware/etag";
await getEtag(hashType, hashPrefix, service)
    .then(etag => res.set("ETag", etag))
    .catch(() => null);
*/
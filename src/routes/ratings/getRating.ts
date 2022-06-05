import { Request, Response } from "express";
import { db } from "../../databases/databases";
import { RatingType } from "../../types/ratings.model";
import { Service, VideoID, VideoIDHash } from "../../types/segments.model";
import { getService } from "../../utils/getService";
import { hashPrefixTester } from "../../utils/hashPrefixTester";
import { Logger } from "../../utils/logger";
import { QueryCacher } from "../../utils/queryCacher";
import { ratingHashKey } from "../../utils/redisKeys";

interface DBRating {
    videoID: VideoID,
    hashedVideoID: VideoIDHash,
    service: Service,
    type: RatingType,
    count: number
}

export async function getRating(req: Request, res: Response): Promise<Response> {
    let hashPrefixes: VideoIDHash[] = [];
    try {
        hashPrefixes = req.query.hashPrefixes
            ? JSON.parse(req.query.hashPrefixes as string)
            : Array.isArray(req.query.prefix)
                ? req.query.prefix.toString()
                : [req.query.prefix ?? req.params.prefix];
        if (!Array.isArray(hashPrefixes)) {
            return res.status(400).send("hashPrefixes parameter does not match format requirements.");
        }

        hashPrefixes.map((hashPrefix) => hashPrefix?.toLowerCase());
    } catch(error) {
        return res.status(400).send("Bad parameter: hashPrefixes (invalid JSON)");
    }
    if (hashPrefixes.length === 0 || hashPrefixes.length > 75
            || hashPrefixes.some((hashPrefix) => !hashPrefix || !hashPrefixTester(hashPrefix))) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }

    let types: RatingType[] = [];
    try {
        types = req.query.types
            ? JSON.parse(req.query.types as string)
            : req.query.type.toString()
                ? Array.isArray(req.query.type)
                    ? req.query.type
                    : [req.query.type]
                : [RatingType.Upvote, RatingType.Downvote];
        if (!Array.isArray(types)) {
            return res.status(400).send("Types parameter does not match format requirements.");
        }

        types = types.map((type) => parseInt(type as unknown as string, 10));
    } catch(error) {
        return res.status(400).send("Bad parameter: types (invalid JSON)");
    }

    const service: Service = getService(req.query.service, req.body.service);

    try {
        const ratings = (await getRatings(hashPrefixes, service))
            .filter((rating) => types.includes(rating.type))
            .map((rating) => ({
                videoID: rating.videoID,
                hash: rating.hashedVideoID,
                service: rating.service,
                type: rating.type,
                count: rating.count
            }));

        return res.status((ratings.length) ? 200 : 404)
            .send(ratings ?? []);
    } catch (err) {
        Logger.error(err as string);

        return res.sendStatus(500);
    }
}

function getRatings(hashPrefixes: VideoIDHash[], service: Service): Promise<DBRating[]> {
    const fetchFromDB = (hashPrefixes: VideoIDHash[]) => db
        .prepare(
            "all",
            `SELECT "videoID", "hashedVideoID", "type", "count" FROM "ratings" WHERE "hashedVideoID" ~* ? AND "service" = ? ORDER BY "hashedVideoID"`,
            [`^(?:${hashPrefixes.join("|")})`, service]
        ) as Promise<DBRating[]>;

    return (hashPrefixes.every((hashPrefix) => hashPrefix.length === 4))
        ? QueryCacher.getAndSplit(fetchFromDB, (prefix) => ratingHashKey(prefix, service), "hashedVideoID", hashPrefixes)
        : fetchFromDB(hashPrefixes);
}

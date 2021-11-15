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
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!hashPrefix || !hashPrefixTester(hashPrefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    let types: RatingType[] = [];
    try {
        types = req.query.types
            ? JSON.parse(req.query.types as string)
            : req.query.type
                ? Array.isArray(req.query.type)
                    ? req.query.type
                    : [req.query.type]
                : [RatingType.Upvote, RatingType.Downvote];
        if (!Array.isArray(types)) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        }

        types = types.map((type) => parseInt(type as unknown as string, 10));
    } catch(error) {
        return res.status(400).send("Bad parameter: categories (invalid JSON)");
    }

    const service: Service = getService(req.query.service, req.body.service);

    try {
        const ratings = (await getRatings(hashPrefix, service))
            .filter((rating) => types.includes(rating.type))
            .map((rating) => ({
                videoID: rating.videoID,
                hash: rating.hashedVideoID,
                service: rating.service,
                type: rating.type,
                count: rating.count
            }));

        if (ratings) {
            res.status(200);
        } else {
            res.status(404);
        }
        return res.send(ratings ?? []);
    } catch (err) {
        Logger.error(err as string);
        return res.sendStatus(500);
    }
}

async function getRatings(hashPrefix: VideoIDHash, service: Service): Promise<DBRating[]> {
    const fetchFromDB = () => db
        .prepare(
            "all",
            `SELECT "videoID", "hashedVideoID", "type", "count" FROM "ratings" WHERE "hashedVideoID" LIKE ? AND "service" = ? ORDER BY "hashedVideoID"`,
            [`${hashPrefix}%`, service]
        ) as Promise<DBRating[]>;

    if (hashPrefix.length === 4) {
        return await QueryCacher.get(fetchFromDB, ratingHashKey(hashPrefix, service));
    }

    return fetchFromDB();
}
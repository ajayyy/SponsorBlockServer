import { Request, Response } from "express";

import { hashPrefixTester } from "../utils/hashPrefixTester.js";
import { getSegmentsByHash } from "./getSkipSegments.js";
import { VideoIDHash } from "../types/segments.model.js";
import { Logger } from "../utils/logger.js";
import { parseSkipSegments } from "../utils/parseSkipSegments.js";
import { getEtag } from "../middleware/etag.js";

export async function getSkipSegmentsByHash(req: Request, res: Response): Promise<Response> {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!req.params.prefix || typeof req.params.prefix !== "string" || !hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    const parseResult = parseSkipSegments(req);
    if (parseResult.errors.length > 0) {
        return res.status(400).send(parseResult.errors);
    }
    const { categories, actionTypes, trimUUIDs, requiredSegments, service } = parseResult;

    // Get all video id's that match hash prefix
    const segments = await getSegmentsByHash(req, hashPrefix, categories, actionTypes, trimUUIDs, requiredSegments, service);

    try {
        const hashKey = hashPrefix.length === 4 ? "skipSegmentsHash" : "skipSegmentsLargerHash";
        await getEtag(hashKey, hashPrefix, service)
            .then(etag => res.set("ETag", etag))
            .catch(/* istanbul ignore next */ () => null as void);
        const output = Object.entries(segments).map(([videoID, data]) => ({
            videoID,
            segments: data.segments,
        }));
        return res.status(output.length === 0 ? 404 : 200).json(output);
    } catch (e) /* istanbul ignore next */ {
        Logger.error(`skip segments by hash error: ${e}`);

        return res.status(500).send("Internal server error");
    }
}

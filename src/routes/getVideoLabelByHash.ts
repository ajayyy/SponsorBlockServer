import { hashPrefixTester } from "../utils/hashPrefixTester";
import { getLabelsByHash } from "./getVideoLabel";
import { Request, Response } from "express";
import { VideoIDHash, Service } from "../types/segments.model";
import { getService } from "../utils/getService";

export async function getVideoLabelsByHash(req: Request, res: Response): Promise<Response> {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!req.params.prefix || !hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    const service: Service = getService(req.query.service, req.body.service);

    // Get all video id's that match hash prefix
    const segments = await getLabelsByHash(hashPrefix, service);

    if (!segments) return res.status(404).json([]);

    const output = Object.entries(segments).map(([videoID, data]) => ({
        videoID,
        hash: data.hash,
        segments: data.segments,
    }));
    return res.status(output.length === 0 ? 404 : 200).json(output);
}

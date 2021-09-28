import { hashPrefixTester } from "../utils/hashPrefixTester";
import { getSegmentsByHash } from "./getSkipSegments";
import { Request, Response } from "express";
import { ActionType, Category, SegmentUUID, VideoIDHash, Service } from "../types/segments.model";
import { getService } from "../utils/getService";

export async function getSkipSegmentsByHash(req: Request, res: Response): Promise<Response> {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!req.params.prefix || !hashPrefixTester(req.params.prefix)) {
        return res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    let categories: Category[] = [];
    try {
        categories = req.query.categories
            ? JSON.parse(req.query.categories as string)
            : req.query.category
                ? Array.isArray(req.query.category)
                    ? req.query.category
                    : [req.query.category]
                : ["sponsor"];
        if (!Array.isArray(categories)) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        }
    } catch(error) {
        return res.status(400).send("Bad parameter: categories (invalid JSON)");
    }

    let actionTypes: ActionType[] = [];
    try {
        actionTypes = req.query.actionTypes
            ? JSON.parse(req.query.actionTypes as string)
            : req.query.actionType
                ? Array.isArray(req.query.actionType)
                    ? req.query.actionType
                    : [req.query.actionType]
                : [ActionType.Skip];
        if (!Array.isArray(actionTypes)) {
            return res.status(400).send("actionTypes parameter does not match format requirements.");
        }
    } catch(error) {
        return res.status(400).send("Bad parameter: actionTypes (invalid JSON)");
    }

    let requiredSegments: SegmentUUID[] = [];
    try {
        requiredSegments = req.query.requiredSegments
            ? JSON.parse(req.query.requiredSegments as string)
            : req.query.requiredSegment
                ? Array.isArray(req.query.requiredSegment)
                    ? req.query.requiredSegment
                    : [req.query.requiredSegment]
                : [];
        if (!Array.isArray(requiredSegments)) {
            return res.status(400).send("requiredSegments parameter does not match format requirements.");
        }
    } catch(error) {
        return res.status(400).send("Bad parameter: requiredSegments (invalid JSON)");
    }

    const service: Service = getService(req.query.service, req.body.service);

    // filter out none string elements, only flat array with strings is valid
    categories = categories.filter((item: any) => typeof item === "string");

    // Get all video id's that match hash prefix
    const segments = await getSegmentsByHash(req, hashPrefix, categories, actionTypes, requiredSegments, service);

    if (!segments) return res.status(404).json([]);

    const output = Object.entries(segments).map(([videoID, data]) => ({
        videoID,
        hash: data.hash,
        segments: data.segments,
    }));
    return res.status(output.length === 0 ? 404 : 200).json(output);
}

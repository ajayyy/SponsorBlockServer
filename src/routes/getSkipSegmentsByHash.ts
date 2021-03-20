import {hashPrefixTester} from '../utils/hashPrefixTester';
import {getSegmentsByHash} from './getSkipSegments';
import {Request, Response} from 'express';
import { Category, VideoIDHash } from '../types/segments.model';

export async function getSkipSegmentsByHash(req: Request, res: Response) {
    let hashPrefix = req.params.prefix as VideoIDHash;
    if (!hashPrefixTester(req.params.prefix)) {
        res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
        return;
    }
    hashPrefix = hashPrefix.toLowerCase() as VideoIDHash;

    let categories: Category[] = [];
    try {
        categories = req.query.categories
            ? JSON.parse(req.query.categories as string)
            : req.query.category
                ? [req.query.category]
                : ["sponsor"];
        if (!Array.isArray(categories)) {
            return res.status(400).send("Categories parameter does not match format requirements.");
        }
    }
    catch(error) {
        return res.status(400).send("Bad parameter: categories (invalid JSON)");
    }
    
    // filter out none string elements, only flat array with strings is valid
    categories = categories.filter((item: any) => typeof item === "string");

    // Get all video id's that match hash prefix
    const segments = await getSegmentsByHash(req, hashPrefix, categories);

    if (!segments) return res.status(404).json([]);

    const output = Object.entries(segments).map(([videoID, data]) => ({
        videoID,
        hash: data.hash,
        segments: data.segments,
    }));

    res.status(output.length === 0 ? 404 : 200).json(output);
}

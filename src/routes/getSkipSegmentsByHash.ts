import {hashPrefixTester} from '../utils/hashPrefixTester';
import {getSegmentsByHash} from './getSkipSegments';
import {Request, Response} from 'express';
import { Category, VideoIDHash } from '../types/segments.model';

export async function getSkipSegmentsByHash(req: Request, res: Response) {
    let hashPrefix: VideoIDHash = req.params.prefix;
    if (!hashPrefixTester(req.params.prefix)) {
        res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
        return;
    }

    const categories: Category[] = req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? [req.query.category]
            : ['sponsor'];

    // Get all video id's that match hash prefix
    const segments = getSegmentsByHash(req, hashPrefix, categories);

    if (!segments) return res.status(404).json([]);

    const output = Object.entries(segments).map(([videoID, data]) => ({
        videoID,
        hash: data.hash,
        segments: data.segments,
    }));

    res.status(output.length === 0 ? 404 : 200).json(output);
}

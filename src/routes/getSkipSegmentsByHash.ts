import {hashPrefixTester} from '../utils/hashPrefixTester';
import {cleanGetSegments} from './getSkipSegments';
import {db} from '../databases/databases';
import {Request, Response} from 'express';

export async function getSkipSegmentsByHash(req: Request, res: Response) {
    let hashPrefix = req.params.prefix;
    if (!hashPrefixTester(req.params.prefix)) {
        res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
        return;
    }

    const categories = req.query.categories
        ? JSON.parse(req.query.categories as string)
        : req.query.category
            ? [req.query.category]
            : ['sponsor'];

    // Get all video id's that match hash prefix
    const videoIds = db.prepare('all', 'SELECT DISTINCT videoId, hashedVideoID from sponsorTimes WHERE hashedVideoID LIKE ?', [hashPrefix + '%']);

    let segments = videoIds.map((video: any) => {
        return {
            videoID: video.videoID,
            hash: video.hashedVideoID,
            segments: cleanGetSegments(req, video.videoID, categories),
        };
    });

    res.status((segments.length === 0) ? 404 : 200).json(segments);
}

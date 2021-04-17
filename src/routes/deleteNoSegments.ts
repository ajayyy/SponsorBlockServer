import {Request, Response} from 'express';
import {isUserVIP} from '../utils/isUserVIP';
import {getHash} from '../utils/getHash';
import {db} from '../databases/databases';
import { Category, VideoID } from '../types/segments.model';
import { UserID } from '../types/user.model';

export async function deleteNoSegmentsEndpoint(req: Request, res: Response) {
    // Collect user input data
    const videoID = req.body.videoID as VideoID;
    const userID = req.body.userID as UserID;
    const categories = req.body.categories as Category[];

    // Check input data is valid
    if (!videoID
        || !userID
        || !categories
        || !Array.isArray(categories)
        || categories.length === 0
    ) {
        res.status(400).json({
            message: 'Bad Format',
        });
        return;
    }

    // Check if user is VIP
    const hashedUserID = getHash(userID);
    const userIsVIP = await isUserVIP(hashedUserID);

    if (!userIsVIP) {
        res.status(403).json({
            message: 'Must be a VIP to mark videos.',
        });
        return;
    }

    deleteNoSegments(videoID, categories);  

    res.status(200).json({message: 'Removed no segments entrys for video ' + videoID});
}

/**
 * 
 * @param videoID 
 * @param categories If null, will remove all
 */
export async function deleteNoSegments(videoID: VideoID, categories: Category[]): Promise<void> {
    const entries = (await db.prepare("all", 'SELECT * FROM "noSegments" WHERE "videoID" = ?', [videoID])).filter((entry: any) => {
        return categories === null || categories.indexOf(entry.category) !== -1;
    });

    for (const entry of entries) {
        await db.prepare('run', 'DELETE FROM "noSegments" WHERE "videoID" = ? AND "category" = ?', [videoID, entry.category]);
    }
}

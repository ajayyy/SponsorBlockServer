import {Request, Response} from 'express';
import {isUserVIP} from '../utils/isUserVIP';
import {getHash} from '../utils/getHash';
import {db} from '../databases/databases';

export async function deleteNoSegments(req: Request, res: Response) {
    // Collect user input data
    const videoID = req.body.videoID;
    let userID = req.body.userID;
    const categories = req.body.categories;

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
    userID = getHash(userID);
    const userIsVIP = await isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({
            message: 'Must be a VIP to mark videos.',
        });
        return;
    }

    const entries = (await db.prepare("all", 'SELECT * FROM noSegments WHERE videoID = ?', [videoID])).filter((entry: any) => {
        return (categories.indexOf(entry.category) !== -1);
    });

    for (const entry of entries) {
        await db.prepare('run', 'DELETE FROM noSegments WHERE videoID = ? AND category = ?', [videoID, entry.category]);
    }

    res.status(200).json({message: 'Removed no segments entrys for video ' + videoID});
}

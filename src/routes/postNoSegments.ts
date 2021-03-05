import {Logger} from '../utils/logger';
import {getHash} from '../utils/getHash';
import {isUserVIP} from '../utils/isUserVIP';
import {db} from '../databases/databases';
import {Request, Response} from 'express';

export async function postNoSegments(req: Request, res: Response) {
    // Collect user input data
    let videoID = req.body.videoID;
    let userID = req.body.userID;
    let categories = req.body.categories;

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
    let userIsVIP = await isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({
            message: 'Must be a VIP to mark videos.',
        });
        return;
    }

    // Get existing no segment markers
    let noSegmentList = await db.prepare('all', 'SELECT "category" from "noSegments" where "videoID" = ?', [videoID]);
    if (!noSegmentList || noSegmentList.length === 0) {
        noSegmentList = [];
    } else {
        noSegmentList = noSegmentList.map((obj: any) => {
            return obj.category;
        });
    }

    // get user categories not already submitted that match accepted format
    let categoriesToMark = categories.filter((category) => {
        return !!category.match(/^[_a-zA-Z]+$/);
    }).filter((category) => {
        return noSegmentList.indexOf(category) === -1;
    });

    // remove any duplicates
    categoriesToMark = categoriesToMark.filter((category, index) => {
        return categoriesToMark.indexOf(category) === index;
    });

    // create database entry
    for (const category of categoriesToMark) {
        try {
            await db.prepare('run', `INSERT INTO "noSegments" ("videoID", "userID", "category") VALUES(?, ?, ?)`, [videoID, userID, category]);
        } catch (err) {
            Logger.error("Error submitting 'noSegment' marker for category '" + category + "' for video '" + videoID + "'");
            Logger.error(err);
            res.status(500).json({
                message: "Internal Server Error: Could not write marker to the database.",
            });
        }
    };

    res.status(200).json({
        submitted: categoriesToMark,
    });
}

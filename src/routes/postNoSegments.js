const db = require('../databases/databases.js').db;
const getHash = require('../utils/getHash.js');
const isUserVIP = require('../utils/isUserVIP.js');
const logger = require('../utils/logger.js');

module.exports = (req, res) => {
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
            message: 'Bad Format'
        });
        return;
    }

    // Check if user is VIP
    userID = getHash(userID);
    let userIsVIP = isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({
            message: 'Must be a VIP to mark videos.'
        });
        return;
    }

    // Get existing no segment markers
    let noSegmentList = db.prepare('all', 'SELECT category from noSegments where videoID = ?', [videoID]);
    if (!noSegmentList || noSegmentList.length === 0) {
        noSegmentList = [];
    } else {
        noSegmentList = noSegmentList.map((obj) => {
            return obj.category;
        });
    }

    // get user categories not already submitted that match accepted format
    let categoriesToMark = categories.filter((category) => {
        return !!category.match(/^[a-zA-Z]+$/);
    }).filter((category) => {
        return noSegmentList.indexOf(category) === -1;
    });

    // remove any duplicates
    categoriesToMark = categoriesToMark.filter((category, index) => {
        return categoriesToMark.indexOf(category) === index;
    });

    // create database entry
    categoriesToMark.forEach((category) => {
        try {
            db.prepare('run', "INSERT INTO noSegments (videoID, userID, category) VALUES(?, ?, ?)", [videoID, userID, category]);
        } catch (err) {
            logger.error("Error submitting 'noSegment' marker for category '" + category + "' for video '" + videoID + "'");
            logger.error(err);
            res.status(500).json({
                message: "Internal Server Error: Could not write marker to the database."
            });
        }
    });

    res.status(200).json({
        submitted: categoriesToMark
    }); 
};
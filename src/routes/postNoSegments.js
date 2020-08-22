const db = require('../databases/databases.js').db;
const getHash = require('../utils/getHash.js');
const isUserVIP = require('../utils/isUserVIP.js');
const logger = require('../utils/logger.js');

module.exports = (req, res) => {
    // Collect user input data
    let videoID = req.body.videoID;
    let userID = req.body.userID;
    let categorys = req.body.categorys;

    // Check input data is valid
    if (!videoID 
        || !userID 
        || !categorys 
        || !Array.isArray(categorys) 
        || categorys.length === 0
    ) {
        res.status(400).json({
            status: 400,
            message: 'Bad Format'
        });
        return;
    }

    // Check if user is VIP
    userID = getHash(userID);
    let userIsVIP = isUserVIP(userID);

    if (!userIsVIP) {
        res.status(403).json({
            status: 403,
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

    // get user categorys not already submitted that match accepted format
    let categorysToMark = categorys.filter((category) => {
        return !!category.match(/^[a-zA-Z]+$/);
    }).filter((category) => {
        return noSegmentList.indexOf(category) === -1;
    });

    // remove any duplicates
    categorysToMark = categorysToMark.filter((category, index) => {
        return categorysToMark.indexOf(category) === index;
    });

    // create database entry
    categorysToMark.forEach((category) => {
        try {
            db.prepare('run', "INSERT INTO noSegments (videoID, userID, category) VALUES(?, ?, ?)", [videoID, userID, category]);
        } catch (err) {
            logger.error("Error submitting 'noSegment' marker for category '" + category + "' for video '" + videoID + "'");
            logger.error(err);
            res.status(500).json({
                status: 500,
                message: "Internal Server Error: Could not write marker to the database."
            });
        }
    });

    res.status(200).json({
        status: 200,
        submitted: categorysToMark
    }); 
};
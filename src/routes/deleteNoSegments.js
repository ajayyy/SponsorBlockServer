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

    db.prepare("all", 'SELECT * FROM noSegments WHERE videoID = ?', [videoID]).filter((entry) => {
        return (categories.indexOf(entry.category) !== -1);
    }).forEach((entry) => {
        db.prepare('run', 'DELETE FROM noSegments WHERE videoID = ? AND category = ?', [videoID, entry.category]);
    });

    res.status(200).json({message: 'Removed no segments entrys for video ' + videoID});
};
const hashPrefixTester = require('../utils/hashPrefixTester.js');
const getSegments = require('./getSkipSegments.js').cleanGetSegments;

const databases = require('../databases/databases.js');
const logger = require('../utils/logger.js');
const db = databases.db;

module.exports = async function (req, res) {
    let hashPrefix = req.params.prefix;
    if (!hashPrefixTester(req.params.prefix)) {
        res.status(400).send("Hash prefix does not match format requirements."); // Exit early on faulty prefix
        return;
    }

    const categories = req.query.categories
    ? JSON.parse(req.query.categories)
    : req.query.category
    ? [req.query.category]
    : ['sponsor'];

    // Get all video id's that match hash prefix
    const videoIds = db.prepare('all', 'SELECT DISTINCT videoId, hashedVideoID from sponsorTimes WHERE hashedVideoID LIKE ?', [hashPrefix+'%']);
    if (videoIds.length === 0) {
        res.sendStatus(404);
        return;
    }

    let segments = videoIds.map((video) => {
        return {
            videoID: video.videoID,
            hash: video.hashedVideoID,
            segments: getSegments(req, video.videoID, categories)
        };
    });

    res.status(200).json(segments);
}
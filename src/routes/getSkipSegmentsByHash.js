const hashPrefixTester = require('../utils/hashPrefixTester.js');
const getSegments = require('./getSkipSegments.js').getSegmentsByHash;

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
    const segments = getSegments(req, hashPrefix, categories);

    if (!segments) return res.status(404).json([]);

    const output = Object.entries(segments).map(([videoID, data]) => ({
        videoID,
        hash: data.hash,
        segments: data.segments,
    }));

    res.status(output.length === 0 ? 404 : 200).json(output);
}

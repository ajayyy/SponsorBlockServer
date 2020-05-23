const config = require('../config.js');
const { db, privateDB } = require('../databases/databases.js');

const getHash = require('../utils/getHash.js');
const getIP = require('../utils/getIP.js');

/**
 * @typedef {Object} Segment
 * @property {string} videoID YouTube video ID the segment is meant for
 * @property {number[]} segment Tuple of start and end times in seconds
 * @property {string} category Category of content to skip
 * @property {string} UUID Unique identifier for the specific segment
 */

/**
 * @param {string} prefix Lowercased hexadecimal hash prefix
 * @param {string} hashedIP Custom hash of the visitor’s IP address
 * @returns {Segment[]}
 */
function getSkipSegmentsByHash(prefix, hashedIP) {
    /**
     * @constant
     * @type {Segment[]}
     * @default
     */
    const segments = [];

    const rows = db.prepare('SELECT videoID, startTime, endTime, UUID, category, shadowHidden FROM sponsorTimes WHERE votes >= -1 AND hashedVideoID LIKE ? ORDER BY startTime')
            .all(prefix + '%');

    const onlyForCurrentUser = privateDB.prepare('SELECT videoID FROM sponsorTimes WHERE hashedIP = ?').all(hashedIP).map(row => row.videoID);

    for (const row of rows) {
        /** @TODO check if this logic does what is expected. */
        if (row.shadowHidden === 1 && onlyForCurrentUser.indexOf(row.videoID) === -1) {
            // The current visitor’s IP did not submit for the current video.
            // Do not send shadowHidden segments to them.
            continue;
        }

        segments.push({
            videoID: row.videoID,
            segment: [row.startTime, row.endTime],
            category: row.category,
            UUID: row.UUID
        });
    }

    return segments;
}

const minimumPrefix = config.minimumPrefix || '3';
const maximumPrefix = config.maximumPrefix || '32'; // Half the hash.
const prefixChecker = new RegExp('^[\\dA-F]{' + minimumPrefix + ',' + maximumPrefix + '}$', 'i');

module.exports = async function (req, res) {
    if (!prefixChecker.test(req.params.prefix)) {
        res.sendStatus(400).end(); // Exit early on faulty prefix
    }

    const segments = getSkipSegmentsByHash(
        req.params.prefix.toLowerCase(),
        getHash(getIP(req) + config.globalSalt)
    );

    if (segments) {
        res.send(segments)
    }
}
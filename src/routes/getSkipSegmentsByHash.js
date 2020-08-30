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
 * @typedef {Object} Row
 * @property {string} videoID
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} votes
 * @property {string} UUID
 * @property {string} category
 * @property {number} shadowHidden
 */

/**
 * Input an array of database records and get only one back, weighed on votes.
 * The logic is taken from getWeightedRandomChoice, just simplified input and output to not work on indices only.
 * 
 * @param {Row[]} rows
 * @returns {?Row}
 */
function pickWeightedRandomRow(rows) {
    if (rows.length === 0) {
        return null;
    } else if (rows.length === 1) {
        return rows[0];
    }

    const sqrtWeightsList = [];
    let totalSqrtWeights = 0;
    for (const row of rows) {
        let sqrtVote = Math.sqrt((row.votes + 3) * 10);
        sqrtWeightsList.push(sqrtVote);
        totalSqrtWeights += sqrtVote;
    }

    const randomNumber = Math.random();
    let currentVoteNumber = 0;
    for (let i = 0; i < sqrtWeightsList.length; i++) {
        if (randomNumber > currentVoteNumber / totalSqrtWeights && randomNumber < (currentVoteNumber + sqrtWeightsList[i]) / totalSqrtWeights) {
            return rows[i];
        }
        currentVoteNumber += sqrtWeightsList[i];
    }
}
/**
 * @param {string} prefix Lowercased hexadecimal hash prefix
 * @param {string} hashedIP Custom hash of the visitor’s IP address
 * @returns {Object.<string, Segment[]>}
 */
function getSkipSegmentsByHash(prefix, hashedIP) {
    /** @type Row[] */
    const rows = db.prepare('SELECT videoID, startTime, endTime, votes, UUID, category, shadowHidden FROM sponsorTimes WHERE votes >= -1 AND hashedVideoID LIKE ? ORDER BY videoID, startTime')
            .all(prefix + '%');
    /** @type {string[]} */
    const onlyForCurrentUser = privateDB.prepare('SELECT videoID FROM sponsorTimes WHERE hashedIP = ?').all(hashedIP).map(row => row.videoID);
    /** @type {Object.<string, Segment[][]>} */
    const rowGroupsPerVideo = {};

    let previousVideoID = null;
    let previousEndTime = null;
    for (const row of rows) {
        /** @TODO check if this logic does what is expected. */
        if (row.shadowHidden === 1 && onlyForCurrentUser.indexOf(row.videoID) === -1) {
            // The current visitor’s IP did not submit for the current video.
            // Do not send shadowHidden segments to them.
            continue;
        }
        // Split up the rows per video and group overlapping segments together.
        if (!(row.videoID in rowGroupsPerVideo)) {
            rowGroupsPerVideo[row.videoID] = [];
        }
        if (previousVideoID === row.videoID && row.startTime <= previousEndTime) {
            rowGroupsPerVideo[row.videoID][rowGroupsPerVideo[row.videoID].length - 1].push(row);
            previousEndTime = Math.max(previousEndTime, row.endTime);
        } else {
            rowGroupsPerVideo[row.videoID].push([row]);
            previousVideoID = row.videoID;
            previousEndTime = row.endTime;
        }
    }

    /** @type {Object.<string, Segment[]>} */
    const output = {};
    for (const videoID in rowGroupsPerVideo) {
        const pickedVideosForVideoID = [];
        for (const group of rowGroupsPerVideo[videoID]) {
            pickedVideosForVideoID.push(pickWeightedRandomRow(group));
        }
        output[videoID] = pickedVideosForVideoID.map(row => ({ videoID: row.videoID, segment: [row.startTime, row.endTime], category: row.category, UUID: row.UUID }));
    }
    return output;
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

    if (Object.keys(segments).length > 0) {
        res.send(segments);
    } else {
        res.sendStatus(404); // No skipable segments within this prefix
    }
}
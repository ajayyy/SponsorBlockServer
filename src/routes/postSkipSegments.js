var config = require('../config.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;
var YouTubeAPI = require('../utils/youtubeAPI.js');
var logger = require('../utils/logger.js');
var request = require('request');
var isoDurations = require('iso8601-duration');

var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');
var getFormattedTime = require('../utils/getFormattedTime.js');
var isUserTrustworthy = require('../utils/isUserTrustworthy.js')

function sendDiscordNotification(userID, videoID, UUID, segmentInfo) {
    //check if they are a first time user
    //if so, send a notification to discord
    if (config.youtubeAPIKey !== null && config.discordFirstTimeSubmissionsWebhookURL !== null) {
        let userSubmissionCountRow = db.prepare('get', "SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?", [userID]);

        // If it is a first time submission
        if (userSubmissionCountRow.submissionCount <= 1) {
            YouTubeAPI.videos.list({
                part: "snippet",
                id: videoID
            }, function (err, data) {
                if (err || data.items.length === 0) {
                    err && logger.error(err);
                    return;
                }

                let startTime = parseFloat(segmentInfo.segment[0]);
                let endTime = parseFloat(segmentInfo.segment[1]);

                request.post(config.discordFirstTimeSubmissionsWebhookURL, {
                    json: {
                        "embeds": [{
                            "title": data.items[0].snippet.title,
                            "url": "https://www.youtube.com/watch?v=" + videoID + "&t=" + (startTime.toFixed(0) - 2),
                            "description": "Submission ID: " + UUID +
                                    "\n\nTimestamp: " +
                                    getFormattedTime(startTime) + " to " + getFormattedTime(endTime) +
                                    "\n\nCategory: " + segmentInfo.category,
                            "color": 10813440,
                            "author": {
                                "name": userID
                            },
                            "thumbnail": {
                                "url": data.items[0].snippet.thumbnails.maxres ? data.items[0].snippet.thumbnails.maxres.url : "",
                            }
                        }]
                    }
                    }, (err, res) => {
                        if (err) {
                            logger.error("Failed to send first time submission Discord hook.");
                            logger.error(JSON.stringify(err));
                            logger.error("\n");
                        } else if (res && res.statusCode >= 400) {
                            logger.error("Error sending first time submission Discord hook");
                            logger.error(JSON.stringify(res));
                            logger.error("\n");
                        }
                });
            });
        }
    }
}

// callback:  function(reject: "String containing reason the submission was rejected")
// returns: string when an error, false otherwise

// Looks like this was broken for no defined youtube key - fixed but IMO we shouldn't return
//   false for a pass - it was confusing and lead to this bug - any use of this function in
//   the future could have the same problem.
async function autoModerateSubmission(submission, callback) {
    // Get the video information from the youtube API
    if (config.youtubeAPIKey !== null) {
        let {err, data} = await new Promise((resolve, reject) => {
            YouTubeAPI.videos.list({
                part: "contentDetails",
                id: videoID
            }, (err, data) => resolve({err, data}));
        });

        if (err) {
            return "Couldn't get video information.";
        } else {
            // Check to see if video exists
            if (data.pageInfo.totalResults === 0) {
                return "No video exists with id " + videoID;
            } else {
                let duration = data.items[0].contentDetails.duration;
                duration = isoDurations.toSeconds(isoDurations.parse(duration));
                if (duration == 0) {
                    // Allow submission if the duration is 0 (bug in youtube api)
                    return false;
                }

                for (const segment of segments) {
                    if ((segment.segment[1] - segment.segment[0]) > (duration / 100) * 80) {
                        // Reject submission if over 80% of the video
                        return "One of your submitted segments is over 80% of the video.";
                    }
                }

                let neuralBlockURL = config.neuralBlockURL;
                if (!neuralBlockURL) return false;

                let overlap = true;

                let response = await fetch(neuralBlockURL + "/api/getSponsorSegments?vid=" + videoID);
                if (!response.ok) return false;

                let nbPredictions = await response.json();
                for (const segment of segments) {
                    if (segment.category !== "sponsor") continue;

                    let thisSegmentOverlaps = false;
                    for (const nbSegment of nbPredictions.sponsorSegments) {
                        // The submission needs to be similar to the NB prediction by 65% or off by less than 7 seconds
                        // This calculated how off it is
                        let offAmount = Math.abs(nbSegment[0] - segment.segment[0]) + Math.abs(nbSegment[1] - segment.segment[1]);
                        if (offAmount / (nbSegment[1] - nbSegment[0]) <= 0.35 || offAmount <= 7) {
                            thisSegmentOverlaps = true;
                        }
                    }

                    if (!thisSegmentOverlaps){
                        overlap = false;
                        break;
                    }
                }

                if (overlap) {
                    return false;
                } else{
                    return "One of your submitted segments doesn't have at least 65% match.";
                }
            }
        }

    } else {
        logger.debug("Skipped YouTube API");

        // Can't moderate the submission without calling the youtube API
        // so allow by default.
        return false;
    }
}

function proxySubmission(req) {
    request.post(config.proxySubmission + '/api/skipSegments?userID='+req.query.userID+'&videoID='+req.query.videoID, {json: req.body}, (err, result) => {
        if (config.mode === 'development') {
            if (!err) {
                logger.error('Proxy Submission: ' + result.statusCode + ' ('+result.body+')');
            } else {
                logger.debug("Proxy Submission: Failed to make call");
            }
        }
    });
}

module.exports = async function postSkipSegments(req, res) {
    if (config.proxySubmission) {
        proxySubmission(req);
    }

    let videoID = req.query.videoID || req.body.videoID;
    let userID = req.query.userID || req.body.userID;

    let segments = req.body.segments;

    if (segments === undefined) {
        // Use query instead
        segments = [{
            segment: [req.query.startTime, req.query.endTime],
            category: req.query.category
        }];
    }

    //check if all correct inputs are here and the length is 1 second or more
    if (videoID == undefined || userID == undefined || segments == undefined || segments.length < 1) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    //hash the ip 5000 times so no one can get it from the database
    let hashedIP = getHash(getIP(req) + config.globalSalt);

    //check if this user is on the vip list
    let isVIP = db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(userID).userCount > 0;

    // Check if all submissions are correct
    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === undefined || segments[i].segment === undefined || segments[i].category === undefined) {
            //invalid request
            res.sendStatus(400);
            return;
        }

        let startTime = parseFloat(segments[i].segment[0]);
        let endTime = parseFloat(segments[i].segment[1]);

        if (isNaN(startTime) || isNaN(endTime)
                || startTime === Infinity || endTime === Infinity || startTime < 0 || startTime >= endTime) {
            //invalid request
            res.sendStatus(400);
            return;
        }

        if (segments[i].category === "sponsor" && Math.abs(startTime - endTime) < 1) {
            // Too short
            res.status(400).send("Sponsors must be longer than 1 second long");
            return;
        }

        //check if this info has already been submitted before
        let duplicateCheck2Row = db.prepare('get', "SELECT COUNT(*) as count FROM sponsorTimes WHERE startTime = ? " +
            "and endTime = ? and category = ? and videoID = ?", [startTime, endTime, segments[i].category, videoID]);
        if (duplicateCheck2Row.count > 0) {
            res.sendStatus(409);
            return;
        }
    }

    // Auto moderator check
    if (!isVIP) {
        let autoModerateResult = await autoModerateSubmission(videoID, segments);
        if (autoModerateResult) {
            res.status(403).send("Request rejected by auto moderator: " + autoModerateResult + " If this is an issue, send a message on Discord.");
            return;
        }
    }

    try {
        //get current time
        let timeSubmitted = Date.now();

        let yesterday = timeSubmitted - 86400000;

        // Disable IP ratelimiting for now
        if (false) {
            //check to see if this ip has submitted too many sponsors today
            let rateLimitCheckRow = privateDB.prepare('get', "SELECT COUNT(*) as count FROM sponsorTimes WHERE hashedIP = ? AND videoID = ? AND timeSubmitted > ?", [hashedIP, videoID, yesterday]);

            if (rateLimitCheckRow.count >= 10) {
                //too many sponsors for the same video from the same ip address
                res.sendStatus(429);

                return;
            }
        }

        // Disable max submissions for now
        if (false) {
            //check to see if the user has already submitted sponsors for this video
            let duplicateCheckRow = db.prepare('get', "SELECT COUNT(*) as count FROM sponsorTimes WHERE userID = ? and videoID = ?", [userID, videoID]);

            if (duplicateCheckRow.count >= 16) {
                //too many sponsors for the same video from the same user
                res.sendStatus(429);

                return;
            }
        }

        //check to see if this user is shadowbanned
        let shadowBanRow = privateDB.prepare('get', "SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?", [userID]);

        let shadowBanned = shadowBanRow.userCount;

        if (!(await isUserTrustworthy(userID))) {
            //hide this submission as this user is untrustworthy
            shadowBanned = 1;
        }

        let startingVotes = 0;
        if (isVIP) {
            //this user is a vip, start them at a higher approval rating
            startingVotes = 10000;
        }

        for (const segmentInfo of segments) {
            //this can just be a hash of the data
            //it's better than generating an actual UUID like what was used before
            //also better for duplication checking
            let UUID = getHash("v2-categories" + videoID + segmentInfo.segment[0] +
                segmentInfo.segment[1]  + segmentInfo.category + userID, 1);

            try {
                db.prepare('run', "INSERT INTO sponsorTimes " +
                    "(videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden)" +
                    "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [videoID, segmentInfo.segment[0],
                    segmentInfo.segment[1], startingVotes, UUID, userID, timeSubmitted, 0, segmentInfo.category, shadowBanned]);

                //add to private db as well
                privateDB.prepare('run', "INSERT INTO sponsorTimes VALUES(?, ?, ?)", [videoID, hashedIP, timeSubmitted]);
            } catch (err) {
                //a DB change probably occurred
                res.sendStatus(502);
                logger.error("Error when putting sponsorTime in the DB: " + videoID + ", " + segmentInfo.segment[0] + ", " +
                    segmentInfo.segment[1] + ", " + userID + ", " + segmentInfo.category + ". " + err);

                return;
            }

            // Discord notification
            sendDiscordNotification(userID, videoID, UUID, segmentInfo);
        }
    } catch (err) {
        logger.error(err);

        res.sendStatus(500);

        return;
    }

    res.sendStatus(200);
}

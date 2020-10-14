const config = require('../config.js');

const databases = require('../databases/databases.js');
const db = databases.db;
const privateDB = databases.privateDB;
const YouTubeAPI = require('../utils/youtubeAPI.js');
const logger = require('../utils/logger.js');
const getSubmissionUUID = require('../utils/getSubmissionUUID.js');
const request = require('request');
const isoDurations = require('iso8601-duration');
const fetch = require('node-fetch');

const getHash = require('../utils/getHash.js');
const getIP = require('../utils/getIP.js');
const getFormattedTime = require('../utils/getFormattedTime.js');
const isUserTrustworthy = require('../utils/isUserTrustworthy.js')
const { dispatchEvent } = require('../utils/webhookUtils.js');

function sendWebhookNotification(userID, videoID, UUID, submissionCount, youtubeData, {submissionStart, submissionEnd}, segmentInfo) {
    let row = db.prepare('get', "SELECT userName FROM userNames WHERE userID = ?", [userID]);
    let userName = row !== undefined ? row.userName : null;
    let video = youtubeData.items[0];

    let scopeName = "submissions.other";
    if (submissionCount <= 1) {
        scopeName = "submissions.new";
    }

    dispatchEvent(scopeName, {
        "video": {
            "id": videoID,
            "title": video.snippet.title,
            "thumbnail": video.snippet.thumbnails.maxres ? video.snippet.thumbnails.maxres : null,
            "url": "https://www.youtube.com/watch?v=" + videoID
        },
        "submission": {
            "UUID": UUID,
            "category": segmentInfo.category,
            "startTime": submissionStart,
            "endTime": submissionEnd,
            "user": {
                "UUID": userID,
                "username": userName
            }
        }
    });
}

function sendWebhooks(userID, videoID, UUID, segmentInfo) {
    if (config.youtubeAPIKey !== null) {
        let userSubmissionCountRow = db.prepare('get', "SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?", [userID]);

        YouTubeAPI.listVideos(videoID, "snippet", (err, data) => {
            if (err || data.items.length === 0) {
                err && logger.error(err);
                return;
            }

            let startTime = parseFloat(segmentInfo.segment[0]);
            let endTime = parseFloat(segmentInfo.segment[1]);
            sendWebhookNotification(userID, videoID, UUID, userSubmissionCountRow.submissionCount, data, {submissionStart: startTime, submissionEnd: endTime}, segmentInfo);

            // If it is a first time submission
            // Then send a notification to discord
            if (config.discordFirstTimeSubmissionsWebhookURL === null || userSubmissionCountRow.submissionCount > 1) return;
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

function sendWebhooksNB(userID, videoID, UUID, startTime, endTime, category, probability, ytData) {
    let submissionInfoRow = db.prepare('get', "SELECT " +
        "(select count(1) from sponsorTimes where userID = ?) count, " +
        "(select count(1) from sponsorTimes where userID = ? and votes <= -2) disregarded, " +
        "coalesce((select userName FROM userNames WHERE userID = ?), ?) userName",
        [userID, userID, userID, userID]);

    let submittedBy = "";
    // If a userName was created then show both
    if (submissionInfoRow.userName !== userID){
        submittedBy = submissionInfoRow.userName + "\n " + userID;
    } else {
        submittedBy = userID;
    }

    // Send discord message
    if (config.discordNeuralBlockRejectWebhookURL === null) return;
    request.post(config.discordNeuralBlockRejectWebhookURL, {
        json: {
            "embeds": [{
                "title": ytData.items[0].snippet.title,
                "url": "https://www.youtube.com/watch?v=" + videoID + "&t=" + (startTime.toFixed(0) - 2),
                "description": "**Submission ID:** " + UUID +
                        "\n**Timestamp:** " + getFormattedTime(startTime) + " to " + getFormattedTime(endTime) +
                        "\n**Predicted Probability:** " + probability +
                        "\n**Category:** " + category +
                        "\n**Submitted by:** "+ submittedBy +
                        "\n**Total User Submissions:** "+submissionInfoRow.count +
                        "\n**Ignored User Submissions:** "+submissionInfoRow.disregarded,
                "color": 10813440,
                "thumbnail": {
                    "url": ytData.items[0].snippet.thumbnails.maxres ? ytData.items[0].snippet.thumbnails.maxres.url : "",
                }
            }]
        }
    }, (err, res) => {
            if (err) {
                logger.error("Failed to send NeuralBlock Discord hook.");
                logger.error(JSON.stringify(err));
                logger.error("\n");
            } else if (res && res.statusCode >= 400) {
                logger.error("Error sending NeuralBlock Discord hook");
                logger.error(JSON.stringify(res));
                logger.error("\n");
            }
    });
}

// callback:  function(reject: "String containing reason the submission was rejected")
// returns: string when an error, false otherwise

// Looks like this was broken for no defined youtube key - fixed but IMO we shouldn't return
//   false for a pass - it was confusing and lead to this bug - any use of this function in
//   the future could have the same problem.
async function autoModerateSubmission(submission) {
    // Get the video information from the youtube API
    if (config.youtubeAPIKey !== null) {
        let {err, data} = await new Promise((resolve, reject) => {
            YouTubeAPI.listVideos(submission.videoID, "contentDetails,snippet", (err, data) => resolve({err, data}));
        });

        if (err) {
            return false;
        } else {
            // Check to see if video exists
            if (data.pageInfo.totalResults === 0) {
                return "No video exists with id " + submission.videoID;
            } else {
                let segments = submission.segments;
                let nbString = "";
                for (let i = 0; i < segments.length; i++) {
                    let startTime = parseFloat(segments[i].segment[0]);
                    let endTime = parseFloat(segments[i].segment[1]);

                    let duration = data.items[0].contentDetails.duration;
                    duration = isoDurations.toSeconds(isoDurations.parse(duration));
                    if (duration == 0) {
                        // Allow submission if the duration is 0 (bug in youtube api)
                        return false;
                    } else if ((endTime - startTime) > (duration/100)*80) {
                        // Reject submission if over 80% of the video
                        return "One of your submitted segments is over 80% of the video.";
                    } else {
                        if (segments[i].category === "sponsor") {
                          //Prepare timestamps to send to NB all at once
                          nbString = nbString + segments[i].segment[0] + "," + segments[i].segment[1] + ";";
                        }
                    }
                }
                // Check NeuralBlock
                let neuralBlockURL = config.neuralBlockURL;
                if (!neuralBlockURL) return false;
                let response = await fetch(neuralBlockURL + "/api/checkSponsorSegments?vid=" + submission.videoID +
                        "&segments=" + nbString.substring(0,nbString.length-1));
                if (!response.ok) return false;

                let nbPredictions = await response.json();
                nbDecision = false;
                let predictionIdx = 0; //Keep track because only sponsor categories were submitted
                for (let i = 0; i < segments.length; i++){
                    if (segments[i].category === "sponsor"){
                        if (nbPredictions.probabilities[predictionIdx] < 0.70){
                          nbDecision = true; // At least one bad entry
                          startTime = parseFloat(segments[i].segment[0]);
                          endTime = parseFloat(segments[i].segment[1]);

                          const UUID = getSubmissionUUID(submission.videoID, segments[i].category, submission.userID, startTime, endTime);
                          // Send to Discord
                          // Note, if this is too spammy. Consider sending all the segments as one Webhook
                          sendWebhooksNB(submission.userID, submission.videoID, UUID, startTime, endTime, segments[i].category, nbPredictions.probabilities[predictionIdx], data);
                        }
                        predictionIdx++;
                    }

                }
                if (nbDecision){
                    return "Rejected based on NeuralBlock predictions.";
                } else {
                    return false;
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
                logger.debug('Proxy Submission: ' + result.statusCode + ' ('+result.body+')');
            } else {
                logger.error("Proxy Submission: Failed to make call");
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
        res.status(400).send("Parameters are not valid");
        return;
    }

    //hash the userID
    userID = getHash(userID);

    //hash the ip 5000 times so no one can get it from the database
    let hashedIP = getHash(getIP(req) + config.globalSalt);

    let noSegmentList = db.prepare('all', 'SELECT category from noSegments where videoID = ?', [videoID]).map((list) => { return list.category });
    
    //check if this user is on the vip list
    let isVIP = db.prepare("get", "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [userID]).userCount > 0;

    let decreaseVotes = 0;

    // Check if all submissions are correct
    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === undefined || segments[i].segment === undefined || segments[i].category === undefined) {
            //invalid request
            res.status(400).send("One of your segments are invalid");
            return;
        }
        
        if (!config.categoryList.includes(segments[i].category)) {
          res.status("400").send("Category doesn't exist.");
          return;
        }

        // Reject segemnt if it's in the no segments list
        if (!isVIP && noSegmentList.indexOf(segments[i].category) !== -1) {
            // TODO: Do something about the fradulent submission
            logger.warn("Caught a no-segment submission. userID: '" + userID + "', videoID: '" + videoID + "', category: '" + segments[i].category + "'");
            res.status(403).send(
              "Request rejected by auto moderator: New submissions are not allowed for the following category: '"
              + segments[i].category + "'. A moderator has decided that no new segments are needed and that all current segments of this category are timed perfectly.\n\n "
              + (segments[i].category === "sponsor" ? "Maybe the segment you are submitting is a different category that you have not enabled and is not a sponsor. " + 
                        "Categories that aren't sponsor, such as self-promotion can be enabled in the options.\n\n " : "")
              +  "If you believe this is incorrect, please contact someone on Discord."
            );
            return;
        }
        

        let startTime = parseFloat(segments[i].segment[0]);
        let endTime = parseFloat(segments[i].segment[1]);

        if (isNaN(startTime) || isNaN(endTime)
                || startTime === Infinity || endTime === Infinity || startTime < 0 || startTime >= endTime) {
            //invalid request
            res.status(400).send("One of your segments times are invalid (too short, startTime before endTime, etc.)");
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
        let autoModerateResult = await autoModerateSubmission({userID, videoID, segments});//startTime, endTime, category: segments[i].category});
        if (autoModerateResult == "Rejected based on NeuralBlock predictions."){
            // If NB automod rejects, the submission will start with -2 votes.
            // Note, if one submission is bad all submissions will be affected.
            // However, this behavior is consistent with other automod functions
            // already in place.
            //decreaseVotes = -2; //Disable for now
        } else if (autoModerateResult) {
            //Normal automod behavior
            res.status(403).send("Request rejected by auto moderator: " + autoModerateResult + " If this is an issue, send a message on Discord.");
            return;
        }
    }
    // Will be filled when submitting
    let UUIDs = [];

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

        let startingVotes = 0 + decreaseVotes;
        if (isVIP) {
            //this user is a vip, start them at a higher approval rating
            startingVotes = 10000;
        }

        if (config.youtubeAPIKey !== null) {
            let {err, data} = await new Promise((resolve, reject) => {
                YouTubeAPI.listVideos(videoID, "contentDetails,snippet", (err, data) => resolve({err, data}));
            });

            //get all segments for this video and user
            let allSubmittedByUser = db.prepare('all', "SELECT startTime, endTime FROM sponsorTimes WHERE userID = ? and videoID = ?", [userID, videoID]);
            let allSegmentTimes = [];
            if (allSubmittedByUser !== undefined)
            {
                for (const segmentInfo of allSubmittedByUser) {
                    allSegmentTimes.push([parseFloat(segmentInfo.startTime), parseFloat(segmentInfo.endTime)])
                }
            }
            for (let i = 0; i < segments.length; i++) {
                let startTime = parseFloat(segments[i].segment[0]);
                let endTime = parseFloat(segments[i].segment[1]);
                allSegmentTimes.push([startTime, endTime]);
            }
            const allSegmentsSorted = mergeTimeSegments(allSegmentTimes.sort(function(a, b) { return a[0]-b[0] || a[1]-b[1] }));

            let videoDuration = data.items[0].contentDetails.duration;
            videoDuration = isoDurations.toSeconds(isoDurations.parse(videoDuration));
            if (videoDuration != 0) {
                let allSegmentDuration = 0;
                allSegmentsSorted.forEach(segmentInfo => allSegmentDuration += segmentInfo[1] - segmentInfo[0]);
                if (allSegmentDuration > (videoDuration/100)*80) {
                    // Reject submission if all segments combine are over 80% of the video
                    res.status(400).send("Total length of your submitted segments are over 80% of the video.");
                    return;
                }
            }
        }

        for (const segmentInfo of segments) {
            //this can just be a hash of the data
            //it's better than generating an actual UUID like what was used before
            //also better for duplication checking
            const UUID = getSubmissionUUID(videoID, segmentInfo.category, userID, segmentInfo.segment[0], segmentInfo.segment[1]);

            try {
                db.prepare('run', "INSERT INTO sponsorTimes " + 
                    "(videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID)" +
                    "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                        videoID, segmentInfo.segment[0], segmentInfo.segment[1], startingVotes, UUID, userID, timeSubmitted, 0, segmentInfo.category, shadowBanned, getHash(videoID, 1)
                    ]
                );
            
                //add to private db as well
                privateDB.prepare('run', "INSERT INTO sponsorTimes VALUES(?, ?, ?)", [videoID, hashedIP, timeSubmitted]);
            } catch (err) {
                //a DB change probably occurred
                res.sendStatus(502);
                logger.error("Error when putting sponsorTime in the DB: " + videoID + ", " + segmentInfo.segment[0] + ", " +
                    segmentInfo.segment[1] + ", " + userID + ", " + segmentInfo.category + ". " + err);

                return;
            }

            UUIDs.push(UUID);
        }
    } catch (err) {
        logger.error(err);

        res.sendStatus(500);

        return;
    }

    res.sendStatus(200);

    for (let i = 0; i < segments.length; i++) {
        sendWebhooks(userID, videoID, UUIDs[i], segments[i]);
    }
}

// Takes an array of arrays: 
// ex) 
// [
//     [3, 40], 
//     [50, 70], 
//     [60, 80], 
//     [100, 150]
// ] 
// => transforms to combining overlapping segments
// [
//     [3, 40],
//     [50, 80], 
//     [100, 150]
// ]
function mergeTimeSegments(ranges) {
    var result = [], last;

    ranges.forEach(function (r) {
        if (!last || r[0] > last[1])
            result.push(last = r);
        else if (r[1] > last[1])
            last[1] = r[1];
    });

    return result;
}
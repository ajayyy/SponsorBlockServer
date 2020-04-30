var config = require('../config.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;
var YouTubeAPI = require('../utils/youtubeAPI.js');
var request = require('request');
var isoDurations = require('iso8601-duration');

var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');
var getFormattedTime = require('../utils/getFormattedTime.js');
const fetch = require('node-fetch');

// TODO: might need to be a util
//returns true if the user is considered trustworthy
//this happens after a user has made 5 submissions and has less than 60% downvoted submissions
async function isUserTrustworthy(userID) {
    //check to see if this user how many submissions this user has submitted
    let totalSubmissionsRow = db.prepare("SELECT count(*) as totalSubmissions, sum(votes) as voteSum FROM sponsorTimes WHERE userID = ?").get(userID);

    if (totalSubmissionsRow.totalSubmissions > 5) {
        //check if they have a high downvote ratio
        let downvotedSubmissionsRow = db.prepare("SELECT count(*) as downvotedSubmissions FROM sponsorTimes WHERE userID = ? AND (votes < 0 OR shadowHidden > 0)").get(userID);

        return (downvotedSubmissionsRow.downvotedSubmissions / totalSubmissionsRow.totalSubmissions) < 0.6 ||
                (totalSubmissionsRow.voteSum > downvotedSubmissionsRow.downvotedSubmissions);
    }

    return true;
}

function sendDiscordNotification(userID, videoID, UUID, segmentInfo) {
    //check if they are a first time user
    //if so, send a notification to discord
    if (config.youtubeAPIKey !== null && config.discordFirstTimeSubmissionsWebhookURL !== null) {
        let userSubmissionCountRow = db.prepare("SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?").get(userID);

        // If it is a first time submission
        if (userSubmissionCountRow.submissionCount <= 1) {
            YouTubeAPI.videos.list({
                part: "snippet",
                id: videoID
            }, function (err, data) {
                if (err || data.items.length === 0) {
                    err && console.log(err);
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
                            console.log("Failed to send first time submission Discord hook.");
                            console.log(JSON.stringify(err));
                            console.log("\n");
                        } else if (res && res.statusCode >= 400) {
                            console.log("Error sending first time submission Discord hook");
                            console.log(JSON.stringify(res));
                            console.log("\n");
                        }
                });
            });
        }
    }
}

// submission: {videoID, startTime, endTime}
// callback:  function(reject: "String containing reason the submission was rejected")
// returns: string when an error, false otherwise
async function autoModerateSubmission(submission, callback) {
    // Get the video information from the youtube API
    if (config.youtubeAPI !== null) {
        let {err, data} = await new Promise((resolve, reject) => {
            YouTubeAPI.videos.list({
                part: "contentDetails",
                id: submission.videoID
            }, (err, data) => resolve({err, data}));
        });

        if (err) {
            return "Couldn't get video information.";
        } else {
            // Check to see if video exists
            if (data.pageInfo.totalResults === 0) {
                return "No video exists with id " + submission.videoID;
            } else {
                let duration = data.items[0].contentDetails.duration;
                duration = isoDurations.toSeconds(isoDurations.parse(duration));

                if (duration == 0) {
                    // Allow submission if the duration is 0 (bug in youtube api)
                    return false;
                } else if ((submission.endTime - submission.startTime) > (duration / 100) * 80) {
                    // Reject submission if over 80% of the video
                    return "Sponsor segment is over 80% of the video.";
                } else {
                    let overlap = false;

                    let response = await fetch("https://ai.neuralblock.app/api/getSponsorSegments?vid=" + submission.videoID);
                    if (!response.ok) return false;

                    let nbPredictions = await response.json();
                    for (const nbSegment of nbPredictions.sponsorSegments) {
                        // The submission needs to be similar to the NB prediction by 65% or off by less than 7 seconds
                        // This calculated how off it is
                        let offAmount = Math.abs(nbSegment[0] - submission.startTime) + Math.abs(nbSegment[1] - submission.endTime);
                        if (offAmount / (nbSegment[1] - nbSegment[0]) <= 0.45 || offAmount <= 7) {
                            overlap = true;
                            break;
                        }
                    }

                    if (overlap) {
                        return false;
                    } else{
                        return "Sponsor segment doesn't have at least 65% match.";
                    }
                }
            }
        }

    } else {
        console.log("Skipped YouTube API");

        // Can't moderate the submission without calling the youtube API
        // so allow by default.
        return;
    }
}

module.exports = async function postSkipSegments(req, res) {
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

    // Check if all submissions are correct
    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === undefined || segments[i].segment === undefined || segments[i].category === undefined) {
            //invalid request
            res.sendStatus(400);
            return;
        }

        let startTime = parseFloat(segments[i].segment[0]);
        let endTime = parseFloat(segments[i].segment[1]);

        if (Math.abs(startTime - endTime) < 1 || isNaN(startTime) || isNaN(endTime)
                || startTime === Infinity || endTime === Infinity || startTime > endTime) {
            //invalid request
            res.sendStatus(400);
            return;
        }

        //check if this info has already been submitted before
        let duplicateCheck2Row = db.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE startTime = ? " +
            "and endTime = ? and category = ? and videoID = ?").get(startTime, endTime, segments[i].category, videoID);
        if (duplicateCheck2Row.count > 0) {
            res.sendStatus(409);
            return;
        }

        let autoModerateResult = await autoModerateSubmission({videoID, startTime, endTime});
        if (autoModerateResult) {
            res.status(403).send("Request rejected by auto moderator: " + autoModerateResult);
            return;
        }
    }

    try {
        //check if this user is on the vip list
        let vipRow = db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(userID);

        //get current time
        let timeSubmitted = Date.now();

        let yesterday = timeSubmitted - 86400000;

        //check to see if this ip has submitted too many sponsors today
        let rateLimitCheckRow = privateDB.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE hashedIP = ? AND videoID = ? AND timeSubmitted > ?").get([hashedIP, videoID, yesterday]);

        if (rateLimitCheckRow.count >= 10) {
            //too many sponsors for the same video from the same ip address
            res.sendStatus(429);

            return;
        }

        //check to see if the user has already submitted sponsors for this video
        let duplicateCheckRow = db.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE userID = ? and videoID = ?").get([userID, videoID]);

        if (duplicateCheckRow.count >= 8) {
            //too many sponsors for the same video from the same user
            res.sendStatus(429);

            return;
        }

        //check to see if this user is shadowbanned
        let shadowBanRow = privateDB.prepare("SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?").get(userID);

        let shadowBanned = shadowBanRow.userCount;

        if (!(await isUserTrustworthy(userID))) {
            //hide this submission as this user is untrustworthy
            shadowBanned = 1;
        }

        let startingVotes = 0;
        if (vipRow.userCount > 0) {
            //this user is a vip, start them at a higher approval rating
            startingVotes = 10;
        }

        for (const segmentInfo of segments) {
            //this can just be a hash of the data
            //it's better than generating an actual UUID like what was used before
            //also better for duplication checking
            let UUID = getHash("v2-categories" + videoID + segmentInfo.segment[0] +
                segmentInfo.segment[1]  + segmentInfo.category + userID, 1);

            try {
                db.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(videoID, segmentInfo.segment[0],
                    segmentInfo.segment[1], startingVotes, UUID, userID, timeSubmitted, 0, segmentInfo.category, shadowBanned);

                //add to private db as well
                privateDB.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?)").run(videoID, hashedIP, timeSubmitted);
            } catch (err) {
                //a DB change probably occurred
                res.sendStatus(502);
                console.log("Error when putting sponsorTime in the DB: " + videoID + ", " + segmentInfo.segment[0] + ", " +
                    segmentInfo.segment[1] + ", " + userID + ", " + segmentInfo.category + ". " + err);

                return;
            }

            // Discord notification
            sendDiscordNotification(userID, videoID, UUID, segmentInfo);
        }
    } catch (err) {
        console.error(err);

        res.sendStatus(500);

        return;
    }

    res.sendStatus(200);
}

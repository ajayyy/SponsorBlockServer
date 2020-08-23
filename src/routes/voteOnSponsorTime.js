var fs = require('fs');
var config = require('../config.js');

var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');
var getFormattedTime = require('../utils/getFormattedTime.js');
var isUserTrustworthy = require('../utils/isUserTrustworthy.js')

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;
var YouTubeAPI = require('../utils/youtubeAPI.js');
var request = require('request');
const logger = require('../utils/logger.js');

function getVoteAuthor(submissionCount, isVIP, isOwnSubmission) {
    if (submissionCount === 0) {
        return "Report by New User";
    } else if (isVIP) {
        return "Report by VIP User";
    } else if (isOwnSubmission) {
        return "Report by Submitter";
    }

    return "";
}

function categoryVote(UUID, userID, isVIP, category, hashedIP, res) {
    // Check if they've already made a vote
    let previousVoteInfo = privateDB.prepare('get', "select count(*) as votes, category from categoryVotes where UUID = ? and userID = ?", [UUID, userID]);

    if (previousVoteInfo > 0 && previousVoteInfo.category === category) {
        // Double vote, ignore
        res.sendStatus(200);
        return;
    }

    let currentCategory = db.prepare('get', "select category from sponsorTimes where UUID = ?", [UUID]);
    if (!currentCategory) {
        // Submission doesn't exist
        res.status("400").send("Submission doesn't exist.");
        return;
    }

    let timeSubmitted = Date.now();

    let voteAmount = isVIP ? 500 : 1;

    // Add the vote
    if (db.prepare('get', "select count(*) as count from categoryVotes where UUID = ? and category = ?", [UUID, category]).count > 0) {
        // Update the already existing db entry
        db.prepare('run', "update categoryVotes set votes = votes + ? where UUID = ? and category = ?", [voteAmount, UUID, category]);
    } else {
        // Add a db entry
        db.prepare('run', "insert into categoryVotes (UUID, category, votes) values (?, ?, ?)", [UUID, category, voteAmount]);
    }

    // Add the info into the private db
    if (previousVoteInfo > 0) {
        // Reverse the previous vote
        db.prepare('run', "update categoryVotes set votes -= 1 where UUID = ? and category = ?", [UUID, previousVoteInfo.category]);

        privateDB.prepare('run', "update categoryVotes set category = ?, timeSubmitted = ?, hashedIP = ?", [category, timeSubmitted, hashedIP]);
    } else {
        privateDB.prepare('run', "insert into categoryVotes (UUID, userID, hashedIP, category, timeSubmitted) values (?, ?, ?, ?, ?)", [UUID, userID, hashedIP, category, timeSubmitted]);
    }

    // See if the submissions category is ready to change
    let currentCategoryInfo = db.prepare('get', "select votes from categoryVotes where UUID = ? and category = ?", [UUID, currentCategory.category]);

    // Change this value from 1 in the future to make it harder to change categories
    // Done this way without ORs incase the value is zero
    let currentCategoryCount = (currentCategoryInfo === undefined || currentCategoryInfo === null) ? 1 : currentCategoryInfo.votes;

    let nextCategoryCount = (previousVoteInfo.votes || 0) + 1;

    //TODO: In the future, raise this number from zero to make it harder to change categories
    // VIPs change it every time
    if (nextCategoryCount - currentCategoryCount >= 0 || isVIP) {
        // Replace the category
        db.prepare('run', "update sponsorTimes set category = ? where UUID = ?", [category, UUID]);
    }

    res.sendStatus(200);
}

async function voteOnSponsorTime(req, res) {
    let UUID = req.query.UUID;
    let userID = req.query.userID;
    let type = req.query.type;
    let category = req.query.category;

    if (UUID === undefined || userID === undefined || (type === undefined && category === undefined)) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    let nonAnonUserID = getHash(userID);
    userID = getHash(userID + UUID);

    //x-forwarded-for if this server is behind a proxy
    let ip = getIP(req);

    //hash the ip 5000 times so no one can get it from the database
    let hashedIP = getHash(ip + config.globalSalt);

    //check if this user is on the vip list
    let isVIP = db.prepare('get', "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [nonAnonUserID]).userCount > 0;

    //check if user voting on own submission
    let isOwnSubmission = db.prepare("get", "SELECT UUID as submissionCount FROM sponsorTimes where userID = ? AND UUID = ?", [nonAnonUserID, UUID]) !== undefined;
        
    if (type === undefined && category !== undefined) {
        return categoryVote(UUID, userID, isVIP, category, hashedIP, res);
    }

    if (type == 1 && !isVIP) {
        // Check if upvoting hidden segment
        let voteInfo = db.prepare('get', "SELECT votes FROM sponsorTimes WHERE UUID = ?", [UUID]);

        if (voteInfo && voteInfo.votes <= -2) {
            res.status(403).send("Not allowed to upvote segment with too many downvotes unless you are VIP.")
            return;
        }
    }

    let voteTypes = {
        normal: 0,
        incorrect: 1
    }

    let voteTypeEnum = (type == 0 || type == 1) ? voteTypes.normal : voteTypes.incorrect;

    try {
        //check if vote has already happened
        let votesRow = privateDB.prepare('get', "SELECT type FROM votes WHERE userID = ? AND UUID = ?", [userID, UUID]);
        
        //-1 for downvote, 1 for upvote. Maybe more depending on reputation in the future
        let incrementAmount = 0;
        let oldIncrementAmount = 0;

        if (type == 1 || type == 11) {
            //upvote
            incrementAmount = 1;
        } else if (type == 0 || type == 10) {
            //downvote
            incrementAmount = -1;
        } else if (type == 20) {
            //undo/cancel vote
            incrementAmount = 0;
        } else {
            //unrecongnised type of vote
            res.sendStatus(400);
            return;
        }
        if (votesRow != undefined) {
            if (votesRow.type === 1 || type === 11) {
                //upvote
                oldIncrementAmount = 1;
            } else if (votesRow.type === 0 || type === 10) {
                //downvote
                oldIncrementAmount = -1;
            } else if (votesRow.type === 2) {
                //extra downvote
                oldIncrementAmount = -4;
            } else if (votesRow.type < 0) {
                //vip downvote
                oldIncrementAmount = votesRow.type;
            } else if (votesRow.type === 12) {
                // VIP downvote for completely incorrect
                oldIncrementAmount = -500;
            } else if (votesRow.type === 13) {
                // VIP upvote for completely incorrect
                oldIncrementAmount = 500;
            }
        }

        //check if the increment amount should be multiplied (downvotes have more power if there have been many views)
        let row = db.prepare('get', "SELECT votes, views FROM sponsorTimes WHERE UUID = ?", [UUID]);

        if (voteTypeEnum === voteTypes.normal) {
            if ((isVIP || isOwnSubmission) && incrementAmount < 0) {
                //this user is a vip and a downvote
                incrementAmount = - (row.votes + 2 - oldIncrementAmount);
                type = incrementAmount;
            }
        } else if (voteTypeEnum == voteTypes.incorrect) {
            if (isVIP || isOwnSubmission) {
                //this user is a vip and a downvote
                incrementAmount = 500 * incrementAmount;
                type = incrementAmount < 0 ? 12 : 13;
            }
        }

<<<<<<< HEAD
        // Get video ID
        let submissionInfoRow = db.prepare('get', "SELECT s.videoID, s.userID, s.startTime, s.endTime, s.category, u.userName, " +
            "(select count(1) from sponsorTimes where userID = s.userID) count, " +
            "(select count(1) from sponsorTimes where userID = s.userID and votes <= -2) disregarded " +
            "FROM sponsorTimes s left join userNames u on s.userID = u.userID where s.UUID=?",
        [UUID]);

        let userSubmissionCountRow = db.prepare('get', "SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?", [nonAnonUserID]);

        if (submissionInfoRow !== undefined && userSubmissionCountRow != undefined) {
            let webhookURL = null;
            if (voteTypeEnum === voteTypes.normal) {
                webhookURL = config.discordReportChannelWebhookURL;
            } else if (voteTypeEnum === voteTypes.incorrect) {
                webhookURL = config.discordCompletelyIncorrectReportWebhookURL;
            }

            if (config.youtubeAPIKey !== null && (webhookURL !== null || config.webhooks.size !== 0)) {
                YouTubeAPI.videos.list({
                    part: "snippet",
                    id: submissionInfoRow.videoID
                }, function (err, data) {
                    if (err || data.items.length === 0) {
                        err && console.log(err);
                        return;
                    }
                    let isUpvote = incrementAmount > 0
                    // Send custom webhooks
                    if (config.webhooks.size !== 0) {
                        console.log("Dispatching webhooks");
                        config.webhooks.forEach(customWebhook => {
                            let customWebhookURL = customWebhook.url;
                            let scopes = customWebhook.scopes;
                            let key = customWebhook.key;
                            if ((!isUpvote && !scopes.includes("vote.down")) || (isUpvote && !scopes.includes("vote.up"))) {
                                return;
                            }
                            request.post(customWebhookURL, {
                                json: {
                                    "user": {
                                        "status": userSubmissionCountRow.submissionCount === 0 ? "new" : (isVIP ? "vip" : "normal")
                                    },
                                    "video": {
                                        "id": submissionInfoRow.videoID,
                                        "title": data.items[0].snippet.title,
                                        "url": "https://www.youtube.com/watch?v=" + submissionInfoRow.videoID,
                                        "thumbnail": data.items[0].snippet.thumbnails.maxres ? data.items[0].snippet.thumbnails.maxres.url : ""
                                    },
                                    "submission": {
                                        "id": UUID,
                                        "views": row.views,
                                        "category": category,
                                        "startTime": submissionInfoRow.startTime,
                                        "endTime": submissionInfoRow.endTime,
                                        "user": {
                                            "uuid": submissionInfoRow.userID,
                                            "username": submissionInfoRow.userName,
                                            "submissions": {
                                                "total": submissionInfoRow.count,
                                                "ignored": submissionInfoRow.disregarded
                                            }
                                        }
                                    },
                                    "votes": {
                                        "before": row.votes,
                                        "after": (row.votes + incrementAmount - oldIncrementAmount)
                                    }
                                },
                                headers: {
                                    "Authorization": key,
                                    "Event-Type": isUpvote ? "upvote" : "downvote"
                                }
                            });
                        });
                    }
                    // Send discord message
                    if (webhookURL !== null && !isUpvote) {
=======
        // Send discord message
        if (incrementAmount < 0) {
            // Get video ID
            let submissionInfoRow = db.prepare('get', "SELECT s.videoID, s.userID, s.startTime, s.endTime, s.category, u.userName, " +
                "(select count(1) from sponsorTimes where userID = s.userID) count, " +
                "(select count(1) from sponsorTimes where userID = s.userID and votes <= -2) disregarded " +
                "FROM sponsorTimes s left join userNames u on s.userID = u.userID where s.UUID=?",
            [UUID]);

            let userSubmissionCountRow = db.prepare('get', "SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?", [nonAnonUserID]);

            if (submissionInfoRow !== undefined && userSubmissionCountRow != undefined) {
                let webhookURL = null;
                if (voteTypeEnum === voteTypes.normal) {
                    webhookURL = config.discordReportChannelWebhookURL;
                } else if (voteTypeEnum === voteTypes.incorrect) {
                    webhookURL = config.discordCompletelyIncorrectReportWebhookURL;
                }
    
                if (config.youtubeAPIKey !== null && webhookURL !== null) {
                    YouTubeAPI.videos.list({
                        part: "snippet",
                        id: submissionInfoRow.videoID
                    }, function (err, data) {
                        if (err || data.items.length === 0) {
                            err && logger.error(err);
                            return;
                        }
                        
>>>>>>> origin/master
                        request.post(webhookURL, {
                            json: {
                                "embeds": [{
                                    "title": data.items[0].snippet.title,
                                    "url": "https://www.youtube.com/watch?v=" + submissionInfoRow.videoID 
                                        + "&t=" + (submissionInfoRow.startTime.toFixed(0) - 2),
                                    "description": "**" + row.votes + " Votes Prior | " + (row.votes + incrementAmount - oldIncrementAmount) + " Votes Now | " + row.views 
                                        + " Views**\n\n**Submission ID:** " + UUID 
                                        + "\n**Category:** " + submissionInfoRow.category
                                        + "\n\n**Submitted by:** "+submissionInfoRow.userName+"\n " + submissionInfoRow.userID 
                                        + "\n\n**Total User Submissions:** "+submissionInfoRow.count
                                        + "\n**Ignored User Submissions:** "+submissionInfoRow.disregarded
                                        +"\n\n**Timestamp:** " + 
                                            getFormattedTime(submissionInfoRow.startTime) + " to " + getFormattedTime(submissionInfoRow.endTime),
                                    "color": 10813440,
                                    "author": {
                                        "name": getVoteAuthor(userSubmissionCountRow.submissionCount, isVIP, isOwnSubmission)
                                    },
                                    "thumbnail": {
                                        "url": data.items[0].snippet.thumbnails.maxres ? data.items[0].snippet.thumbnails.maxres.url : "",
                                    }
                                }]
                            }
                        }, (err, res) => {
                            if (err) {
                                logger.error("Failed to send reported submission Discord hook.");
                                logger.error(JSON.stringify(err));
                                logger.error("\n");
                            } else if (res && res.statusCode >= 400) {
                                logger.error("Error sending reported submission Discord hook");
                                logger.error(JSON.stringify(res));
                                logger.error("\n");
                            }
                        });
                    }

                });
            }
        }

        // Only change the database if they have made a submission before and haven't voted recently
        let ableToVote = isVIP 
                        || (db.prepare("get", "SELECT userID FROM sponsorTimes WHERE userID = ?", [nonAnonUserID]) !== undefined
                        && privateDB.prepare("get", "SELECT userID FROM shadowBannedUsers WHERE userID = ?", [nonAnonUserID]) === undefined
                        && privateDB.prepare("get", "SELECT UUID FROM votes WHERE UUID = ? AND hashedIP = ? AND userID != ?", [UUID, hashedIP, userID]) === undefined);

        if (ableToVote) {
            //update the votes table
            if (votesRow != undefined) {
                privateDB.prepare('run', "UPDATE votes SET type = ? WHERE userID = ? AND UUID = ?", [type, userID, UUID]);
            } else {
                privateDB.prepare('run', "INSERT INTO votes VALUES(?, ?, ?, ?)", [UUID, userID, hashedIP, type]);
            }

            let columnName = "";
            if (voteTypeEnum === voteTypes.normal) {
                columnName = "votes";
            } else if (voteTypeEnum === voteTypes.incorrect) {
                columnName = "incorrectVotes";
            }

            //update the vote count on this sponsorTime
            //oldIncrementAmount will be zero is row is null
            db.prepare('run', "UPDATE sponsorTimes SET " + columnName + " = " + columnName + " + ? WHERE UUID = ?", [incrementAmount - oldIncrementAmount, UUID]);

            //for each positive vote, see if a hidden submission can be shown again
            if (incrementAmount > 0 && voteTypeEnum === voteTypes.normal) {
                //find the UUID that submitted the submission that was voted on
                let submissionUserIDInfo = db.prepare('get', "SELECT userID FROM sponsorTimes WHERE UUID = ?", [UUID]);
                if (!submissionUserIDInfo) {
                    // They are voting on a non-existent submission
                    res.status(400).send("Voting on a non-existent submission");
                    return;
                }

                let submissionUserID = submissionUserIDInfo.userID;

                //check if any submissions are hidden
                let hiddenSubmissionsRow = db.prepare('get', "SELECT count(*) as hiddenSubmissions FROM sponsorTimes WHERE userID = ? AND shadowHidden > 0", [submissionUserID]);

                if (hiddenSubmissionsRow.hiddenSubmissions > 0) {
                    //see if some of this users submissions should be visible again
                    
                    if (await isUserTrustworthy(submissionUserID)) {
                        //they are trustworthy again, show 2 of their submissions again, if there are two to show
                        db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE ROWID IN (SELECT ROWID FROM sponsorTimes WHERE userID = ? AND shadowHidden = 1 LIMIT 2)", [submissionUserID]);
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (err) {
        logger.error(err);

        res.status(500).json({error: 'Internal error creating segment vote'});
    }
}

module.exports = {
    voteOnSponsorTime,
    endpoint: function (req, res) {
       voteOnSponsorTime(req, res);
    },
  };

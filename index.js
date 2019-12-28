var express = require('express');
var fs = require('fs');
var http = require('http');
// Create a service (the app object is just a callback).
var app = express();

//hashing service
var crypto = require('crypto');

let config = JSON.parse(fs.readFileSync('config.json'));

var request = require('request');

// YouTube API
const YouTubeAPI = require("youtube-api");
YouTubeAPI.authenticate({
    type: "key",
    key: config.youtubeAPIKey
});

var sqlite3 = require('sqlite3').verbose();

let dbMode = sqlite3.OPEN_READWRITE;
if (config.readOnly) {
    dbMode =  sqlite3.OPEN_READONLY;
}

//load database
var db = new sqlite3.Database(config.db, dbMode);
//where the more sensitive data such as IP addresses are stored
var privateDB = new sqlite3.Database(config.privateDB, dbMode);

// Create an HTTP service.
http.createServer(app).listen(config.port);

var globalSalt = config.globalSalt;
var adminUserID = config.adminUserID;

//if so, it will use the x-forwarded header instead of the ip address of the connection
var behindProxy = config.behindProxy;

//setup CORS correctly
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//add the get function
app.get('/api/getVideoSponsorTimes', function (req, res) {
    let videoID = req.query.videoID;

    let sponsorTimes = [];
    let votes = []
    let UUIDs = [];

    let hashedIP = getHash(getIP(req) + globalSalt);

    db.prepare("SELECT startTime, endTime, votes, UUID, shadowHidden FROM sponsorTimes WHERE videoID = ? ORDER BY startTime").all(videoID, async function(err, rows) {
        if (err) console.log(err);

        for (let i = 0; i < rows.length; i++) {
            //check if votes are above -1
            if (rows[i].votes < -1) {
                //too untrustworthy, just ignore it
                continue;
            }

            //check if shadowHidden
            //this means it is hidden to everyone but the original ip that submitted it
            if (rows[i].shadowHidden == 1) {
                //get the ip
                //await the callback
                let result = await new Promise((resolve, reject) => {
                    privateDB.prepare("SELECT hashedIP FROM sponsorTimes WHERE videoID = ?").all(videoID, (err, rows) => resolve({err, rows}));
                });

                if (!result.rows.some((e) => e.hashedIP === hashedIP)) {
                    //this isn't their ip, don't send it to them
                    continue;
                }
            }

            sponsorTimes.push([]);
            
            let index = sponsorTimes.length - 1;
    
            sponsorTimes[index][0] = rows[i].startTime;
            sponsorTimes[index][1] = rows[i].endTime;

            votes[index] = rows[i].votes;
            UUIDs[index] = rows[i].UUID;
        }

        if (sponsorTimes.length == 0) {
            res.sendStatus(404);
            return;
        }

        organisedData = getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs);
        sponsorTimes = organisedData.sponsorTimes;
        UUIDs = organisedData.UUIDs;

        if (sponsorTimes.length == 0) {
            res.sendStatus(404);
        } else {
            //send result
            res.send({
                sponsorTimes: sponsorTimes,
                UUIDs: UUIDs
            })
        }
    });
});

function getIP(req) {
    return behindProxy ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
}

//add the post function
app.get('/api/postVideoSponsorTimes', async function (req, res) {
    let videoID = req.query.videoID;
    let startTime = req.query.startTime;
    let endTime = req.query.endTime;
    let userID = req.query.userID;

    //check if all correct inputs are here and the length is 1 second or more
    if (videoID == undefined || startTime == undefined || endTime == undefined || userID == undefined
            || Math.abs(startTime - endTime) < 1) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    //hash the ip 5000 times so no one can get it from the database
    let hashedIP = getHash(getIP(req) + globalSalt);

    startTime = parseFloat(startTime);
    endTime = parseFloat(endTime);

    if (isNaN(startTime) || isNaN(endTime)) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    if (startTime > endTime) {
        //time can't go backwards
        res.sendStatus(400);
        return;
    }

    //check if this user is on the vip list
    let vipResult = await new Promise((resolve, reject) => {
        db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(userID, (err, row) => resolve({err, row}));
    });

    //this can just be a hash of the data
    //it's better than generating an actual UUID like what was used before
    //also better for duplication checking
    let hashCreator = crypto.createHash('sha256');
    let UUID = hashCreator.update(videoID + startTime + endTime + userID).digest('hex');

    //get current time
    let timeSubmitted = Date.now();

    let yesterday = timeSubmitted - 86400000;

    //check to see if this ip has submitted too many sponsors today
    privateDB.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE hashedIP = ? AND videoID = ? AND timeSubmitted > ?").get([hashedIP, videoID, yesterday], function(err, row) {
        if (row.count >= 10) {
            //too many sponsors for the same video from the same ip address
            res.sendStatus(429);
        } else {
            //check to see if the user has already submitted sponsors for this video
            db.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE userID = ? and videoID = ?").get([userID, videoID], function(err, row) {
                if (row.count >= 8) {
                    //too many sponsors for the same video from the same user
                    res.sendStatus(429);
                } else {
                    //check if this info has already been submitted first
                    db.prepare("SELECT UUID FROM sponsorTimes WHERE startTime = ? and endTime = ? and videoID = ?").get([startTime, endTime, videoID], async function(err, row) {
                        if (err) console.log(err);

                        //check to see if this user is shadowbanned
                        let shadowBanResult = await new Promise((resolve, reject) => {
                            privateDB.prepare("SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?").get(userID, (err, row) => resolve({err, row}));
                        });

                        let shadowBanned = shadowBanResult.row.userCount;

                        if (!(await isUserTrustworthy(userID))) {
                            //hide this submission as this user is untrustworthy
                            shadowBanned = 1;
                        }

                        let startingVotes = 0;
                        if (vipResult.row.userCount > 0) {
                            //this user is a vip, start them at a higher approval rating
                            startingVotes = 10;
                        }
        
                        if (row == null) {
                            //not a duplicate, execute query
                            db.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)").run(videoID, startTime, endTime, startingVotes, UUID, userID, timeSubmitted, 0, shadowBanned, function (err) {
                                if (err) {
                                    //a DB change probably occurred
                                    res.sendStatus(502);

                                    console.log("Error when putting sponsorTime in the DB: " + videoID + ", " + startTime + ", " + "endTime" + ", " + userID);
                                } else {
                                    //add to private db as well
                                    privateDB.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?)").run(videoID, hashedIP, timeSubmitted);

                                    res.sendStatus(200);
                                }
                            });
                        } else {
                            res.sendStatus(409);
                        }

                        //check if they are a first time user
                        //if so, send a notification to discord
                        if (config.youtubeAPIKey !== null && config.discordFirstTimeSubmissionsWebhookURL !== null && row == null) {
                            let userSubmissionCountResult = await new Promise((resolve, reject) => {
                                db.prepare("SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?").get(userID, (err, row) => resolve({err, row}));
                            });

                            // If it is a first time submission
                            if (userSubmissionCountResult.row.submissionCount === 0) {
                                YouTubeAPI.videos.list({
                                    part: "snippet",
                                    id: videoID
                                }, function (err, data) {
                                    if (err) {
                                        console.log(err);
                                        return;
                                    }
                                    
                                    request.post(config.discordFirstTimeSubmissionsWebhookURL, {
                                        json: {
                                            "embeds": [{
                                                "title": data.items[0].snippet.title,
                                                "url": "https://www.youtube.com/watch?v=" + videoID + "&t=" + (startTime.toFixed(0) - 2),
                                                "description": "Submission ID: " + UUID +
                                                        "\n\nTimestamp: " + 
                                                        getFormattedTime(startTime) + " to " + getFormattedTime(endTime),
                                                "color": 10813440,
                                                "author": {
                                                    "name": userID
                                                },
                                                "thumbnail": {
                                                    "url": data.items[0].snippet.thumbnails.maxres.url,
                                                }
                                            }]
                                        }
                                    });
                                });
                            }
                        }
                    });
                }
            });
        }
    });
});

//voting endpoint
app.get('/api/voteOnSponsorTime', function (req, res) {
    let UUID = req.query.UUID;
    let userID = req.query.userID;
    let type = req.query.type;

    if (UUID == undefined || userID == undefined || type == undefined) {
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
    let hashedIP = getHash(ip + globalSalt);

    //check if vote has already happened
    privateDB.prepare("SELECT type FROM votes WHERE userID = ? AND UUID = ?").get(userID, UUID, async function(err, votesRow) {
        if (err) console.log(err);
                
        if (votesRow != undefined && votesRow.type == type) {
            //they have already done this exact vote
            res.status(405).send("Duplicate Vote");
            return;
        }

        //-1 for downvote, 1 for upvote. Maybe more depending on reputation in the future
        let incrementAmount = 0;
        let oldIncrementAmount = 0;

        if (type == 1) {
            //upvote
            incrementAmount = 1;
        } else if (type == 0) {
            //downvote
            incrementAmount = -1;
        } else {
            //unrecongnised type of vote
            res.sendStatus(400);
            return;
        }
        if (votesRow != undefined) {
            if (votesRow.type == 1) {
                //upvote
                oldIncrementAmount = 1;
            } else if (votesRow.type == 0) {
                //downvote
                oldIncrementAmount = -1;
            } else if (votesRow.type == 2) {
                //extra downvote
                oldIncrementAmount = -4;
            } else if (votesRow.type < 0) {
                //vip downvote
                oldIncrementAmount = votesRow.type;
            }
        }

        //check if this user is on the vip list
        let vipResult = await new Promise((resolve, reject) => {
            db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(nonAnonUserID, (err, row) => resolve({err, row}));
        });

        //check if the increment amount should be multiplied (downvotes have more power if there have been many views)
        db.prepare("SELECT votes, views FROM sponsorTimes WHERE UUID = ?").get(UUID, async function(err, row) {
            if (vipResult.row.userCount != 0 && incrementAmount < 0) {
                //this user is a vip and a downvote
                incrementAmount = -Math.min(350, row.votes + 2 - oldIncrementAmount);
                type = incrementAmount;
            } else if (row != null && (row.votes > 8 || row.views > 15) && incrementAmount < 0) {
                //increase the power of this downvote
                incrementAmount = -10;
                type = incrementAmount;
            }

            // Send discord message
            if (type != 1) {
                // Get video ID
                let submissionInfoResult = await new Promise((resolve, reject) => {
                    db.prepare("SELECT videoID, userID, startTime, endTime FROM sponsorTimes WHERE UUID = ?").get(UUID, (err, row) => resolve({err, row}));
                });

                let userSubmissionCountResult = await new Promise((resolve, reject) => {
                    db.prepare("SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?").get(nonAnonUserID, (err, row) => resolve({err, row}));
                });

                if (config.youtubeAPIKey !== null && config.discordReportChannelWebhookURL !== null) {
                    YouTubeAPI.videos.list({
                        part: "snippet",
                        id: submissionInfoResult.row.videoID
                    }, function (err, data) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        
                        request.post(config.discordReportChannelWebhookURL, {
                            json: {
                                "embeds": [{
                                    "title": data.items[0].snippet.title,
                                    "url": "https://www.youtube.com/watch?v=" + submissionInfoResult.row.videoID + 
                                             "&t=" + (submissionInfoResult.row.startTime.toFixed(0) - 2),
                                    "description": "**" + row.votes + " Votes Prior | " (row.votes + incrementAmount - oldIncrementAmount) + " Votes Now | " + row.views + 
                                                    " Views**\n\nSubmission ID: " + UUID + 
                                        "\n\nSubmitted by: " + submissionInfoResult.row.userID + "\n\nTimestamp: " + 
                                            getFormattedTime(submissionInfoResult.row.startTime) + " to " + getFormattedTime(submissionInfoResult.row.endTime),
                                    "color": 10813440,
                                    "author": {
                                        "name": userSubmissionCountResult.row.submissionCount === 0 ? "Report by New User" : (vipResult.row.userCount !== 0 ? "Report by VIP User" : "")
                                    },
                                    "thumbnail": {
                                        "url": data.items[0].snippet.thumbnails.maxres.url,
                                    }
                                }]
                            }
                        });
                    });
                }
            }

            //update the votes table
            if (votesRow != undefined) {
                privateDB.prepare("UPDATE votes SET type = ? WHERE userID = ? AND UUID = ?").run(type, userID, UUID);
            } else {
                privateDB.prepare("INSERT INTO votes VALUES(?, ?, ?, ?)").run(UUID, userID, hashedIP, type);
            }

            //update the vote count on this sponsorTime
            //oldIncrementAmount will be zero is row is null
            db.prepare("UPDATE sponsorTimes SET votes = votes + ? WHERE UUID = ?").run(incrementAmount - oldIncrementAmount, UUID);

            //for each positive vote, see if a hidden submission can be shown again
            if (incrementAmount > 0) {
                //find the UUID that submitted the submission that was voted on
                let userIDSubmittedResult = await new Promise((resolve, reject) => {
                    db.prepare("SELECT userID FROM sponsorTimes WHERE UUID = ?").get(UUID, (err, row) => resolve({err, row}));
                });

                let submissionUserID = userIDSubmittedResult.row.userID;

                //check if any submissions are hidden
                let hiddenSubmissionsResult = await new Promise((resolve, reject) => {
                    db.prepare("SELECT count(*) as hiddenSubmissions FROM sponsorTimes WHERE userID = ? AND shadowHidden > 0").get(submissionUserID, (err, row) => resolve({err, row}));
                });

                if (hiddenSubmissionsResult.row.hiddenSubmissions > 0) {
                    //see if some of this users submissions should be visible again
                    
                    if (await isUserTrustworthy(submissionUserID)) {
                        //they are trustworthy again, show 2 of their submissions again, if there are two to show
                        db.prepare("UPDATE sponsorTimes SET shadowHidden = 0 WHERE ROWID IN (SELECT ROWID FROM sponsorTimes WHERE userID = ? AND shadowHidden = 1 LIMIT 2)").run(submissionUserID)
                    }
                }
            }

            //added to db
            res.sendStatus(200);
        });
    });
});

//Endpoint when a sponsorTime is used up
app.get('/api/viewedVideoSponsorTime', function (req, res) {
    let UUID = req.query.UUID;

    if (UUID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //up the view count by one
    db.prepare("UPDATE sponsorTimes SET views = views + 1 WHERE UUID = ?").run(UUID);

    res.sendStatus(200);
});

//To set your username for the stats view
app.post('/api/setUsername', function (req, res) {
    let userID = req.query.userID;
    let userName = req.query.username;

    let adminUserIDInput = req.query.adminUserID;

    if (userID == undefined || userName == undefined || userID === "undefined") {
        //invalid request
        res.sendStatus(400);
        return;
    }

    if (adminUserIDInput != undefined) {
        //this is the admin controlling the other users account, don't hash the controling account's ID
        adminUserIDInput = getHash(adminUserIDInput);

        if (adminUserIDInput != adminUserID) {
            //they aren't the admin
            res.sendStatus(403);
            return;
        }
    } else {
        //hash the userID
        userID = getHash(userID);
    }

    //check if username is already set
    db.prepare("SELECT count(*) as count FROM userNames WHERE userID = ?").get(userID, function(err, row) {
        if (err) console.log(err);
                
        if (row.count > 0) {
            //already exists, update this row
            db.prepare("UPDATE userNames SET userName = ? WHERE userID = ?").run(userName, userID);
        } else {
            //add to the db
            db.prepare("INSERT INTO userNames VALUES(?, ?)").run(userID, userName);
        }

        res.sendStatus(200);
    });
});

//get what username this user has
app.get('/api/getUsername', function (req, res) {
    let userID = req.query.userID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    db.prepare("SELECT userName FROM userNames WHERE userID = ?").get(userID, function(err, row) {
        if (err) console.log(err);
        
        if (row != null) {
            res.send({
                userName: row.userName
            });
        } else {
            //no username yet, just send back the userID
            res.send({
                userName: userID
            });
        }
    });
});

//Endpoint used to hide a certain user's data
app.post('/api/shadowBanUser', async function (req, res) {
    let userID = req.query.userID;
    let adminUserIDInput = req.query.adminUserID;

    let enabled = req.query.enabled;
    if (enabled === undefined){
        enabled = true;
    } else {
        enabled = enabled === "true";
    }

    //if enabled is false and the old submissions should be made visible again
    let unHideOldSubmissions = req.query.unHideOldSubmissions;
    if (enabled === undefined){
        unHideOldSubmissions = true;
    } else {
        unHideOldSubmissions = unHideOldSubmissions === "true";
    }

    if (adminUserIDInput == undefined || userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    if (adminUserIDInput !== adminUserID) {
        //not authorized
        res.sendStatus(403);
        return;
    }

    //check to see if this user is already shadowbanned
    let result = await new Promise((resolve, reject) => {
        privateDB.prepare("SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?").get(userID, (err, row) => resolve({err, row}));
    });

    if (enabled && result.row.userCount == 0) {
        //add them to the shadow ban list

        //add it to the table
        privateDB.prepare("INSERT INTO shadowBannedUsers VALUES(?)").run(userID);

        //find all previous submissions and hide them
        db.prepare("UPDATE sponsorTimes SET shadowHidden = 1 WHERE userID = ?").run(userID);
    } else if (!enabled && result.row.userCount > 0) {
        //remove them from the shadow ban list
        privateDB.prepare("DELETE FROM shadowBannedUsers WHERE userID = ?").run(userID);

        //find all previous submissions and unhide them
        if (unHideOldSubmissions) {
            db.prepare("UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?").run(userID);
        }
    }

    res.sendStatus(200);
});

//Endpoint used to make a user a VIP user with special privileges
app.post('/api/addUserAsVIP', async function (req, res) {
    let userID = req.query.userID;
    let adminUserIDInput = req.query.adminUserID;

    let enabled = req.query.enabled;
    if (enabled === undefined){
        enabled = true;
    } else {
        enabled = enabled === "true";
    }

    if (userID == undefined || adminUserIDInput == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    adminUserIDInput = getHash(adminUserIDInput);

    if (adminUserIDInput !== adminUserID) {
        //not authorized
        res.sendStatus(403);
        return;
    }

    //check to see if this user is already a vip
    let result = await new Promise((resolve, reject) => {
        db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(userID, (err, row) => resolve({err, row}));
    });

    if (enabled && result.row.userCount == 0) {
        //add them to the vip list
        db.prepare("INSERT INTO vipUsers VALUES(?)").run(userID);
    } else if (!enabled && result.row.userCount > 0) {
        //remove them from the shadow ban list
        db.prepare("DELETE FROM vipUsers WHERE userID = ?").run(userID);
    }

    res.sendStatus(200);
});

//Gets all the views added up for one userID
//Useful to see how much one user has contributed
app.get('/api/getViewsForUser', function (req, res) {
    let userID = req.query.userID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    //up the view count by one
    db.prepare("SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ?").get(userID, function(err, row) {
        if (err) console.log(err);

        if (row.viewCount != null) {
            res.send({
                viewCount: row.viewCount
            });
        } else {
            res.sendStatus(404);
        }
    });
});

//Gets all the saved time added up (views * sponsor length) for one userID
//Useful to see how much one user has contributed
//In minutes
app.get('/api/getSavedTimeForUser', function (req, res) {
    let userID = req.query.userID;

    if (userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);

    //up the view count by one
    db.prepare("SELECT SUM((endTime - startTime) / 60 * views) as minutesSaved FROM sponsorTimes WHERE userID = ? AND votes > -1 AND shadowHidden != 1 ").get(userID, function(err, row) {
        if (err) console.log(err);

        if (row.minutesSaved != null) {
            res.send({
                timeSaved: row.minutesSaved
            });
        } else {
            res.sendStatus(404);
        }
    });
});

app.get('/api/getTopUsers', function (req, res) {
    let sortType = req.query.sortType;

    if (sortType == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //setup which sort type to use
    let sortBy = "";
    if (sortType == 0) {
        sortBy = "minutesSaved";
    } else if (sortType == 1) {
        sortBy = "viewCount";
    } else if (sortType == 2) {
        sortBy = "totalSubmissions";
    } else {
        //invalid request
        res.sendStatus(400);
        return;
    }

    let userNames = [];
    let viewCounts = [];
    let totalSubmissions = [];
    let minutesSaved = [];

    db.prepare("SELECT COUNT(*) as totalSubmissions, SUM(views) as viewCount," + 
                    "SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views) as minutesSaved, " +
                        "IFNULL(userNames.userName, sponsorTimes.userID) as userName FROM sponsorTimes LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID " +
                            "WHERE sponsorTimes.votes > -1 AND sponsorTimes.shadowHidden != 1 GROUP BY IFNULL(userName, sponsorTimes.userID) ORDER BY " + sortBy + " DESC LIMIT 100").all(function(err, rows) {
        for (let i = 0; i < rows.length; i++) {
            userNames[i] = rows[i].userName;

            viewCounts[i] = rows[i].viewCount;
            totalSubmissions[i] = rows[i].totalSubmissions;
            minutesSaved[i] = rows[i].minutesSaved;
        }

        //send this result
        res.send({
            userNames: userNames,
            viewCounts: viewCounts,
            totalSubmissions: totalSubmissions,
            minutesSaved: minutesSaved
        });
    });
});

//send out totals
//send the total submissions, total views and total minutes saved
app.get('/api/getTotalStats', function (req, res) {
    db.prepare("SELECT COUNT(DISTINCT userID) as userCount, COUNT(*) as totalSubmissions, SUM(views) as viewCount, SUM((endTime - startTime) / 60 * views) as minutesSaved FROM sponsorTimes WHERE shadowHidden != 1").get(function(err, row) {
        if (row != null) {
            //send this result
            res.send({
                userCount: row.userCount,
                viewCount: row.viewCount,
                totalSubmissions: row.totalSubmissions,
                minutesSaved: row.minutesSaved
            });
        }
    });
});

//send out a formatted time saved total
app.get('/api/getDaysSavedFormatted', function (req, res) {
    db.prepare("SELECT SUM((endTime - startTime) / 60 / 60 / 24 * views) as daysSaved FROM sponsorTimes").get(function(err, row) {
        if (row != null) {
            //send this result
            res.send({
                daysSaved: row.daysSaved.toFixed(2)
            });
        }
    });
});

app.get('/database.db', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db", { root: __dirname });
});

//returns true if the user is considered trustworthy
//this happens after a user has made 5 submissions and has less than 60% downvoted submissions
async function isUserTrustworthy(userID) {
    //check to see if this user how many submissions this user has submitted
    let totalSubmissionsResult = await new Promise((resolve, reject) => {
        db.prepare("SELECT count(*) as totalSubmissions, sum(votes) as voteSum FROM sponsorTimes WHERE userID = ?").get(userID, (err, row) => resolve({err, row}));
    });

    if (totalSubmissionsResult.row.totalSubmissions > 5) {
        //check if they have a high downvote ratio
        let downvotedSubmissionsResult = await new Promise((resolve, reject) => {
            db.prepare("SELECT count(*) as downvotedSubmissions FROM sponsorTimes WHERE userID = ? AND (votes < 0 OR shadowHidden > 0)").get(userID, (err, row) => resolve({err, row}));
        });
        
        return (downvotedSubmissionsResult.row.downvotedSubmissions / totalSubmissionsResult.row.totalSubmissions) < 0.6 || 
                (totalSubmissionsResult.row.voteSum > downvotedSubmissionsResult.row.downvotedSubmissions);
    }

    return true;
}

//This function will find sponsor times that are contained inside of eachother, called similar sponsor times
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Sponsor times with less than -1 votes are already ignored before this function is called
function getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs) {
    //list of sponsors that are contained inside eachother
    let similarSponsors = [];

    for (let i = 0; i < sponsorTimes.length; i++) {
        //see if the start time is located between the start and end time of the other sponsor time.
        for (let j = i + 1; j < sponsorTimes.length; j++) {
            if (sponsorTimes[j][0] >= sponsorTimes[i][0] && sponsorTimes[j][0] <= sponsorTimes[i][1]) {
                //sponsor j is contained in sponsor i
                similarSponsors.push([i, j]);
            }
        }
    }

    let similarSponsorsGroups = [];
    //once they have been added to a group, they don't need to be dealt with anymore
    let dealtWithSimilarSponsors = [];

    //create lists of all the similar groups (if 1 and 2 are similar, and 2 and 3 are similar, the group is 1, 2, 3)
    for (let i = 0; i < similarSponsors.length; i++) {
        if (dealtWithSimilarSponsors.includes(i)) {
            //dealt with already
            continue;
        }

        //this is the group of indexes that are similar
        let group = similarSponsors[i];
        for (let j = 0; j < similarSponsors.length; j++) {
            if (group.includes(similarSponsors[j][0]) || group.includes(similarSponsors[j][1])) {
                //this is a similar group
                group.push(similarSponsors[j][0]);
                group.push(similarSponsors[j][1]);
                dealtWithSimilarSponsors.push(j);
            }
        }
        similarSponsorsGroups.push(group);
    }

    //remove duplicate indexes in group arrays
    for (let i = 0; i < similarSponsorsGroups.length; i++) {
        uniqueArray = similarSponsorsGroups[i].filter(function(item, pos, self) {
            return self.indexOf(item) == pos;
        });

        similarSponsorsGroups[i] = uniqueArray;
    }

    let weightedRandomIndexes = getWeightedRandomChoiceForArray(similarSponsorsGroups, votes);

    let finalSponsorTimeIndexes = weightedRandomIndexes.finalChoices;
    //the sponsor times either chosen to be added to finalSponsorTimeIndexes or chosen not to be added
    let finalSponsorTimeIndexesDealtWith = weightedRandomIndexes.choicesDealtWith;

    let voteSums = weightedRandomIndexes.weightSums;
    //convert these into the votes
    for (let i = 0; i < finalSponsorTimeIndexes.length; i++) {
        //it should use the sum of votes, since anyone upvoting a similar sponsor is upvoting the existence of that sponsor.
        votes[finalSponsorTimeIndexes[i]] = voteSums[i];
    }

    //find the indexes never dealt with and add them
    for (let i = 0; i < sponsorTimes.length; i++) {
        if (!finalSponsorTimeIndexesDealtWith.includes(i)) {
            finalSponsorTimeIndexes.push(i)
        }
    }

    //if there are too many indexes, find the best 4
    if (finalSponsorTimeIndexes.length > 8) {
        finalSponsorTimeIndexes = getWeightedRandomChoice(finalSponsorTimeIndexes, votes, 8).finalChoices;
    }

    //convert this to a final array to return
    let finalSponsorTimes = [];
    for (let i = 0; i < finalSponsorTimeIndexes.length; i++) {
        finalSponsorTimes.push(sponsorTimes[finalSponsorTimeIndexes[i]]);
    }

    //convert this to a final array of UUIDs as well
    let finalUUIDs = [];
    for (let i = 0; i < finalSponsorTimeIndexes.length; i++) {
        finalUUIDs.push(UUIDs[finalSponsorTimeIndexes[i]]);
    }

    return {
        sponsorTimes: finalSponsorTimes,
        UUIDs: finalUUIDs
    };
}

//gets the getWeightedRandomChoice for each group in an array of groups
function getWeightedRandomChoiceForArray(choiceGroups, weights) {
    let finalChoices = [];
    //the indexes either chosen to be added to final indexes or chosen not to be added
    let choicesDealtWith = [];
    //for each choice group, what are the sums of the weights
    let weightSums = [];

    for (let i = 0; i < choiceGroups.length; i++) {
        //find weight sums for this group
        weightSums.push(0);
        for (let j = 0; j < choiceGroups[i].length; j++) {
            //only if it is a positive vote, otherwise it is probably just a sponsor time with slightly wrong time
            if (weights[choiceGroups[i][j]] > 0) {
                weightSums[weightSums.length - 1] += weights[choiceGroups[i][j]];
            }
        }

        //create a random choice for this group
        let randomChoice = getWeightedRandomChoice(choiceGroups[i], weights, 1)
        finalChoices.push(randomChoice.finalChoices);

        for (let j = 0; j < randomChoice.choicesDealtWith.length; j++) {
            choicesDealtWith.push(randomChoice.choicesDealtWith[j])
        }
    }

    return {
        finalChoices: finalChoices,
        choicesDealtWith: choicesDealtWith,
        weightSums: weightSums
    };
}

//gets a weighted random choice from the indexes array based on the weights.
//amountOfChoices speicifies the amount of choices to return, 1 or more.
//choices are unique
function getWeightedRandomChoice(choices, weights, amountOfChoices) {
    if (amountOfChoices > choices.length) {
        //not possible, since all choices must be unique
        return null;
    }

    let finalChoices = [];
    let choicesDealtWith = [];

    let sqrtWeightsList = [];
    //the total of all the weights run through the cutom sqrt function
    let totalSqrtWeights = 0;
    for (let j = 0; j < choices.length; j++) {
        //multiplying by 10 makes around 13 votes the point where it the votes start not mattering as much (10 + 3)
        //The 3 makes -2 the minimum votes before being ignored completely
        //https://www.desmos.com/calculator/ljftxolg9j
        //this can be changed if this system increases in popularity.
        let sqrtVote = Math.sqrt((weights[choices[j]] + 3) * 10);
        sqrtWeightsList.push(sqrtVote)
        totalSqrtWeights += sqrtVote;

        //this index has now been deat with
        choicesDealtWith.push(choices[j]);
    }

    //iterate and find amountOfChoices choices
    let randomNumber = Math.random();
    
    //this array will keep adding to this variable each time one sqrt vote has been dealt with
    //this is the sum of all the sqrtVotes under this index
    let currentVoteNumber = 0;
    for (let j = 0; j < sqrtWeightsList.length; j++) {
        if (randomNumber > currentVoteNumber / totalSqrtWeights && randomNumber < (currentVoteNumber + sqrtWeightsList[j]) / totalSqrtWeights) {
            //this one was randomly generated
            finalChoices.push(choices[j]);
            //remove that from original array, for next recursion pass if it happens
            choices.splice(j, 1);
            break;
        }

        //add on to the count
        currentVoteNumber += sqrtWeightsList[j];
    }
    
    //add on the other choices as well using recursion
    if (amountOfChoices > 1) {
        let otherChoices = getWeightedRandomChoice(choices, weights, amountOfChoices - 1).finalChoices;
        //add all these choices to the finalChoices array being returned
        for (let i = 0; i < otherChoices.length; i++) {
            finalChoices.push(otherChoices[i]);
        }
    }

    return {
        finalChoices: finalChoices,
        choicesDealtWith: choicesDealtWith
    };
}

function getHash(value, times=5000) {
    for (let i = 0; i < times; i++) {
        let hashCreator = crypto.createHash('sha256');
        value = hashCreator.update(value).digest('hex');
    }

    return value;
}

//converts time in seconds to minutes:seconds
function getFormattedTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let secondsDisplay = Math.round(seconds - minutes * 60);
    if (secondsDisplay < 10) {
        //add a zero
        secondsDisplay = "0" + secondsDisplay;
    }

    let formatted = minutes+ ":" + secondsDisplay;

    return formatted;
}
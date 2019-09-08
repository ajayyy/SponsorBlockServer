var express = require('express');
var fs = require('fs');
// Create a service (the app object is just a callback).
var app = express();

//hashing service
var crypto = require('crypto');

let config = JSON.parse(fs.readFileSync('config.json'));

// Default to production mode (for development mode set
// development mode set it to 'development')
// do not return full stacktrace to random people on internet
app.set('env', config.mode || 'production');

//load database
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(config.db);
//where the more sensitive data such as IP addresses are stored
var privateDB = new sqlite3.Database(config.privateDB);

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

// Parse JSON body
app.use(express.json())

//add the get function
app.get('/api/getVideoSponsorTimes', function (req, res) {
    // This parameter instructs function to return only "sponsor" type
    req.query.sponsorsOnly = true
    getVideoSegmentTimes(req, res)
});

app.get('/api/videoSegmentTimes', getVideoSegmentTimes);

function getIP(req) {
    return behindProxy ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
}

//add the legacy post function
app.get('/api/postVideoSponsorTimes', function (req, res) {
    const reqObject = {
        userID: req.query.userID,
        videoID: req.query.videoID,
        segments: [{
            startTime: parseFloat(req.query.startTime),
            endTime: parseFloat(req.query.endTime),
            type: 'sponsor'
        }]
    }

    postVideoSegmentTimes({ body: reqObject }, res);
});

app.post('/api/videoSegmentTimes', postVideoSegmentTimes);

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
    userID = getHash(userID + UUID);

    //x-forwarded-for if this server is behind a proxy
    let ip = getIP(req);

    //hash the ip 5000 times so no one can get it from the database
    let hashedIP = getHash(ip + globalSalt);

    //check if vote has already happened
    privateDB.prepare("SELECT type FROM votes WHERE userID = ? AND UUID = ?").get(userID, UUID, function(err, votesRow) {
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
            }
        }

        //check if the increment amount should be multiplied (downvotes have more power if there have been many views)
        db.prepare("SELECT votes, views FROM sponsorTimes WHERE UUID = ?").get(UUID, function(err, row) {
            if (row != null && (row.votes > 3 || row.views > 4) && incrementAmount < 0) {
                //multiply the power of this downvote
                incrementAmount *= 4;
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
app.get('/api/shadowBanUser', async function (req, res) {
    let userID = req.query.userID;
    let shadowUserID = req.query.shadowUserID;

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

    if (userID == undefined || shadowUserID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userIDs
    userID = getHash(userID);

    if (userID !== adminUserID) {
        //not authorized
        res.sendStatus(403);
        return;
    }

    //check to see if this user is already shadowbanned
    let result = await new Promise((resolve, reject) => {
        privateDB.prepare("SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?").get(shadowUserID, (err, row) => resolve({err, row}));
    });

    if (enabled && result.row.userCount == 0) {
        //add them to the shadow ban list

        //add it to the table
        privateDB.prepare("INSERT INTO shadowBannedUsers VALUES(?)").run(shadowUserID);

        //find all previous submissions and hide them
        db.prepare("UPDATE sponsorTimes SET shadowHidden = 1 WHERE userID = ?").run(shadowUserID);
    } else if (!enabled && result.row.userCount > 0) {
        //remove them from the shadow ban list
        privateDB.prepare("DELETE FROM shadowBannedUsers WHERE userID = ?").run(shadowUserID);

        //find all previous submissions and unhide them
        if (unHideOldSubmissions) {
            db.prepare("UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?").run(shadowUserID);
        }
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

    db.prepare("SELECT sponsorTimes.userID as userID, COUNT(*) as totalSubmissions, SUM(views) as viewCount, SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views) as minutesSaved, userNames.userName as userName FROM sponsorTimes LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID WHERE sponsorTimes.votes > -1 GROUP BY sponsorTimes.userID ORDER BY " + sortBy + " DESC LIMIT 100").all(function(err, rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].userName != null) {
                userNames[i] = rows[i].userName;
            } else {
                userNames[i] = rows[i].userID;
            }

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
    db.prepare("SELECT COUNT(DISTINCT userID) as userCount, COUNT(*) as totalSubmissions, SUM(views) as viewCount, SUM((endTime - startTime) / 60 * views) as minutesSaved FROM sponsorTimes").get(function(err, row) {
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

// Start the server only AFTER all endpoints are regstered.
app.listen(config.port, function () {
    console.info(`Server is running on port ${config.port}`);
});

function getVideoSegmentTimes (req, res) {
    // This is a parameter automatically added for
    // the old API.
    let sponsorsOnly = req.query.sponsorsOnly

    let videoID = req.query.videoID;

    let sponsorTimes = [];
    let votes = []
    let UUIDs = [];
    let types = [];

    let hashedIP = getHash(getIP(req) + globalSalt);

    db.prepare("SELECT type, startTime, endTime, votes, UUID, shadowHidden FROM sponsorTimes WHERE videoID = ? "
      + (sponsorsOnly ? " AND type = 'sponsor' " : "")
      + "ORDER BY startTime").all(videoID, async function(err, rows) {
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
            types[index] = rows[i].type;
        }

        if (sponsorTimes.length == 0) {
            res.sendStatus(404);
            return;
        }

        organisedData = getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs, types);
        sponsorTimes = organisedData.sponsorTimes;
        UUIDs = organisedData.UUIDs;
        types = organisedData.types;

        if (sponsorTimes.length == 0) {
            res.sendStatus(404);
        } else {
            //send result
            res.send({
                sponsorTimes: sponsorTimes,
                UUIDs: UUIDs,
                types: types
            });
        }
    });
}

/*
 * Checks all segments for validity
 */
function checkIfValidSegmentTimes (segments) {
    const validTypes = [null, undefined, "intro", "sponsor", "merch", "social", "buttons", "patreon"]
    
    for (const segment of segments) {
        if (typeof segment.startTime !== 'number' ||
            typeof segment.endTime !== 'number' ||
            segment.endTime - segment.startTime < 0.2 ||
            !validTypes.includes(segment.type)) {
            return false
        }
    }

    return true
}

//the ID of each sponsor can be a hash of it's contents
function createUUIDHash(videoID, userID, segment) {
    //this can just be a hash of the data
    //it's better than generating an actual UUID like what was used before
    //also better for duplication checking
    let startTime = segment.startTime;
    let endTime = segment.endTime;
    let hashCreator = crypto.createHash('sha256');
    let UUID = hashCreator.update(videoID + startTime + endTime + userID).digest('hex');
    return UUID
}

function insertSegmentRecords(userID, videoID, timeSubmitted, hashedIP, segments, shadowBanned, callback) {
    //this is used to know when to call the callback
    let barrier = {
        total: segments.length,
        done: 0
    }

    for (let segment of segments) {
        db.prepare("SELECT UUID FROM sponsorTimes WHERE startTime = ? and endTime = ? and videoID = ?").get([segment.startTime, segment.endTime, videoID], function(err, row) {
            if (err) console.log(err);
            if (row == null) {
                let UUID = createUUIDHash(videoID, userID, segment)
                //not a duplicate, execute query
                db.prepare("INSERT INTO sponsorTimes(videoID, type, startTime, endTime, votes, UUID, userID, timeSubmitted, views, shadowHidden) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(videoID, segment.type, segment.startTime, segment.endTime, 0, UUID, userID, timeSubmitted, 0, shadowBanned);

                //add to private db as well
                privateDB.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?)").run(videoID, hashedIP, timeSubmitted);
            }

            barrier.done++;

            if (barrier.done >= barrier.total) {
                callback()
            }
        });
    }
}

function postVideoSegmentTimes(req, res) {
    const videoID = req.body.videoID
    let userID = req.body.userID
    const segments = req.body.segments

    //check if all correct inputs are here
    if (typeof videoID !== 'string' || !Array.isArray(segments) || 
            checkIfValidSegmentTimes(segments) !== true || typeof userID !== 'string') {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //hash the userID
    userID = getHash(userID);
    
    //hash the ip 5000 times so no one can get it from the database
    let hashedIP = getHash(getIP(req) + globalSalt);

    //get current time
    let timeSubmitted = Date.now();

    let yesterday = timeSubmitted - 86400000;

    //check to see if this ip has submitted too many sponsors today
    privateDB.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE hashedIP = ? AND videoID = ? AND timeSubmitted > ?").get([hashedIP, videoID, yesterday], function(err, row) {
        if (row.count + segments.length > 10) {
            //too many sponsors for the same video from the same ip address
            res.sendStatus(429);
        } else {
            //check to see if the user has already submitted sponsors for this video
            db.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE userID = ? and videoID = ?").get([userID, videoID], function(err, row) {
                if (row.count + segments.length > 8) {
                    //too many sponsors for the same video from the same user
                    res.sendStatus(429);
                } else {
                    //check to see if this user is shadowbanned
                    privateDB.prepare("SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?").get([userID], function (err, row) {
                        let shadowBanned = row.userCount > 0;

                        insertSegmentRecords(userID, videoID, timeSubmitted, hashedIP, segments, shadowBanned, function () {
                            res.sendStatus(200);
			            });
                    });
                }
            });
        }
    });
}

//This function will find sponsor times that are contained inside of eachother, called similar sponsor times
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Sponsor times with less than -1 votes are already ignored before this function is called
function getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs, types) {
    //list of sponsors that are contained inside eachother
    let similarSponsors = [];

    for (let i = 0; i < sponsorTimes.length; i++) {
        //see if the start time is located between the start and end time of the other sponsor time.
        for (let j = 0; j < sponsorTimes.length; j++) {
            if (sponsorTimes[j][0] > sponsorTimes[i][0] && sponsorTimes[j][0] < sponsorTimes[i][1]) {
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
    for (let i = 0; i < voteSums.length; i++) {
        if (voteSums[i] != undefined) {
            //it should use the sum of votes, since anyone upvoting a similar sponsor is upvoting the existence of that sponsor.
            votes[finalSponsorTimeIndexes[i]] = voteSums;
        }
    }

    //find the indexes never dealt with and add them
    for (let i = 0; i < sponsorTimes.length; i++) {
        if (!finalSponsorTimeIndexesDealtWith.includes(i)) {
            finalSponsorTimeIndexes.push(i)
        }
    }

    //if there are too many indexes, find the best 4
    if (finalSponsorTimeIndexes.length > 4) {
        finalSponsorTimeIndexes = getWeightedRandomChoice(finalSponsorTimeIndexes, votes, 4).finalChoices;
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

    let finalTypes = [];
    for (let i = 0; i < finalSponsorTimeIndexes.length; i++) {
        finalTypes.push(types[finalSponsorTimeIndexes[i]]);
    }

    return {
        sponsorTimes: finalSponsorTimes,
        UUIDs: finalUUIDs,
        types: finalTypes
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
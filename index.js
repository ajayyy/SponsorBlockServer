var express = require('express');
var http = require('http');

// Create a service (the app object is just a callback).
var app = express();

//uuid service
var uuidv1 = require('uuid/v1');

//hashing service
var crypto = require('crypto');

//load database
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./databases/sponsorTimes.db');

// Create an HTTP service.
http.createServer(app).listen(80);

//global salt that is added to every ip before hashing to
//  make it even harder for someone to decode the ip
var globalSalt = "49cb0d52-1aec-4b89-85fc-fab2c53062fb";

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

    db.prepare("SELECT startTime, endTime, votes, UUID FROM sponsorTimes WHERE videoID = ?").all(videoID, function(err, rows) {
        if (err) console.log(err);

        for (let i = 0; i < rows.length; i++) {
            //check if votes are above -2
            if (rows[i].votes < -2) {
                //too untrustworthy, just ignore it
                continue;
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

//add the post function
app.get('/api/postVideoSponsorTimes', function (req, res) {
    let videoID = req.query.videoID;
    let startTime = req.query.startTime;
    let endTime = req.query.endTime;
    let userID = req.query.userID;

    if (videoID == undefined || startTime == undefined || endTime == undefined || userID == undefined) {
        //invalid request
        res.sendStatus(400);
        return;
    }

    //x-forwarded-for if this server is behind a proxy
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    //hash the ip so no one can get it from the database
    let hashCreator = crypto.createHash('sha256');
    let hashedIP = hashCreator.update(ip + globalSalt).digest('hex');

    startTime = parseFloat(startTime);
    endTime = parseFloat(endTime);

    let UUID = uuidv1();

    //get current time
    let timeSubmitted = Date.now();

    //check to see if the user has already submitted sponsors for this video
    db.prepare("SELECT UUID FROM sponsorTimes WHERE userID = ? and videoID = ?").all([userID, videoID], function(err, rows) {
        if (rows.length >= 4) {
            //too many sponsors for the same video from the same user
            res.sendStatus(429);
        } else {
            //check if this info has already been submitted first
            db.prepare("SELECT UUID FROM sponsorTimes WHERE startTime = ? and endTime = ? and videoID = ?").get([startTime, endTime, videoID], function(err, row) {
                if (err) console.log(err);
                
                if (row == null) {
                    //not a duplicate, execute query
                    db.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?, ?, ?, ?, ?, ?)").run(videoID, startTime, endTime, 0, UUID, userID, hashedIP, timeSubmitted);

                    res.sendStatus(200);
                } else {
                    res.sendStatus(409);
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

    //check if vote has already happened
    db.prepare("SELECT type FROM votes WHERE userID = ? AND UUID = ?").get(userID, UUID, function(err, row) {
        if (err) console.log(err);
                
        if (row != undefined && row.type == type) {
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
        if (row != undefined) {
            if (row.type == 1) {
                //upvote
                oldIncrementAmount = 1;
            } else if (row.type == 0) {
                //downvote
                oldIncrementAmount = -1;
            }
        }

        //update the votes table
        if (row != undefined) {
            db.prepare("UPDATE votes SET type = ? WHERE userID = ? AND UUID = ?").run(type, userID, UUID);
        } else {
            db.prepare("INSERT INTO votes VALUES(?, ?, ?)").run(userID, UUID, type);
        }

        //update the vote count on this sponsorTime
        //oldIncrementAmount will be zero is row is null
        db.prepare("UPDATE sponsorTimes SET votes = votes + ? WHERE UUID = ?").run(incrementAmount - oldIncrementAmount, UUID);

        //update the votes table

        //added to db
        res.sendStatus(200);
    });
});

app.get('/database.db', function (req, res) {
    res.sendFile("./databases/sponsorTimes.db", { root: __dirname });
});


//This function will find sponsor times that are contained inside of eachother, called similar sponsor times
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Sponsor times with less than -2 votes are already ignored before this function is called
function getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs) {
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
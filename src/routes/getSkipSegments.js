var config = require('../config.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;

var logger = require('../utils/logger.js');
var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');

function cleanGetSegments(req, videoID, categories) {
    let userHashedIP, shadowHiddenSegments;

    let segments = [];

    try {
        for (const category of categories) {
            const categorySegments = db
                .prepare(
                    'all',
                    'SELECT startTime, endTime, votes, UUID, shadowHidden FROM sponsorTimes WHERE videoID = ? and category = ? ORDER BY startTime',
                    [videoID, category]
                )
                .filter(segment => {
                    if (segment.votes < -1) {
                        return false; //too untrustworthy, just ignore it
                    }

                    //check if shadowHidden
                    //this means it is hidden to everyone but the original ip that submitted it
                    if (segment.shadowHidden != 1) {
                        return true;
                    }

                    if (shadowHiddenSegments === undefined) {
                        shadowHiddenSegments = privateDB.prepare('all', 'SELECT hashedIP FROM sponsorTimes WHERE videoID = ?', [videoID]);
                    }

                    //if this isn't their ip, don't send it to them
                    return shadowHiddenSegments.some(shadowHiddenSegment => {
                        if (userHashedIP === undefined) {
                            //hash the IP only if it's strictly necessary
                            userHashedIP = getHash(getIP(req) + config.globalSalt);
                        }
                        return shadowHiddenSegment.hashedIP === userHashedIP;
                    });
                });

            chooseSegments(categorySegments).forEach(chosenSegment => {
                segments.push({
                    category,
                    segment: [chosenSegment.startTime, chosenSegment.endTime],
                    UUID: chosenSegment.UUID,
                });
            });
        }

        return segments;
    } catch (err) {
        if (err) {
            logger.error(err);
            return null;
        }
    }
}

//gets a weighted random choice from the choices array based on their `votes` property.
//amountOfChoices specifies the maximum amount of choices to return, 1 or more.
//choices are unique
function getWeightedRandomChoice(choices, amountOfChoices) {
    //trivial case: no need to go through the whole process
    if (amountOfChoices >= choices.length) {
        return choices;
    }

    //assign a weight to each choice
    let totalWeight = 0;
    choices = choices.map(choice => {
        //The 3 makes -2 the minimum votes before being ignored completely
        //https://www.desmos.com/calculator/c1duhfrmts
        //this can be changed if this system increases in popularity.
        const weight = Math.exp((choice.votes + 3), 0.85);
        totalWeight += weight;

        return { ...choice, weight };
    });

    //iterate and find amountOfChoices choices
    const chosen = [];
    while (amountOfChoices-- > 0) {
        //weighted random draw of one element of choices
        const randomNumber = Math.random() * totalWeight;
        let stackWeight = choices[0].weight;
        let i = 0;
        while (stackWeight < randomNumber) {
            stackWeight += choices[++i].weight;
        }

        //add it to the chosen ones and remove it from the choices before the next iteration
        chosen.push(choices[i]);
        totalWeight -= choices[i].weight;
        choices.splice(i, 1);
    }

    return chosen;
}

//This function will find segments that are contained inside of eachother, called similar segments
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Segments with less than -1 votes are already ignored before this function is called
function chooseSegments(segments) {
    //Create groups of segments that are similar to eachother
    //Segments must be sorted by their startTime so that we can build groups chronologically:
    //1. As long as the segments' startTime fall inside the currentGroup, we keep adding them to that group
    //2. If a segment starts after the end of the currentGroup (> cursor), no other segment will ever fall
    //   inside that group (because they're sorted) so we can create a new one
    const similarSegmentsGroups = [];
    let currentGroup;
    let cursor = -1; //-1 to make sure that, even if the 1st segment starts at 0, a new group is created
    segments.forEach(segment => {
        if (segment.startTime > cursor) {
            currentGroup = { segments: [], votes: 0 };
            similarSegmentsGroups.push(currentGroup);
        }

        currentGroup.segments.push(segment);
        //only if it is a positive vote, otherwise it is probably just a sponsor time with slightly wrong time
        if (segment.votes > 0) {
            currentGroup.votes += segment.votes;
        }

        cursor = Math.max(cursor, segment.endTime);
    });

    //if there are too many groups, find the best 8
    return getWeightedRandomChoice(similarSegmentsGroups, 8).map(
        //randomly choose 1 good segment per group and return them
        group => getWeightedRandomChoice(group.segments, 1)[0]
    );
}

/**
 *
 * Returns what would be sent to the client.
 * Will respond with errors if required. Returns false if it errors.
 *
 * @param req
 * @param res
 *
 * @returns
 */
function handleGetSegments(req, res) {
    const videoID = req.query.videoID;
    // Default to sponsor
    // If using params instead of JSON, only one category can be pulled
    const categories = req.query.categories
        ? JSON.parse(req.query.categories)
        : req.query.category
        ? [req.query.category]
        : ['sponsor'];

    let segments = cleanGetSegments(req, videoID, categories);

    if (segments === null || segments === undefined) {
        res.sendStatus(500);
        return false;
    }

    if (segments.length == 0) {
        res.sendStatus(404);
        return false;
    }

    return segments;
}

module.exports = {
    handleGetSegments,
    cleanGetSegments,
    endpoint: function (req, res) {
        let segments = handleGetSegments(req, res);

        if (segments) {
            //send result
            res.send(segments);
        }
    },
};

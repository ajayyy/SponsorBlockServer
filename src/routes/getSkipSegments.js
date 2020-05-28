var fs = require('fs');
var config = require('../config.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;

var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');


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


//This function will find sponsor times that are contained inside of eachother, called similar sponsor times
//Only one similar time will be returned, randomly generated based on the sqrt of votes.
//This allows new less voted items to still sometimes appear to give them a chance at getting votes.
//Sponsor times with less than -1 votes are already ignored before this function is called
function getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs) {
  //create groups of sponsor times that are similar to eachother
  const groups = [];
  sponsorTimes.forEach(([startTime, endTime], i) => {
      //find a group that overlaps with the current segment
      //sponsorTimes are sorted by their startTime so there should never be more than 1 similar group
      const similarGroup = groups.find(group => group.start < endTime && startTime < group.end);
      
      //add the sponsor to that group or create a new group if there aren't any
      if (similarGroup === undefined) {
          groups.push({ start: startTime, end: endTime, sponsors: [i] });
      } else {
          similarGroup.sponsors.push(i)
          similarGroup.start = Math.min(similarGroup.start, startTime);
          similarGroup.end = Math.max(similarGroup.end, endTime);
      }
  })

  //once all the groups have been created, get rid of the metadata and remove single-sponsor groups
  const similarSponsorsGroups = groups.map(group => group.sponsors).filter(group => group.length > 1);

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

/**
 * 
 * Returns what would be sent to the client.
 * Will resond with errors if required. Returns false if it errors.
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
    const categories = req.query.categories ? JSON.parse(req.query.categories) 
        : (req.query.category ? [req.query.category] : ["sponsor"]);

    /**
     * @type {Array<{
     *                 segment: number[], 
     *                 category: string, 
     *                 UUID: string
     *              }>
     *       }
     */
    let segments = [];

    let hashedIP = getHash(getIP(req) + config.globalSalt);

    try {
        for (const category of categories) {
            let rows = db.prepare("SELECT startTime, endTime, votes, UUID, shadowHidden FROM sponsorTimes WHERE videoID = ? and category = ? ORDER BY startTime")
                .all(videoID, category);

            let sponsorTimes = [];
            let votes = []
            let UUIDs = [];
    
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
                    let hashedIPRow = privateDB.prepare("SELECT hashedIP FROM sponsorTimes WHERE videoID = ?").all(videoID);
    
                    if (!hashedIPRow.some((e) => e.hashedIP === hashedIP)) {
                        //this isn't their ip, don't send it to them
                        continue;
                    }
                }
    
                sponsorTimes.push([rows[i].startTime, rows[i].endTime]);
                votes.push(rows[i].votes);
                UUIDs.push(rows[i].UUID);
            }
    
            organisedData = getVoteOrganisedSponsorTimes(sponsorTimes, votes, UUIDs);
            sponsorTimes = organisedData.sponsorTimes;
            UUIDs = organisedData.UUIDs;
    
            for (let i = 0; i < sponsorTimes.length; i++) {
                segments.push({
                    segment: sponsorTimes[i],
                    category: category,
                    UUID: UUIDs[i]
                });
            }
        }
    } catch(error) {
        console.error(error);
        res.send(500);

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
    endpoint: function (req, res) {
        let segments = handleGetSegments(req, res);

        if (segments) {
            //send result
            res.send(segments)
        }
    }
}
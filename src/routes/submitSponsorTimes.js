var config = require('../config.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;
var YouTubeAPI = require('../utils/youtubeAPI.js');

var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');
var getFormattedTime = require('../utils/getFormattedTime.js');

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

module.exports = async function submitSponsorTimes(req, res) {
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
  let hashedIP = getHash(getIP(req) + config.globalSalt);

  startTime = parseFloat(startTime);
  endTime = parseFloat(endTime);

  if (isNaN(startTime) || isNaN(endTime)) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  if (startTime === Infinity || endTime === Infinity) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  if (startTime > endTime) {
      //time can't go backwards
      res.sendStatus(400);
      return;
  }

  try {
      //check if this user is on the vip list
      let vipRow = db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(userID);

      //this can just be a hash of the data
      //it's better than generating an actual UUID like what was used before
      //also better for duplication checking
      let UUID = getHash(videoID + startTime + endTime + userID, 1);

      //get current time
      let timeSubmitted = Date.now();

      let yesterday = timeSubmitted - 86400000;

      //check to see if this ip has submitted too many sponsors today
      let rateLimitCheckRow = privateDB.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE hashedIP = ? AND videoID = ? AND timeSubmitted > ?").get([hashedIP, videoID, yesterday]);
      
      if (rateLimitCheckRow.count >= 10) {
          //too many sponsors for the same video from the same ip address
          res.sendStatus(429);
      } else {
          //check to see if the user has already submitted sponsors for this video
          let duplicateCheckRow = db.prepare("SELECT COUNT(*) as count FROM sponsorTimes WHERE userID = ? and videoID = ?").get([userID, videoID]);
          
          if (duplicateCheckRow.count >= 8) {
              //too many sponsors for the same video from the same user
              res.sendStatus(429);
          } else {
              //check if this info has already been submitted first
              let duplicateCheck2Row = db.prepare("SELECT UUID FROM sponsorTimes WHERE startTime = ? and endTime = ? and videoID = ?").get([startTime, endTime, videoID]);

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

              if (duplicateCheck2Row == null) {
                  //not a duplicate, execute query
                  try {
                      db.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)").run(videoID, startTime, endTime, startingVotes, UUID, userID, timeSubmitted, 0, shadowBanned);
                  
                      //add to private db as well
                      privateDB.prepare("INSERT INTO sponsorTimes VALUES(?, ?, ?)").run(videoID, hashedIP, timeSubmitted);

                      res.sendStatus(200);
                  } catch (err) {
                      //a DB change probably occurred
                      res.sendStatus(502);
                      console.log("Error when putting sponsorTime in the DB: " + videoID + ", " + startTime + ", " + "endTime" + ", " + userID);
                      
                      return;
                  }
              } else {
                  res.sendStatus(409);
              }

              //check if they are a first time user
              //if so, send a notification to discord
              if (config.youtubeAPIKey !== null && config.discordFirstTimeSubmissionsWebhookURL !== null && duplicateCheck2Row == null) {
                  let userSubmissionCountRow = db.prepare("SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?").get(userID);

                  // If it is a first time submission
                  if (userSubmissionCountRow.submissionCount === 0) {
                      YouTubeAPI.videos.list({
                          part: "snippet",
                          id: videoID
                      }, function (err, data) {
                          if (err || data.items.length === 0) {
                              err && console.log(err);
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
      }
  } catch (err) {
      console.error(err);

      res.send(500);
  }
}

var fs = require('fs');
var config = require('../config.js');

var getHash = require('../utils/getHash.js');
var getIP = require('../utils/getIP.js');
var getFormattedTime = require('../utils/getFormattedTime.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;
var YouTubeAPI = require('../utils/youtubeAPI.js');
var request = require('request');

module.exports = async function voteOnSponsorTime(req, res) {
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
  let hashedIP = getHash(ip + config.globalSalt);

  try {
      //check if vote has already happened
      let votesRow = privateDB.prepare("SELECT type FROM votes WHERE userID = ? AND UUID = ?").get(userID, UUID);
      
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
      let vipRow = db.prepare("SELECT count(*) as userCount FROM vipUsers WHERE userID = ?").get(nonAnonUserID);

      //check if the increment amount should be multiplied (downvotes have more power if there have been many views)
      let row = db.prepare("SELECT votes, views FROM sponsorTimes WHERE UUID = ?").get(UUID);
      
      if (vipRow.userCount != 0 && incrementAmount < 0) {
          //this user is a vip and a downvote
          incrementAmount = - (row.votes + 2 - oldIncrementAmount);
          type = incrementAmount;
      } else if (row !== undefined && (row.votes > 8 || row.views > 15) && incrementAmount < 0) {
          //increase the power of this downvote
          incrementAmount = -Math.abs(Math.min(10, row.votes + 2 - oldIncrementAmount));
          type = incrementAmount;
      }

      // Send discord message
      if (type != 1) {
          // Get video ID
          let submissionInfoRow = db.prepare("SELECT s.videoID, s.userID, s.startTime, s.endTime, u.userName, "+
            "(select count(1) from sponsorTimes where userID = s.userID) count, "+
            "(select count(1) from sponsorTimes where userID = s.userID and votes <= -2) disregarded "+
            "FROM sponsorTimes s inner join userNames u on s.userID = u.userID where s.UUID=?"
          ).get(UUID);

          let userSubmissionCountRow = db.prepare("SELECT count(*) as submissionCount FROM sponsorTimes WHERE userID = ?").get(nonAnonUserID);

          if (config.youtubeAPIKey !== null && config.discordReportChannelWebhookURL !== null) {
              YouTubeAPI.videos.list({
                  part: "snippet",
                  id: submissionInfoRow.videoID
              }, function (err, data) {
                  if (err || data.items.length === 0) {
                      err && console.log(err);
                      return;
                  }
                  
                  request.post(config.discordReportChannelWebhookURL, {
                      json: {
                          "embeds": [{
                              "title": data.items[0].snippet.title,
                              "url": "https://www.youtube.com/watch?v=" + submissionInfoRow.videoID 
                                  + "&t=" + (submissionInfoRow.startTime.toFixed(0) - 2),
                              "description": "**" + row.votes + " Votes Prior | " + (row.votes + incrementAmount - oldIncrementAmount) + " Votes Now | " + row.views 
                                  + " Views**\n\n**Submission ID:** " + UUID 
                                  + "\n\n**Submitted by:** "+submissionInfoRow.userName+"\n " + submissionInfoRow.userID 
                                  + "\n\n**Total User Submissions:** "+submissionInfoRow.count
                                  + "\n**Ignored User Submissions:** "+submissionInfoRow.disregarded
                                  +"\n\n**Timestamp:** " + 
                                      getFormattedTime(submissionInfoRow.startTime) + " to " + getFormattedTime(submissionInfoRow.endTime),
                              "color": 10813440,
                              "author": {
                                  "name": userSubmissionCountRow.submissionCount === 0 ? "Report by New User" : (vipRow.userCount !== 0 ? "Report by VIP User" : "")
                              },
                              "thumbnail": {
                                  "url": data.items[0].snippet.thumbnails.maxres ? data.items[0].snippet.thumbnails.maxres.url : "",
                              }
                          }]
                      }
                    }, (err, res) => {
                        if (err) {
                            console.log("Failed to send reported submission Discord hook.");
                            console.log(JSON.stringify(err));
                            console.log("\n");
                        } else if (res && res.statusCode >= 400) {
                            console.log("Error sending reported submission Discord hook");
                            console.log(JSON.stringify(res));
                            console.log("\n");
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
          let submissionUserID = db.prepare("SELECT userID FROM sponsorTimes WHERE UUID = ?").get(UUID).userID;

          //check if any submissions are hidden
          let hiddenSubmissionsRow = db.prepare("SELECT count(*) as hiddenSubmissions FROM sponsorTimes WHERE userID = ? AND shadowHidden > 0").get(submissionUserID);

          if (hiddenSubmissionsRow.hiddenSubmissions > 0) {
              //see if some of this users submissions should be visible again
              
              if (await isUserTrustworthy(submissionUserID)) {
                  //they are trustworthy again, show 2 of their submissions again, if there are two to show
                  db.prepare("UPDATE sponsorTimes SET shadowHidden = 0 WHERE ROWID IN (SELECT ROWID FROM sponsorTimes WHERE userID = ? AND shadowHidden = 1 LIMIT 2)").run(submissionUserID)
              }
          }
      }

      //added to db
      res.sendStatus(200);
  } catch (err) {
      console.error(err);
      res.status(500).json({error: 'Internal error creating segment vote'});
  }
}
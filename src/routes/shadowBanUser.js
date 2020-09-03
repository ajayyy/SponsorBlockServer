var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;

var getHash = require('../utils/getHash.js');

module.exports = async function shadowBanUser(req, res) {
  let userID = req.query.userID;
  let hashedIP = req.query.hashedIP;
  let adminUserIDInput = req.query.adminUserID;

  let enabled = req.query.enabled;
  if (enabled === undefined){
      enabled = true;
  } else {
      enabled = enabled === "true";
  }

  //if enabled is false and the old submissions should be made visible again
  let unHideOldSubmissions = req.query.unHideOldSubmissions !== "false";

  if (adminUserIDInput == undefined || (userID == undefined && hashedIP == undefined)) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  //hash the userID
  adminUserIDInput = getHash(adminUserIDInput);

  let isVIP = db.prepare("get", "SELECT count(*) as userCount FROM vipUsers WHERE userID = ?", [adminUserIDInput]).userCount > 0;
  if (!isVIP) {
      //not authorized
      res.sendStatus(403);
      return;
  }

  if (userID) {
    //check to see if this user is already shadowbanned
    let row = privateDB.prepare('get', "SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?", [userID]);

    if (enabled && row.userCount == 0) {
        //add them to the shadow ban list

        //add it to the table
        privateDB.prepare('run', "INSERT INTO shadowBannedUsers VALUES(?)", [userID]);

        //find all previous submissions and hide them
        if (unHideOldSubmissions) {
        db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 1 WHERE userID = ?", [userID]);
        }
    } else if (!enabled && row.userCount > 0) {
        //remove them from the shadow ban list
        privateDB.prepare('run', "DELETE FROM shadowBannedUsers WHERE userID = ?", [userID]);

        //find all previous submissions and unhide them
        if (unHideOldSubmissions) {
            db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?", [userID]);
        }
    }
  } else if (hashedIP) {
    //check to see if this user is already shadowbanned
    // let row = privateDB.prepare('get', "SELECT count(*) as userCount FROM shadowBannedIPs WHERE hashedIP = ?", [hashedIP]);

    // if (enabled && row.userCount == 0) {
    if (enabled) {
        //add them to the shadow ban list

        //add it to the table
        // privateDB.prepare('run', "INSERT INTO shadowBannedIPs VALUES(?)", [hashedIP]);

        

        //find all previous submissions and hide them
        if (unHideOldSubmissions) {
            db.prepare('run',  "UPDATE sponsorTimes SET shadowHidden = 1 WHERE timeSubmitted IN " +
                "(SELECT privateDB.timeSubmitted FROM sponsorTimes LEFT JOIN privateDB.sponsorTimes as privateDB ON sponsorTimes.timeSubmitted=privateDB.timeSubmitted " +
                "WHERE privateDB.hashedIP = ?)", [hashedIP]);
        }
    } else if (!enabled && row.userCount > 0) {
        // //remove them from the shadow ban list
        // privateDB.prepare('run', "DELETE FROM shadowBannedUsers WHERE userID = ?", [userID]);

        // //find all previous submissions and unhide them
        // if (unHideOldSubmissions) {
        //     db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?", [userID]);
        // }
    }
  }

  res.sendStatus(200);
}
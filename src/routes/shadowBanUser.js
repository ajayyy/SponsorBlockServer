var config = require('../config.js');

var databases = require('../databases/databases.js');
var db = databases.db;
var privateDB = databases.privateDB;

var getHash = require('../utils/getHash.js');

module.exports = async function shadowBanUser(req, res) {
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

  if (adminUserIDInput !== config.adminUserID) {
      //not authorized
      res.sendStatus(403);
      return;
  }

  //check to see if this user is already shadowbanned
  let row = privateDB.prepare('get', "SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?", [userID]);

  if (enabled && row.userCount == 0) {
      //add them to the shadow ban list

      //add it to the table
      privateDB.prepare('run', "INSERT INTO shadowBannedUsers VALUES(?)", [userID]);

      //find all previous submissions and hide them
      db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 1 WHERE userID = ?", [userID]);
  } else if (!enabled && row.userCount > 0) {
      //remove them from the shadow ban list
      privateDB.prepare('run', "DELETE FROM shadowBannedUsers WHERE userID = ?", [userID]);

      //find all previous submissions and unhide them
      if (unHideOldSubmissions) {
          db.prepare('run', "UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?", [userID]);
      }
  }

  res.sendStatus(200);
}
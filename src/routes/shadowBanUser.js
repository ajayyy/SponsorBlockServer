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
  let row = privateDB.prepare("SELECT count(*) as userCount FROM shadowBannedUsers WHERE userID = ?").get(userID);

  if (enabled && row.userCount == 0) {
      //add them to the shadow ban list

      //add it to the table
      privateDB.prepare("INSERT INTO shadowBannedUsers VALUES(?)").run(userID);

      //find all previous submissions and hide them
      db.prepare("UPDATE sponsorTimes SET shadowHidden = 1 WHERE userID = ?").run(userID);
  } else if (!enabled && row.userCount > 0) {
      //remove them from the shadow ban list
      privateDB.prepare("DELETE FROM shadowBannedUsers WHERE userID = ?").run(userID);

      //find all previous submissions and unhide them
      if (unHideOldSubmissions) {
          db.prepare("UPDATE sponsorTimes SET shadowHidden = 0 WHERE userID = ?").run(userID);
      }
  }

  res.sendStatus(200);
}
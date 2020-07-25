
var config = require('../config.js');

var db = require('../databases/databases.js').db;
var getHash = require('../utils/getHash.js');


module.exports = function setUsername(req, res) {
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

      if (adminUserIDInput != config.adminUserID) {
          //they aren't the admin
          res.sendStatus(403);
          return;
      }
  } else {
      //hash the userID
      userID = getHash(userID);
  }

  try {
      //check if username is already set
      let row = db.prepare('get', "SELECT count(*) as count FROM userNames WHERE userID = ?", [userID]);

      if (row.count > 0) {
          //already exists, update this row
          db.prepare('run', "UPDATE userNames SET userName = ? WHERE userID = ?", [userName, userID]);
      } else {
          //add to the db
          db.prepare('run', "INSERT INTO userNames VALUES(?, ?)", [userID, userName]);
      }

      res.sendStatus(200);
  } catch (err) {
      console.log(err);
      res.sendStatus(500);

      return;
  }
}
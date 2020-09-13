var db = require('../databases/databases.js').db;
var getHash = require('../utils/getHash.js');
var logger = require('../utils/logger.js');
module.exports = function getViewsForUser(req, res) {
  let userID = req.query.userID;

  if (userID == undefined) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  //hash the userID
  userID = getHash(userID);

  try {
      let row = db.prepare('get', "SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
      if (row.viewCount != null) {
          res.send({
              viewCount: row.viewCount
          });
      } else {
          res.sendStatus(404);
      }
  } catch (err) {
      logger.error(err);
      res.sendStatus(500);

      return;
  }
}
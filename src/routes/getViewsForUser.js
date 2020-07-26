var db = require('../databases/databases.js').db;
var getHash = require('../utils/getHash.js');

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
      let row = db.prepare('get', "SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ?", [userID]);

      //increase the view count by one
      if (row.viewCount != null) {
          res.send({
              viewCount: row.viewCount
          });
      } else {
          res.sendStatus(404);
      }
  } catch (err) {
      console.log(err);
      res.sendStatus(500);

      return;
  }
}
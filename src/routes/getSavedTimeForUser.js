var db = require('../databases/databases.js').db;
var getHash = require('../utils/getHash.js');

module.exports = function getSavedTimeForUser (req, res) {
  let userID = req.query.userID;

  if (userID == undefined) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  //hash the userID
  userID = getHash(userID);

  try {
      let row = db.prepare("get", "SELECT SUM((endTime - startTime) / 60 * views) as minutesSaved FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);

      if (row.minutesSaved != null) {
          res.send({
              timeSaved: row.minutesSaved
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
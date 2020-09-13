var db = require('../databases/databases.js').db;

module.exports = function getDaysSavedFormatted (req, res) {
  // One day has 86400 seconds
  let row = db.prepare('get', "SELECT SUM((endTime - startTime) / 86400 * views) as daysSaved FROM sponsorTimes WHERE votes > -2 AND shadowHidden != 1", []);
      
  if (row !== undefined) {
      //send this result
      res.send({
          daysSaved: row.daysSaved.toFixed(2)
      });
  }
}

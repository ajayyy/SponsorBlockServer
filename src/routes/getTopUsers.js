var db = require('../databases/databases.js').db;

module.exports = function getTopUsers (req, res) {
  let sortType = req.query.sortType;

  if (sortType == undefined) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  //setup which sort type to use
  let sortBy = "";
  if (sortType == 0) {
      sortBy = "minutesSaved";
  } else if (sortType == 1) {
      sortBy = "viewCount";
  } else if (sortType == 2) {
      sortBy = "totalSubmissions";
  } else {
      //invalid request
      res.sendStatus(400);
      return;
  }

  let userNames = [];
  let viewCounts = [];
  let totalSubmissions = [];
  let minutesSaved = [];

  let rows = db.prepare("SELECT COUNT(*) as totalSubmissions, SUM(views) as viewCount," + 
                  "SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views) as minutesSaved, " +
                  "IFNULL(userNames.userName, sponsorTimes.userID) as userName FROM sponsorTimes LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID " +
                  "WHERE sponsorTimes.votes > -1 AND sponsorTimes.shadowHidden != 1 GROUP BY IFNULL(userName, sponsorTimes.userID) ORDER BY " + sortBy + " DESC LIMIT 100").all();
  
  for (let i = 0; i < rows.length; i++) {
      userNames[i] = rows[i].userName;

      viewCounts[i] = rows[i].viewCount;
      totalSubmissions[i] = rows[i].totalSubmissions;
      minutesSaved[i] = rows[i].minutesSaved;
  }

  //send this result
  res.send({
      userNames: userNames,
      viewCounts: viewCounts,
      totalSubmissions: totalSubmissions,
      minutesSaved: minutesSaved
  });
}
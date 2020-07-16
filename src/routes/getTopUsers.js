var db = require('../databases/databases.js').db;

module.exports = function getTopUsers (req, res) {
  let sortType = req.query.sortType;
  let categoryStatsEnabled = req.query.categoryStats == undefined ? false : true;

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
  let categoryStats = categoryStatsEnabled ? [] : undefined;
  
  let additionalFields = '';
  if (categoryStatsEnabled) {
    additionalFields += "SUM(CASE WHEN category = 'sponsor' THEN 1 ELSE 0 END) as categorySponsor, " +
                        "SUM(CASE WHEN category = 'intro' THEN 1 ELSE 0 END) as categorySumIntro, " +
                        "SUM(CASE WHEN category = 'outro' THEN 1 ELSE 0 END) as categorySumOutro, " +
                        "SUM(CASE WHEN category = 'interaction' THEN 1 ELSE 0 END) as categorySumInteraction, " +
                        "SUM(CASE WHEN category = 'selfpromo' THEN 1 ELSE 0 END) as categorySelfpromo, " +
                        "SUM(CASE WHEN category = 'music_offtopic' THEN 1 ELSE 0 END) as categoryMusicOfftopic, ";
  }

  let rows = db.prepare("SELECT COUNT(*) as totalSubmissions, SUM(views) as viewCount," + 
                  "SUM((sponsorTimes.endTime - sponsorTimes.startTime) / 60 * sponsorTimes.views) as minutesSaved, " +
                  additionalFields +
                  "IFNULL(userNames.userName, sponsorTimes.userID) as userName FROM sponsorTimes LEFT JOIN userNames ON sponsorTimes.userID=userNames.userID " +
                  "WHERE sponsorTimes.votes > -1 AND sponsorTimes.shadowHidden != 1 GROUP BY IFNULL(userName, sponsorTimes.userID) ORDER BY " + sortBy + " DESC LIMIT 100").all();
  
  for (let i = 0; i < rows.length; i++) {
      userNames[i] = rows[i].userName;

      viewCounts[i] = rows[i].viewCount;
      totalSubmissions[i] = rows[i].totalSubmissions;
      minutesSaved[i] = rows[i].minutesSaved;
      if (categoryStatsEnabled) {
        categoryStats[i] = [
          rows[i].categorySponsor,
          rows[i].categorySumInteraction,
          rows[i].categorySumIntro,
          rows[i].categorySumOutro,
          rows[i].categorySelfpromo,
          rows[i].categoryMusicOfftopic,
        ];
      }
  }

  //send this result
  res.send({
      userNames,
      viewCounts,
      totalSubmissions,
      minutesSaved,
      categoryStats
  });
}
var db = require('../databases/databases.js').db;

module.exports = function viewedVideoSponsorTime(req, res) {
  let UUID = req.query.UUID;

  if (UUID == undefined) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  //up the view count by one
  db.prepare('run', "UPDATE sponsorTimes SET views = views + 1 WHERE UUID = ?", [UUID]);

  res.sendStatus(200);
}

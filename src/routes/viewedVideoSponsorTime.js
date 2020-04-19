var db = require('../databases/databases.js').db;

module.exports = function viewedVideoSponsorTime(req, res) {
  let UUID = req.query.UUID;

  if (UUID == undefined) {
      //invalid request
      res.sendStatus(400);
      return;
  }

  //up the view count by one
  db.prepare("UPDATE sponsorTimes SET views = views + 1 WHERE UUID = ?").run(UUID);

  res.sendStatus(200);
}

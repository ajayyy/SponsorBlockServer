var db = require('../databases/databases.js').db;

module.exports = function getDaysSavedFormatted (req, res) {
  let row = db.prepare("select sum((endtime - starttime) / 60 / 60 / 24 * views) as dayssaved from sponsortimes where shadowhidden != 1").get();
      
  if (row !== undefined) {
      //send this result
      res.send({
          dayssaved: row.dayssaved.tofixed(2)
      });
  }
}

const db = require('../databases/databases.js').db;
const getHash = require('../utils/getHash.js');

function dbGetSubmittedSegmentSummary (userID) {
  try {
    let row = db.prepare("get", "SELECT SUM(((endTime - startTime) / 60) * views) as minutesSaved, count(*) as segmentCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
    if (row.minutesSaved != null) {
      return {
        minutesSaved: row.minutesSaved,
        segmentCount: row.segmentCount,
      };
    } else {
      return {
        minutesSaved: 0,
        segmentCount: 0,
      };
    }
  } catch (err) {
    return false;
  }
}

function dbGetUsername (userID) {
  try {
    let row = db.prepare('get', "SELECT userName FROM userNames WHERE userID = ?", [userID]);
    if (row !== undefined) {
      return row.userName;
    } else {
      //no username yet, just send back the userID
      return userID;
    }
  } catch (err) {
    return false;
  }
}

function dbGetViewsForUser (userID) {
  try {
    let row = db.prepare('get', "SELECT SUM(views) as viewCount FROM sponsorTimes WHERE userID = ? AND votes > -2 AND shadowHidden != 1", [userID]);
    //increase the view count by one
    if (row.viewCount != null) {
      return row.viewCount;
    } else {
      return 0;
    }
  } catch (err) {
    return false;
  }
}

function dbGetWarningsForUser (userID) {
  try {
    let rows = db.prepare('all', "SELECT * FROM warnings WHERE userID = ?", [userID]);
    return rows.length;
  } catch (err) {
    logger.error('Couldn\'t get warnings for user ' + userID + '. returning 0') ;
    return 0;
  }
}

module.exports = function getUserInfo (req, res) {
  let userID = req.query.userID;

  if (userID == undefined) {
    //invalid request
    res.status(400).send('Parameters are not valid');
    return;
  }

  //hash the userID
  userID = getHash(userID);
  
  const segmentsSummary = dbGetSubmittedSegmentSummary(userID);
  res.send({
    userID,
    userName: dbGetUsername(userID),
    minutesSaved: segmentsSummary.minutesSaved,
    segmentCount: segmentsSummary.segmentCount,
    viewCount: dbGetViewsForUser(userID),
    warnings: dbGetWarningsForUser(userID)
  });
}

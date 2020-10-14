const getHash = require('./getHash.js');

module.exports = function getSubmissionUUID(videoID, category, userID,
  startTime, endTime) {
  return getHash('v2-categories' + videoID + startTime + endTime + category +
    userID, 1);
};

var db = require('../databases/databases.js').db;
var request = require('request');

// A cache of the number of chrome web store users
var chromeUsersCache = null;
var firefoxUsersCache = null;
var lastUserCountCheck = 0;


module.exports = function getTotalStats (req, res) {
  let row = db.prepare('get', "SELECT COUNT(DISTINCT userID) as userCount, COUNT(*) as totalSubmissions, " +
              "SUM(views) as viewCount, SUM((endTime - startTime) / 60 * views) as minutesSaved FROM sponsorTimes WHERE shadowHidden != 1 AND votes >= 0", []);

  if (row !== undefined) {
      //send this result
      res.send({
          userCount: row.userCount,
          activeUsers: chromeUsersCache + firefoxUsersCache,
          viewCount: row.viewCount,
          totalSubmissions: row.totalSubmissions,
          minutesSaved: row.minutesSaved
      });

      // Check if the cache should be updated (every ~14 hours)
      let now = Date.now();
      if (now - lastUserCountCheck > 5000000) {
          lastUserCountCheck = now;

          // Get total users
          request.get("https://addons.mozilla.org/api/v3/addons/addon/sponsorblock/", function (err, firefoxResponse, body) {
              try {
                  firefoxUsersCache = parseInt(JSON.parse(body).average_daily_users);

                  request.get("https://chrome.google.com/webstore/detail/sponsorblock-for-youtube/mnjggcdmjocbbbhaepdhchncahnbgone", function(err, chromeResponse, body) {
                      if (body !== undefined) {
                          try {
                              chromeUsersCache = parseInt(body.match(/(?<=\<span class=\"e-f-ih\" title=\").*?(?= users\">)/)[0].replace(",", ""));
                          } catch (error) {
                              // Re-check later
                              lastUserCountCheck = 0;
                          }
                      } else {
                          lastUserCountCheck = 0;
                      }
                  });
              } catch (error) {
                  // Re-check later
                  lastUserCountCheck = 0;
              }
          });
      }
  }
}
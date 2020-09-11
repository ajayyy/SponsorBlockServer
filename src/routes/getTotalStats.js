const db = require('../databases/databases.js').db;
const request = require('request');
const config = require('../config.js');

// A cache of the number of chrome web store users
let chromeUsersCache = null;
let firefoxUsersCache = null;

// By the privacy friendly user counter
let apiUsersCache = null;

let lastUserCountCheck = 0;

module.exports = function getTotalStats (req, res) {
    let row = db.prepare('get', "SELECT COUNT(DISTINCT userID) as userCount, COUNT(*) as totalSubmissions, " +
              "SUM(views) as viewCount, SUM((endTime - startTime) / 60 * views) as minutesSaved FROM sponsorTimes WHERE shadowHidden != 1 AND votes >= 0", []);

    if (row !== undefined) {
        let extensionUsers = chromeUsersCache + firefoxUsersCache;

        //send this result
        res.send({
            userCount: row.userCount,
            activeUsers: extensionUsers,
            apiUsers: Math.max(apiUsersCache, extensionUsers),
            viewCount: row.viewCount,
            totalSubmissions: row.totalSubmissions,
            minutesSaved: row.minutesSaved
        });

        // Check if the cache should be updated (every ~14 hours)
        let now = Date.now();
        if (now - lastUserCountCheck > 5000000) {
            lastUserCountCheck = now;

            updateExtensionUsers();
        }
    }
}

function updateExtensionUsers() {
    if (config.userCounterURL) {
        request.get(config.userCounterURL + "/api/v1/userCount", (err, response, body) => {
            apiUsersCache = Math.max(apiUsersCache, JSON.parse(body).userCount);
        });
    }

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
import { db } from "../databases/databases.js";
import { config } from "../config.js";
import { Request, Response } from "express";
import fetch from "node-fetch";
import { Logger } from "../utils/logger.js";

// A cache of the number of chrome web store users
let chromeUsersCache = 0;
let firefoxUsersCache = 0;

// By the privacy friendly user counter
let apiUsersCache = 0;

let lastUserCountCheck = 0;

export async function getTotalStats(req: Request, res: Response): Promise<void> {
    const userCountQuery = `(SELECT COUNT(*) FROM (SELECT DISTINCT "userID" from "sponsorTimes") t) "userCount",`;

    const row = await db.prepare("get", `SELECT ${req.query.countContributingUsers ? userCountQuery : ""} COUNT(*) as "totalSubmissions",
        SUM("views") as "viewCount", SUM(("endTime" - "startTime") / 60 * "views") as "minutesSaved" FROM "sponsorTimes" WHERE "shadowHidden" != 1 AND "votes" >= 0`, []);

    if (row !== undefined) {
        const extensionUsers = chromeUsersCache + firefoxUsersCache;

        //send this result
        res.send({
            userCount: row.userCount,
            activeUsers: extensionUsers,
            apiUsers: Math.max(apiUsersCache, extensionUsers),
            viewCount: row.viewCount,
            totalSubmissions: row.totalSubmissions,
            minutesSaved: row.minutesSaved,
        });

        // Check if the cache should be updated (every ~14 hours)
        const now = Date.now();
        if (now - lastUserCountCheck > 5000000) {
            lastUserCountCheck = now;
            updateExtensionUsers();
        }
    }
}

function updateExtensionUsers() {
    if (config.userCounterURL) {
        fetch(`${config.userCounterURL}/api/v1/userCount`)
            .then(res => res.json())
            .then(data => {
                apiUsersCache = Math.max(apiUsersCache, data.userCount);
            })
            .catch(() => Logger.debug(`Failing to connect to user counter at: ${config.userCounterURL}`));
    }

    const mozillaAddonsUrl = "https://addons.mozilla.org/api/v3/addons/addon/sponsorblock/";
    const chromeExtensionUrl = "https://chrome.google.com/webstore/detail/sponsorblock-for-youtube/mnjggcdmjocbbbhaepdhchncahnbgone";

    fetch(mozillaAddonsUrl)
        .then(res => res.json())
        .then(data => {
            firefoxUsersCache = data.average_daily_users;
            fetch(chromeExtensionUrl)
                .then(res => res.text())
                .then(body => {
                    // 2021-01-05
                    // [...]<span><meta itemprop="interactionCount" content="UserDownloads:100.000+"/><meta itemprop="opera[...]
                    const matchingString = '"UserDownloads:';
                    const matchingStringLen = matchingString.length;
                    const userDownloadsStartIndex = body.indexOf(matchingString);
                    if (userDownloadsStartIndex >= 0) {
                        const closingQuoteIndex = body.indexOf('"', userDownloadsStartIndex + matchingStringLen);
                        const userDownloadsStr = body.substr(userDownloadsStartIndex + matchingStringLen, closingQuoteIndex - userDownloadsStartIndex).replace(",","").replace(".","");
                        chromeUsersCache = parseInt(userDownloadsStr);
                    }
                    else {
                        lastUserCountCheck = 0;
                    }
                })
                .catch(() => Logger.debug(`Failing to connect to ${chromeExtensionUrl}`));
        })
        .catch(() => {
            Logger.debug(`Failing to connect to ${mozillaAddonsUrl}`);
        });
}

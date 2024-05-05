import { db } from "../databases/databases";
import { config } from "../config";
import { Request, Response } from "express";
import axios from "axios";
import { Logger } from "../utils/logger";
import { getCWSUsers, getChromeUsers } from "../utils/getCWSUsers";

// A cache of the number of chrome web store users
let chromeUsersCache = 0;
let firefoxUsersCache = 0;

// By the privacy friendly user counter
let apiUsersCache = 0;
let lastUserCountCheck = 0;

interface DBStatsData {
    userCount: number,
    viewCount: number,
    totalSubmissions: number,
    minutesSaved: number
}

let lastFetch: DBStatsData = {
    userCount: 0,
    viewCount: 0,
    totalSubmissions: 0,
    minutesSaved: 0
};

updateExtensionUsers();

export async function getTotalStats(req: Request, res: Response): Promise<void> {
    try {
        const countContributingUsers = Boolean(req.query?.countContributingUsers == "true");
        const row = await getStats(countContributingUsers);
        lastFetch = row;

        /* istanbul ignore if */
        if (!row) res.sendStatus(500);
        const extensionUsers = chromeUsersCache + firefoxUsersCache;

        //send this result
        res.send({
            userCount: row.userCount ?? 0,
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
    } catch (e) {
        Logger.error(e as string);
        res.sendStatus(500);
    }
}

function getStats(countContributingUsers: boolean): Promise<DBStatsData> {
    if (db.highLoad()) {
        return Promise.resolve(lastFetch);
    } else {
        const userCountQuery = `(SELECT COUNT(*) FROM (SELECT DISTINCT "userID" from "sponsorTimes") t) "userCount",`;

        return db.prepare("get", `SELECT ${countContributingUsers ? userCountQuery : ""} COUNT(*) as "totalSubmissions",
            SUM("views") as "viewCount", SUM(("endTime" - "startTime") / 60 * "views") as "minutesSaved" FROM "sponsorTimes" WHERE "shadowHidden" != 1 AND "votes" >= 0 AND "actionType" != 'chapter'`, []);
    }
}

function updateExtensionUsers() {
    /* istanbul ignore else */
    if (config.userCounterURL) {
        axios.get(`${config.userCounterURL}/api/v1/userCount`)
            .then(res => apiUsersCache = Math.max(apiUsersCache, res.data.userCount))
            .catch( /* istanbul ignore next */ () => Logger.debug(`Failing to connect to user counter at: ${config.userCounterURL}`));
    }

    const mozillaAddonsUrl = "https://addons.mozilla.org/api/v3/addons/addon/sponsorblock/";
    const chromeExtensionUrl = "https://chrome.google.com/webstore/detail/sponsorblock-for-youtube/mnjggcdmjocbbbhaepdhchncahnbgone";
    const chromeExtId = "mnjggcdmjocbbbhaepdhchncahnbgone";

    axios.get(mozillaAddonsUrl)
        .then(res => firefoxUsersCache = res.data.average_daily_users )
        .catch( /* istanbul ignore next */ () => {
            Logger.debug(`Failing to connect to ${mozillaAddonsUrl}`);
            return 0;
        });
    getCWSUsers(chromeExtId)
        .then(res => chromeUsersCache = res)
        .catch(/* istanbul ignore next */ () =>
            getChromeUsers(chromeExtensionUrl)
                .then(res => chromeUsersCache = res)
        );
}
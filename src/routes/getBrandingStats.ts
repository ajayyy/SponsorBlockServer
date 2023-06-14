/* istanbul ignore file */

import { db } from "../databases/databases";
import { Request, Response } from "express";
import axios from "axios";
import { Logger } from "../utils/logger";
import { getCWSUsers } from "../utils/getCWSUsers";

// A cache of the number of chrome web store users
let chromeUsersCache = 0;
let firefoxUsersCache = 0;

interface DBStatsData {
    userCount: number,
    titles: number,
    thumbnails: number,
}

let lastFetch: DBStatsData = {
    userCount: 0,
    titles: 0,
    thumbnails: 0
};

updateExtensionUsers();

export async function getBrandingStats(req: Request, res: Response): Promise<void> {
    const row = await getStats();
    lastFetch = row;

    /* istanbul ignore if */
    if (!row) res.sendStatus(500);
    const extensionUsers = chromeUsersCache + firefoxUsersCache;

    //send this result
    res.send({
        userCount: row.userCount ?? 0,
        activeUsers: extensionUsers,
        titles: row.titles,
        thumbnails: row.thumbnails,
    });
}

async function getStats(): Promise<DBStatsData> {
    if (db.highLoad()) {
        return Promise.resolve(lastFetch);
    } else {
        const userCount = (await db.prepare("get", `SELECT COUNT(DISTINCT "userID") as "userCount" FROM titles`, []))?.userCount;
        const titles = (await db.prepare("get", `SELECT COUNT(*) as "titles" FROM titles`, []))?.titles;
        const thumbnails = (await db.prepare("get", `SELECT COUNT(*) as "thumbnails" FROM thumbnails`, []))?.thumbnails;

        return {
            userCount: userCount ?? 0,
            titles: titles ?? 0,
            thumbnails: thumbnails ?? 0
        };
    }
}

function updateExtensionUsers() {
    const mozillaAddonsUrl = "https://addons.mozilla.org/api/v3/addons/addon/dearrow/";
    const chromeExtensionUrl = "https://chrome.google.com/webstore/detail/enamippconapkdmgfgjchkhakpfinmaj";
    const chromeExtId = "enamippconapkdmgfgjchkhakpfinmaj";

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

/* istanbul ignore next */
function getChromeUsers(chromeExtensionUrl: string): Promise<number> {
    return axios.get(chromeExtensionUrl)
        .then(res => {
            const body = res.data;
            // 2021-01-05
            // [...]<span><meta itemprop="interactionCount" content="UserDownloads:100.000+"/><meta itemprop="opera[...]
            const matchingString = '"UserDownloads:';
            const matchingStringLen = matchingString.length;
            const userDownloadsStartIndex = body.indexOf(matchingString);
            /* istanbul ignore else */
            if (userDownloadsStartIndex >= 0) {
                const closingQuoteIndex = body.indexOf('"', userDownloadsStartIndex + matchingStringLen);
                const userDownloadsStr = body.substr(userDownloadsStartIndex + matchingStringLen, closingQuoteIndex - userDownloadsStartIndex).replace(",", "").replace(".", "");
                return parseInt(userDownloadsStr);
            }
        })
        .catch(/* istanbul ignore next */ () => {
            Logger.debug(`Failing to connect to ${chromeExtensionUrl}`);
            return 0;
        });
}
import fetch from 'node-fetch';
import {db} from '../../src/databases/databases';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';

describe('shadowBanUser', () => {
    beforeAll(async () => {
        const insertQuery = `INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", "views", "category", "service", "videoDuration", "hidden", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.prepare("run", insertQuery, ['testtesttest', 1, 11, 2, 0, 'shadow-1-uuid-0', 'shadowBanned', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", insertQuery, ['testtesttest2', 1, 11, 2, 0, 'shadow-1-uuid-0-1', 'shadowBanned', 0, 50, 'sponsor', 'PeerTube', 120, 0, 0, getHash('testtesttest2', 1)]);
        await db.prepare("run", insertQuery, ['testtesttest', 20, 33, 2, 0, 'shadow-1-uuid-2', 'shadowBanned', 0, 50, 'intro', 'YouTube', 101, 0, 0, getHash('testtesttest', 1)]);

        await db.prepare("run", insertQuery, ['testtesttest', 1, 11, 2, 0, 'shadow-2-uuid-0', 'shadowBanned2', 0, 50, 'sponsor', 'YouTube', 100, 0, 0, getHash('testtesttest', 1)]);
        await db.prepare("run", insertQuery, ['testtesttest2', 1, 11, 2, 0, 'shadow-2-uuid-0-1', 'shadowBanned2', 0, 50, 'sponsor', 'PeerTube', 120, 0, 0, getHash('testtesttest2', 1)]);
        await db.prepare("run", insertQuery, ['testtesttest', 20, 33, 2, 0, 'shadow-2-uuid-2', 'shadowBanned2', 0, 50, 'intro', 'YouTube', 101, 0, 0, getHash('testtesttest', 1)]);

        await db.prepare("run", insertQuery, ['testtesttest', 1, 11, 2, 0, 'shadow-3-uuid-0', 'shadowBanned3', 0, 50, 'sponsor', 'YouTube', 100, 0, 1, getHash('testtesttest', 1)]);
        await db.prepare("run", insertQuery, ['testtesttest2', 1, 11, 2, 0, 'shadow-3-uuid-0-1', 'shadowBanned3', 0, 50, 'sponsor', 'PeerTube', 120, 0, 1, getHash('testtesttest2', 1)]);
        await db.prepare("run", insertQuery, ['testtesttest', 20, 33, 2, 0, 'shadow-3-uuid-2', 'shadowBanned3', 0, 50, 'intro', 'YouTube', 101, 0, 1, getHash('testtesttest', 1)]);
        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, ['shadowBanned3']);

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES(?)`, [getHash("shadow-ban-vip")]);
    });


    it('Should be able to ban user and hide submissions', async () => {
        const res = await fetch(getbaseURL() + "/api/shadowBanUser?userID=shadowBanned&adminUserID=shadow-ban-vip", {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const videoRow = await db.prepare('all', `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, ["shadowBanned", 1]);
            const shadowRow = await db.prepare('get', `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, ["shadowBanned"]);

            if (!shadowRow || typeof videoRow === 'undefined' || videoRow.length !== 3) {
                throw new Error("Ban failed " + JSON.stringify(videoRow) + " " + JSON.stringify(shadowRow));
            }
        }
    });

    it('Should be able to unban user without unhiding submissions', async () => {
        const res = await fetch(getbaseURL() + "/api/shadowBanUser?userID=shadowBanned&adminUserID=shadow-ban-vip&enabled=false&unHideOldSubmissions=false", {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const videoRow = await db.prepare('all', `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, ["shadowBanned", 1]);
            const shadowRow = await db.prepare('get', `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, ["shadowBanned"]);

            if (shadowRow || typeof videoRow === 'undefined' || videoRow.length !== 3) {
                throw new Error("Unban failed " + JSON.stringify(videoRow) + " " + JSON.stringify(shadowRow));
            }
        }
    });

    it('Should be able to ban user and hide submissions from only some categories', async () => {
        const res = await fetch(getbaseURL() + '/api/shadowBanUser?userID=shadowBanned2&adminUserID=shadow-ban-vip&categories=["sponsor"]', {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const videoRow: {category: string, shadowHidden: number}[] = (await db.prepare('all', `SELECT "shadowHidden", "category" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, ["shadowBanned2", 1]));
            const shadowRow = await db.prepare('get', `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, ["shadowBanned2"]);

            if (!shadowRow || typeof videoRow === 'undefined' || 2 != videoRow.length || 2 !== videoRow.filter((elem) => elem?.category === "sponsor")?.length) {
                throw new Error("Ban failed " + JSON.stringify(videoRow) + " " + JSON.stringify(shadowRow));
            }
        }
    });

    it('Should be able to unban user and unhide submissions', async () => {
        const res = await fetch(getbaseURL() + "/api/shadowBanUser?userID=shadowBanned2&adminUserID=shadow-ban-vip&enabled=false", {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const videoRow = await db.prepare('all', `SELECT "shadowHidden" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, ["shadowBanned2", 1]);
            const shadowRow = await db.prepare('get', `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, ["shadowBanned2"]);

            if (shadowRow || typeof videoRow === 'undefined' || videoRow.length !== 0) {
                throw new Error("Unban failed " + JSON.stringify(videoRow) + " " + JSON.stringify(shadowRow));
            }
        }
    });

    it('Should be able to unban user and unhide some submissions', async () => {
        const res = await fetch(getbaseURL() + `/api/shadowBanUser?userID=shadowBanned3&adminUserID=shadow-ban-vip&enabled=false&categories=["sponsor"]`, {
            method: 'POST'
        })
        if (res.status !== 200) throw new Error("Status code was: " + res.status);
        else {
            const videoRow = await db.prepare('all', `SELECT "shadowHidden", "category" FROM "sponsorTimes" WHERE "userID" = ? AND "shadowHidden" = ?`, ["shadowBanned3", 1]);
            const shadowRow = await db.prepare('get', `SELECT * FROM "shadowBannedUsers" WHERE "userID" = ?`, ["shadowBanned3"]);

            if (shadowRow || typeof videoRow === 'undefined' || videoRow.length !== 1 || typeof videoRow[0] === 'undefined' || videoRow[0].category !== "intro") {
                throw new Error("Unban failed " + JSON.stringify(videoRow) + " " + JSON.stringify(shadowRow));
            }
        }
    });

});

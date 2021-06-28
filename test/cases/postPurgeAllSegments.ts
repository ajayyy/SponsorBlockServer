import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from '../../src/databases/IDatabase';

async function dbSponsorTimesAdd(db: IDatabase, videoID: string, startTime: number, endTime: number, UUID: string, category: string) {
    const votes = 0,
        userID = 0,
        timeSubmitted = 0,
        views = 0,
        shadowHidden = 0,
        hidden = 0,
        hashedVideoID = `hash_${UUID}`;
    await db.prepare("run", `INSERT INTO
        "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID",
        "userID", "timeSubmitted", "views", "category", "shadowHidden", "hashedVideoID", "hidden")
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID, hidden]);
}

async function dbSponsorTimesCompareExpect(db: IDatabase, videoId: string, expectdHidden: number) {
    let seg = await db.prepare('get', `SELECT "hidden", "UUID" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoId]);
    for (let i = 0, len = seg.length; i < len; i++) {
        if (seg.hidden !== expectdHidden) {
            throw new Error(`${seg.UUID} hidden expected to be ${expectdHidden} but found ${seg.hidden}`);
        }
    }
}

describe('postPurgeAllSegments', function () {
    const privateVipUserID = 'VIPUser-purgeAll';
    const route = '/api/purgeAllSegments';
    const vipUserID = getHash(privateVipUserID);
    const baseURL = getbaseURL();

    beforeAll(async function () {
        // startTime and endTime get set in beforeEach for consistency
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 1, 'vsegpurgetest01uuid01', 'intro');
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 2, 'vsegpurgetest01uuid02', 'sponsor');
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 3, 'vsegpurgetest01uuid03', 'interaction');
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 4, 'vsegpurgetest01uuid04', 'outro');
        await dbSponsorTimesAdd(db, 'vseg-not-purged01', 0, 5, 'vsegpurgetest01uuid05', 'outro');
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [vipUserID]);
    });

    it('Reject non-VIP user', async function () {
        const res = await fetch(`${baseURL}${route}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegpurge01',
                userID: 'segshift_randomuser001',
            }),
        })
        if (res.status !== 403)
            throw new Error(res.status.toString());
    });

    it('Purge all segments success', async function () {
        const res = await fetch(`${baseURL}${route}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegpurge01',
                userID: privateVipUserID,
            }),
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        await dbSponsorTimesCompareExpect(db, 'vsegpurge01', 1)
        await dbSponsorTimesCompareExpect(db, 'vseg-not-purged01', 0);
    });
});

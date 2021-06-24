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

async function dbSponsorTimesCompareExpect(db: IDatabase, videoId: string) {
    let seg = await db.prepare('get', `SELECT "hidden", "UUID" FROM "sponsorTimes" WHERE "videoId" = ?`, [videoId]);
    for (let i = 0, len = seg.length; i < len; i++) {
        if (seg.hidden !== 1) {
            return `${seg.UUID} hidden expected to be 1 but found ${seg.hidden}`;
        }
    }
    return;
}

describe('postPurgeAllSegments', function () {
    const privateVipUserID = 'VIPUser-purgeAll';
    const route = '/api/purgeAllSegments';
    const vipUserID = getHash(privateVipUserID);
    const baseURL = getbaseURL();

    before(async function () {
        // startTime and endTime get set in beforeEach for consistency
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 0, 'vsegpurgetest01uuid01', 'intro');
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 0, 'vsegpurgetest01uuid02', 'sponsor');
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 0, 'vsegpurgetest01uuid03', 'interaction');
        await dbSponsorTimesAdd(db, 'vsegpurge01', 0, 0, 'vsegpurgetest01uuid04', 'outro');
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [vipUserID]);
    });

    it('Reject none VIP user', function (done: Done) {
        fetch(`${baseURL}${route}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegpurge01',
                userID: 'segshift_randomuser001',
            }),
        })
        .then(async res => {
            done(res.status === 403 ? undefined : res.status);
        })
        .catch(err => done(err));
    });

    it('Purge all segments success', function (done: Done) {
        fetch(`${baseURL}${route}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegpurge01',
                userID: privateVipUserID,
            }),
        })
        .then(async res => {
            if (res.status !== 200) return done(`Status code was ${res.status}`);
            done(await dbSponsorTimesCompareExpect(db, 'vsegpurge01'));
        })
        .catch(err => done(err));
    });
});

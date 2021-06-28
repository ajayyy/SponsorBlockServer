import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from '../../src/databases/IDatabase';

async function dbSponsorTimesAdd(db: IDatabase, videoID: string, startTime: number, endTime: number, UUID: string, category: string) {
    const votes = 0,
        userID = 0,
        timeSubmitted = 0,
        views = 0,
        shadowHidden = 0,
        hashedVideoID = `hash_${UUID}`;
    await db.prepare("run", `INSERT INTO
        "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID",
        "userID", "timeSubmitted", "views", "category", "shadowHidden", "hashedVideoID")
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID]);
}

async function dbSponsorTimesSetByUUID(db: IDatabase, UUID: string, startTime: number, endTime: number) {
    await db.prepare('run', `UPDATE "sponsorTimes" SET "startTime" = ?, "endTime" = ? WHERE "UUID" = ?`, [startTime, endTime, UUID]);
}

async function dbSponsorTimesCompareExpect(db: IDatabase, expect: any) {
    for (let i = 0, len = expect.length; i < len; i++) {
        const expectSeg = expect[i];
        let seg = await db.prepare('get', `SELECT "startTime", "endTime" FROM "sponsorTimes" WHERE "UUID" = ?`, [expectSeg.UUID]);
        if ('removed' in expect) {
            if (expect.removed === true && seg.votes === -2) {
                return;
            } else {
                throw new Error(`${expectSeg.UUID} doesnt got removed`);
            }
        }
        if (seg.startTime !== expectSeg.startTime) {
            throw new Error(`${expectSeg.UUID} startTime is incorrect. seg.startTime is ${seg.startTime} expected ${expectSeg.startTime}`);
        }
        if (seg.endTime !== expectSeg.endTime) {
            throw new Error(`${expectSeg.UUID} endTime is incorrect. seg.endTime is ${seg.endTime} expected ${expectSeg.endTime}`);
        }
    }
    return;
}

describe('segmentShift', function () {
    const privateVipUserID = 'VIPUser-segmentShift';
    const vipUserID = getHash(privateVipUserID);
    const baseURL = getbaseURL();

    beforeAll(async function () {
        // startTime and endTime get set in beforeEach for consistency
        await dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid01', 'intro');
        await dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid02', 'sponsor');
        await dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid03', 'interaction');
        await dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid04', 'outro');
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [vipUserID]);
    });

    beforeEach(async function () {
        // resetting startTime and endTime to reuse them
        await dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid01', 0, 10);
        await dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid02', 60, 90);
        await dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid03', 40, 45);
        await dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid04', 120, 140);
    });

    it('Reject none VIP user', async function () {
        const res = await fetch(`${baseURL}/api/segmentShift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegshift01',
                userID: 'segshift_randomuser001',
                startTime: 20,
                endTime: 30,
            }),
        })
        if (res.status !== 403) throw new Error(`status code: ${res.status}`);
    });

    it('Shift is outside segments', async function () {
        const res = await fetch(`${baseURL}/api/segmentShift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegshift01',
                userID: privateVipUserID,
                startTime: 20,
                endTime: 30,
            }),
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        const expect = [
            {
                UUID: 'vsegshifttest01uuid01',
                startTime: 0,
                endTime: 10,
            },
            {
                UUID: 'vsegshifttest01uuid02',
                startTime: 50,
                endTime: 80,
            },
            {
                UUID: 'vsegshifttest01uuid03',
                startTime: 30,
                endTime: 35,
            },
            {
                UUID: 'vsegshifttest01uuid04',
                startTime: 110,
                endTime: 130,
            },
        ];
        await dbSponsorTimesCompareExpect(db, expect)
    });

    it('Shift is inside segment', async function () {
        const res = await fetch(`${baseURL}/api/segmentShift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegshift01',
                userID: privateVipUserID,
                startTime: 65,
                endTime: 75,
            }),
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        const expect = [
            {
                UUID: 'vsegshifttest01uuid01',
                startTime: 0,
                endTime: 10,
            },
            {
                UUID: 'vsegshifttest01uuid02',
                startTime: 60,
                endTime: 80,
            },
            {
                UUID: 'vsegshifttest01uuid03',
                startTime: 40,
                endTime: 45,
            },
            {
                UUID: 'vsegshifttest01uuid04',
                startTime: 110,
                endTime: 130,
            },
        ];
        await dbSponsorTimesCompareExpect(db, expect);
    });

    it('Shift is overlaping startTime of segment', async function () {
        const res = await fetch(`${baseURL}/api/segmentShift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegshift01',
                userID: privateVipUserID,
                startTime: 32,
                endTime: 42,
            }),
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        const expect = [
            {
                UUID: 'vsegshifttest01uuid01',
                startTime: 0,
                endTime: 10,
            },
            {
                UUID: 'vsegshifttest01uuid02',
                startTime: 50,
                endTime: 80,
            },
            {
                UUID: 'vsegshifttest01uuid03',
                startTime: 32,
                endTime: 35,
            },
            {
                UUID: 'vsegshifttest01uuid04',
                startTime: 110,
                endTime: 130,
            },
        ];
        await dbSponsorTimesCompareExpect(db, expect);
    });

    it('Shift is overlaping endTime of segment', async function () {
        const res = await fetch(`${baseURL}/api/segmentShift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegshift01',
                userID: privateVipUserID,
                startTime: 85,
                endTime: 95,
            }),
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        const expect = [
            {
                UUID: 'vsegshifttest01uuid01',
                startTime: 0,
                endTime: 10,
            },
            {
                UUID: 'vsegshifttest01uuid02',
                startTime: 60,
                endTime: 85,
            },
            {
                UUID: 'vsegshifttest01uuid03',
                startTime: 40,
                endTime: 45,
            },
            {
                UUID: 'vsegshifttest01uuid04',
                startTime: 110,
                endTime: 130,
            },
        ];
        await dbSponsorTimesCompareExpect(db, expect);
    });

    it('Shift is overlaping segment', async function () {
        const res = await fetch(`${baseURL}/api/segmentShift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoID: 'vsegshift01',
                userID: privateVipUserID,
                startTime: 35,
                endTime: 55,
            }),
        })
        if (res.status !== 200) throw new Error(`Status code was ${res.status}`);
        const expect = [
            {
                UUID: 'vsegshifttest01uuid01',
                startTime: 0,
                endTime: 10,
            },
            {
                UUID: 'vsegshifttest01uuid02',
                startTime: 40,
                endTime: 70,
            },
            {
                UUID: 'vsegshifttest01uuid03',
                startTime: 40,
                endTime: 45,
                removed: true,
            },
            {
                UUID: 'vsegshifttest01uuid04',
                startTime: 100,
                endTime: 120,
            },
        ];
        await dbSponsorTimesCompareExpect(db, expect);
    });
});

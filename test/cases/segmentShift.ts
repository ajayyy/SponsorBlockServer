import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from '../../src/databases/IDatabase';

function dbSponsorTimesAdd(db: IDatabase, videoID: string, startTime: number, endTime: number, UUID: string, category: string) {
    const votes = 0,
        userID = 0,
        timeSubmitted = 0,
        views = 0,
        shadowHidden = 0,
        hashedVideoID = `hash_${UUID}`;
    db.exec(`INSERT INTO
    sponsorTimes (videoID, startTime, endTime, votes, UUID,
    userID, timeSubmitted, views, category, shadowHidden, hashedVideoID)
  VALUES
    ('${videoID}', ${startTime}, ${endTime}, ${votes}, '${UUID}',
    '${userID}', ${timeSubmitted}, ${views}, '${category}', ${shadowHidden}, '${hashedVideoID}')
  `);
}

function dbSponsorTimesSetByUUID(db: IDatabase, UUID: string, startTime: number, endTime: number) {
    await db.prepare('run', `UPDATE sponsorTimes SET startTime = ?, endTime = ? WHERE UUID = ?`, [startTime, endTime, UUID]);
}

function dbSponsorTimesCompareExpect(db: IDatabase, expect: any) {
    for (let i = 0, len = expect.length; i < len; i++) {
        const expectSeg = expect[i];
        let seg = await db.prepare('get', "SELECT startTime, endTime FROM sponsorTimes WHERE UUID = ?", [expectSeg.UUID]);
        if ('removed' in expect) {
            if (expect.removed === true && seg.votes === -2) {
                return;
            } else {
                return `${expectSeg.UUID} doesnt got removed`;
            }
        }
        if (seg.startTime !== expectSeg.startTime) {
            return `${expectSeg.UUID} startTime is incorrect. seg.startTime is ${seg.startTime} expected ${expectSeg.startTime}`;
        }
        if (seg.endTime !== expectSeg.endTime) {
            return `${expectSeg.UUID} endTime is incorrect. seg.endTime is ${seg.endTime} expected ${expectSeg.endTime}`;
        }
    }
    return;
}

describe('segmentShift', function () {
    const privateVipUserID = 'VIPUser-segmentShift';
    const vipUserID = getHash(privateVipUserID);
    const baseURL = getbaseURL();

    before(function (done: Done) {
        // startTime and endTime get set in beforeEach for consistency
        dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid01', 'intro');
        dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid02', 'sponsor');
        dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid03', 'interaction');
        dbSponsorTimesAdd(db, 'vsegshift01', 0, 0, 'vsegshifttest01uuid04', 'outro');
        db.exec(`INSERT INTO vipUsers (userID) VALUES ('${vipUserID}')`);
        done();
    });

    beforeEach(function (done: Done) {
        // resetting startTime and endTime to reuse them
        dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid01', 0, 10);
        dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid02', 60, 90);
        dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid03', 40, 45);
        dbSponsorTimesSetByUUID(db, 'vsegshifttest01uuid04', 120, 140);
        done();
    });

    it('Reject none VIP user', function (done: Done) {
        fetch(`${baseURL}/api/segmentShift`, {
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
        .then(res => {
            done(res.status === 403 ? undefined : res.status);
        })
        .catch(err => done(err));
    });

    it('Shift is outside segments', function (done: Done) {
        fetch(`${baseURL}/api/segmentShift`, {
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
        .then(res => {
            if (res.status !== 200) return done(`Status code was ${res.status}`);
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
            done(dbSponsorTimesCompareExpect(db, expect));
        })
        .catch(err => done(err));
    });

    it('Shift is inside segment', function (done: Done) {
        fetch(`${baseURL}/api/segmentShift`, {
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
        .then(res => {
            if (res.status !== 200) return done(`Status code was ${res.status}`);
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
            done(dbSponsorTimesCompareExpect(db, expect));
        })
        .catch(err => done(err));
    });

    it('Shift is overlaping startTime of segment', function (done: Done) {
        fetch(`${baseURL}/api/segmentShift`, {
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
        .then(res => {
            if (res.status !== 200) return done(`Status code was ${res.status}`);
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
            done(dbSponsorTimesCompareExpect(db, expect));
        })
        .catch(err => done(err));
    });

    it('Shift is overlaping endTime of segment', function (done: Done) {
        fetch(`${baseURL}/api/segmentShift`, {
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
        .then(res => {
            if (res.status !== 200) return done(`Status code was ${res.status}`);
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
            done(dbSponsorTimesCompareExpect(db, expect));
        })
        .catch(err => done(err));
    });

    it('Shift is overlaping segment', function (done: Done) {
        fetch(`${baseURL}/api/segmentShift`, {
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
        .then(res => {
            if (res.status !== 200) return done(`Status code was ${res.status}`);
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
            done(dbSponsorTimesCompareExpect(db, expect));
        })
        .catch(err => done(err));
    });
});

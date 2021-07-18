import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';
import assert from 'assert';

describe('getUserInfo', () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_01"), 'Username user 01']);

        const sponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000001', getHash("getuserinfo_user_01"), 1, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000002', getHash("getuserinfo_user_01"), 2, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['yyyxxxzzz', 1, 11, -1, 'uuid000003', getHash("getuserinfo_user_01"), 3, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['yyyxxxzzz', 1, 11, -2, 'uuid000004', getHash("getuserinfo_user_01"), 4, 10, 'sponsor', 1]);
        await db.prepare("run", sponsorTimesQuery, ['xzzzxxyyy', 1, 11, -5, 'uuid000005', getHash("getuserinfo_user_01"), 5, 10, 'sponsor', 1]);
        await db.prepare("run", sponsorTimesQuery, ['zzzxxxyyy', 1, 11, 2, 'uuid000006', getHash("getuserinfo_user_02"), 6, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000007', getHash("getuserinfo_user_02"), 7, 10, 'sponsor', 1]);
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000008', getHash("getuserinfo_user_02"), 8, 10, 'sponsor', 1]);

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issueTime", "issuerUserID", "enabled", "reason") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_0'), 10, 'getuserinfo_vip', 1, "warning0-0"]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_1'), 20, 'getuserinfo_vip', 1, "warning1-0"]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_1'), 30, 'getuserinfo_vip', 1, "warning1-1"]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_2'), 40, 'getuserinfo_vip', 0, "warning2-0"]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_3'), 50, 'getuserinfo_vip', 1, "warning3-0"]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_3'), 60, 'getuserinfo_vip', 0, "warning3-1"]);
    });

    it('Should be able to get a 200', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_01')
        .then(res => {
            assert.strictEqual(res.status, 200);
            done();
        })
        .catch(err => done(err));
    });

    it('Should be able to get a 400 (No userID parameter)', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo')
        .then(res => {
            assert.strictEqual(res.status, 400);
            done();
        })
        .catch(err => done(err));
    });

    it('Should be able to get user info', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_01')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const expected = {
                userName: 'Username user 01',
                userID: "66e7c974039ffb870a500a33eca3a3989861018909b938c313cf1a8a366800b8",
                minutesSaved: 5,
                viewCount: 30,
                ignoredViewCount: 20,
                segmentCount: 3,
                ignoredSegmentCount: 2,
                reputation: -2,
                lastSegmentID: "uuid000005",
                vip: false,
                warnings: 0,
                warningReason: ""
            };
            const data = await res.json();
            assert.deepStrictEqual(data, expected);
            done();
        })
        .catch(err => done(err));
    });

    it('Should get warning data', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_0&value=warnings')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warnings, 1);
            done();
        })
        .catch(err => done(err));
    });

    it('Should get warning data with public ID', (done: Done) => {
        fetch(getbaseURL() + `/api/userInfo?publicUserID=${getHash("getuserinfo_warning_0")}&values=["warnings"]`)
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warnings, 1);
            done();
        })
        .catch(err => done(err));
    });

    it('Should get multiple warnings', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_1&value=warnings')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warnings, 2);
            done();
        })
        .catch(err => done(err));
    });

    it('Should not get warnings if none', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_2&value=warnings')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warnings, 0);
            done();
        })
        .catch(err => done(err));
    });

    it('Should done(userID for userName (No userName set)', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_02&value=userName')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.userName, 'c2a28fd225e88f74945794ae85aef96001d4a1aaa1022c656f0dd48ac0a3ea0f');
            done();
        })
        .catch(err => done(err));
    });

    it('Should return null segment if none', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_null&value=lastSegmentID')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.lastSegmentID, null);
            done();
        })
        .catch(err => done(err));
    });

    it('Should return zeroes if userid does not exist', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_null&value=lastSegmentID')
        .then(async res => {
            const data = await res.json();
            for (const value in data) {
                if (data[value] === null && value !== "lastSegmentID")  {
                    done(`returned null for ${value}`);
                }
            }
            done(); // pass
        })
        .catch(err => done(err));
    });

    it('Should get warning reason from from single enabled warning', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_0&values=["warningReason"]')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warningReason, "warning0-0");
            done(); // pass
        })
        .catch(err => done(err));
    });

    it('Should get most recent warning from two enabled warnings', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_1&value=warningReason')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warningReason, "warning1-1");
            done(); // pass
        })
        .catch(err => done(err));
    });

    it('Should not get disabled warning', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_2&values=["warnings","warningReason"]')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warnings, 0);
            assert.strictEqual(data.warningReason, "");
            done(); // pass
        })
        .catch(err => done(err));
    });

    it('Should not get newer disabled warning', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_3&value=warnings&value=warningReason')
        .then(async res => {
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.warnings, 1);
            assert.strictEqual(data.warningReason, "warning3-0");
            done(); // pass
        })
        .catch(err => done(err));
    });

    it('Should get 400 if bad values specified', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_3&value=invalid-value')
        .then(async res => {
            assert.strictEqual(res.status, 400);
            done(); // pass
        })
        .catch(err => done(err));
    });
});

import fetch from 'node-fetch';
import {getbaseURL} from '../utils';
import {getHash} from '../../src/utils/getHash';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase

describe('getUserInfo', () => {
    beforeAll(async () => {
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

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issueTime", "issuerUserID", "enabled") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_0'), 10, 'getuserinfo_vip', 1]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_1'), 10, 'getuserinfo_vip', 1]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_1'), 10, 'getuserinfo_vip', 1]);
    });

    it('Should be able to get a 200', () =>
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_01')
        .then(res => {
            if (res.status !== 200) throw new Error('non 200 (' + res.status + ')');
        })
    );

    it('Should be able to get a 400 (No userID parameter)', () =>
        fetch(getbaseURL() + '/api/userInfo')
        .then(res => {
            if (res.status !== 400) throw new Error('non 400 (' + res.status + ')');
        })
    );

    it('Should be able to get user info', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_01')
        if (res.status !== 200) {
            throw new Error("non 200");
        } else {
            const data = await res.json();
            if (data.userName !== 'Username user 01') {
                throw new Error('Returned incorrect userName "' + data.userName + '"');
            } else if (data.minutesSaved !== 5) {
                throw new Error('Returned incorrect minutesSaved "' + data.minutesSaved + '"');
            } else if (data.viewCount !== 30) {
                throw new Error('Returned incorrect viewCount "' + data.viewCount + '"');
            } else if (data.ignoredViewCount !== 20) {
                throw new Error('Returned incorrect ignoredViewCount "' + data.ignoredViewCount + '"');
            } else if (data.segmentCount !== 3) {
                throw new Error('Returned incorrect segmentCount "' + data.segmentCount + '"');
            } else if (data.ignoredSegmentCount !== 2) {
                throw new Error('Returned incorrect ignoredSegmentCount "' + data.ignoredSegmentCount + '"');
            } else if (data.reputation !== -2) {
                throw new Error('Returned incorrect reputation "' + data.reputation + '"');
            } else if (data.lastSegmentID !== "uuid000005") {
                throw new Error('Returned incorrect last segment "' + data.lastSegmentID + '"');
            }
        }
    });

    it('Should get warning data', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_0')
        if (res.status !== 200) {
            throw new Error('non 200 (' + res.status + ')');
        } else {
            const data = await res.json();;
            if (data.warnings !== 1) throw new Error('wrong number of warnings: ' + data.warnings + ', not ' + 1);
        }
    });

    it('Should get warning data with public ID', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?publicUserID=' + getHash("getuserinfo_warning_0"))
        if (res.status !== 200) {
            throw new Error('non 200 (' + res.status + ')');
        } else {
            const data = await res.json();
            if (data.warnings !== 1) throw new Error('wrong number of warnings: ' + data.warnings + ', not ' + 1);
        }
    });

    it('Should get multiple warnings', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_1')
        if (res.status !== 200) {
            throw new Error('non 200 (' + res.status + ')');
        } else {
            const data = await res.json();
            if (data.warnings !== 2) throw new Error('wrong number of warnings: ' + data.warnings + ', not ' + 2);
        }
    });

    it('Should not get warnings if none', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_2')
        if (res.status !== 200) {
            throw new Error('non 200 (' + res.status + ')');
        } else {
            const data = await res.json();
            if (data.warnings !== 0) throw new Error('wrong number of warnings: ' + data.warnings + ', not ' + 0);
        }
    });

    it('Should done(userID for userName (No userName set)', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_02')
        if (res.status !== 200) {
            throw new Error('non 200 (' + res.status + ')');
        } else {
            const data = await res.json();
            if (data.userName !== 'c2a28fd225e88f74945794ae85aef96001d4a1aaa1022c656f0dd48ac0a3ea0f') {
                throw new Error('Did not done(userID for userName');
            }
        }
    });

    it('Should return null segment if none', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_null')
        if (res.status !== 200) {
            throw new Error('non 200 (' + res.status + ')');
        } else {
            const data = await res.json();
            if (data.lastSegmentID !== null) throw new Error('returned segment ' + data.warnings + ', not ' + null);
        }
    });

    it('Should return zeroes if userid does not exist', async () => {
        const res = await fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_null')
        const data = await res.json();
        for (var value in data) {
            if (data[value] === null && value !== "lastSegmentID")  {
                throw new Error(`returned null for ${value}`)
            }
        }
    });
});

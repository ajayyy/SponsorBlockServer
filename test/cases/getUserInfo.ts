import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getUserInfo', () => {
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_01"), 'Username user 01']);

        const sponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000001', getHash("getuserinfo_user_01"), 0, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000002', getHash("getuserinfo_user_01"), 0, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['yyyxxxzzz', 1, 11, -1, 'uuid000003', getHash("getuserinfo_user_01"), 0, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['yyyxxxzzz', 1, 11, -2, 'uuid000004', getHash("getuserinfo_user_01"), 0, 10, 'sponsor', 1]);
        await db.prepare("run", sponsorTimesQuery, ['xzzzxxyyy', 1, 11, -5, 'uuid000005', getHash("getuserinfo_user_01"), 0, 10, 'sponsor', 1]);
        await db.prepare("run", sponsorTimesQuery, ['zzzxxxyyy', 1, 11, 2, 'uuid000006', getHash("getuserinfo_user_02"), 0, 10, 'sponsor', 0]);
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000007', getHash("getuserinfo_user_02"), 0, 10, 'sponsor', 1]);
        await db.prepare("run", sponsorTimesQuery, ['xxxyyyzzz', 1, 11, 2, 'uuid000008', getHash("getuserinfo_user_02"), 0, 10, 'sponsor', 1]);

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issueTime", "issuerUserID", "enabled") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_0'), 10, 'getuserinfo_vip', 1]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_1'), 10, 'getuserinfo_vip', 1]);
        await db.prepare("run", insertWarningQuery, [getHash('getuserinfo_warning_1'), 10, 'getuserinfo_vip', 1]);
    });

    it('Should be able to get a 200', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo?userID=getuserinfo_user_01')
        .then(res => {
            if (res.status !== 200) done('non 200 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => done('couldn\'t call endpoint'));
    });

    it('Should be able to get a 400 (No userID parameter)', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => done('couldn\'t call endpoint'));
    });

    it('Should done(info', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo?userID=getuserinfo_user_01')
        .then(async res => {
            if (res.status !== 200) {
                done("non 200");
            } else {
                const data = await res.json();
                if (data.userName !== 'Username user 01') {
                    done('Returned incorrect userName "' + data.userName + '"');
                } else if (data.minutesSaved !== 5) {
                    done('Returned incorrect minutesSaved "' + data.minutesSaved + '"');
                } else if (data.viewCount !== 30) {
                    done('Returned incorrect viewCount "' + data.viewCount + '"');
                } else if (data.segmentCount !== 3) {
                    done('Returned incorrect segmentCount "' + data.segmentCount + '"');
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should get warning data', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo?userID=getuserinfo_warning_0')
        .then(async res => {
            if (res.status !== 200) {
                done('non 200 (' + res.status + ')');
            } else {
                const data = await res.json();;
                if (data.warnings !== 1) done('wrong number of warnings: ' + data.warnings + ', not ' + 1);
                else done(); // pass
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should get multiple warnings', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo?userID=getuserinfo_warning_1')
        .then(async res => {
            if (res.status !== 200) {
                done('non 200 (' + res.status + ')');
            } else {
                const data = await res.json();
                if (data.warnings !== 2) done('wrong number of warnings: ' + data.warnings + ', not ' + 2);
                else done(); // pass
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should not get warnings if noe', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo?userID=getuserinfo_warning_2')
        .then(async res => {
            if (res.status !== 200) {
                done('non 200 (' + res.status + ')');
            } else {
                const data = await res.json();
                if (data.warnings !== 0) done('wrong number of warnings: ' + data.warnings + ', not ' + 0);
                else done(); // pass
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should done(userID for userName (No userName set)', (done: Done) => {
        fetch(getbaseURL() + '/api/getUserInfo?userID=getuserinfo_user_02')
        .then(async res => {
            if (res.status !== 200) {
                done('non 200 (' + res.status + ')');
            } else {
                const data = await res.json();
                if (data.userName !== 'c2a28fd225e88f74945794ae85aef96001d4a1aaa1022c656f0dd48ac0a3ea0f') {
                    done('Did not done(userID for userName');
                }
                done(); // pass
            }
        })
        .catch(err => ('couldn\'t call endpoint'));
    });
});

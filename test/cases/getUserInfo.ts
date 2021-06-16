import fetch from 'node-fetch';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getUserInfo', () => {
    before(async () => {
        let startOfUserNamesQuery = `INSERT INTO "userNames" ("userID", "userName") VALUES`;
        await db.prepare("run", startOfUserNamesQuery + "('" + getHash("getuserinfo_user_01") + "', 'Username user 01')");
        let startOfSponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES';
        await db.prepare("run", startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000001', '" + getHash("getuserinfo_user_01") + "', 1, 10, 'sponsor', 0)");
        await db.prepare("run", startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000002', '" + getHash("getuserinfo_user_01") + "', 2, 10, 'sponsor', 0)");
        await db.prepare("run", startOfSponsorTimesQuery + "('yyyxxxzzz', 1, 11, -1, 'uuid000003', '" + getHash("getuserinfo_user_01") + "', 3, 10, 'sponsor', 0)");
        await db.prepare("run", startOfSponsorTimesQuery + "('yyyxxxzzz', 1, 11, -2, 'uuid000004', '" + getHash("getuserinfo_user_01") + "', 4, 10, 'sponsor', 1)");
        await db.prepare("run", startOfSponsorTimesQuery + "('xzzzxxyyy', 1, 11, -5, 'uuid000005', '" + getHash("getuserinfo_user_01") + "', 5, 10, 'sponsor', 1)");
        await db.prepare("run", startOfSponsorTimesQuery + "('zzzxxxyyy', 1, 11, 2, 'uuid000006', '" + getHash("getuserinfo_user_02") + "', 6, 10, 'sponsor', 0)");
        await db.prepare("run", startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000007', '" + getHash("getuserinfo_user_02") + "', 7, 10, 'sponsor', 1)");
        await db.prepare("run", startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000008', '" + getHash("getuserinfo_user_02") + "', 8, 10, 'sponsor', 1)");

    
        await db.prepare("run", `INSERT INTO warnings ("userID", "issueTime", "issuerUserID", enabled) VALUES ('` + getHash('getuserinfo_warning_0') + "', 10, 'getuserinfo_vip', 1)");
        await db.prepare("run", `INSERT INTO warnings ("userID", "issueTime", "issuerUserID", enabled) VALUES ('` + getHash('getuserinfo_warning_1') + "', 10, 'getuserinfo_vip', 1)");
        await db.prepare("run", `INSERT INTO warnings ("userID", "issueTime", "issuerUserID", enabled) VALUES ('` + getHash('getuserinfo_warning_1') + "', 10, 'getuserinfo_vip', 1)");
    });

    it('Should be able to get a 200', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_01')
        .then(res => {
            if (res.status !== 200) done('non 200 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => done('couldn\'t call endpoint'));
    });

    it('Should be able to get a 400 (No userID parameter)', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo')
        .then(res => {
            if (res.status !== 400) done('non 400 (' + res.status + ')');
            else done(); // pass
        })
        .catch(err => done('couldn\'t call endpoint'));
    });

    it('Should be able to get user info', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_01')
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
                } else if (data.ignoredViewCount !== 20) {
                    done('Returned incorrect ignoredViewCount "' + data.ignoredViewCount + '"');
                } else if (data.segmentCount !== 3) {
                    done('Returned incorrect segmentCount "' + data.segmentCount + '"');
                } else if (data.ignoredSegmentCount !== 2) {
                    done('Returned incorrect ignoredSegmentCount "' + data.ignoredSegmentCount + '"');
                } else if (Math.abs(data.reputation - -0.928) > 0.001) {
                    done('Returned incorrect reputation "' + data.reputation + '"');
                } else if (data.lastSegmentID !== "uuid000005") {
                    done('Returned incorrect last segment "' + data.lastSegmentID + '"');
                } else {
                    done(); // pass
                }
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should get warning data', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_0')
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

    it('Should get warning data with public ID', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?publicUserID=' + getHash("getuserinfo_warning_0"))
        .then(async res => {
            if (res.status !== 200) {
                done('non 200 (' + res.status + ')');
            } else {
                const data = await res.json();
                if (data.warnings !== 1) done('wrong number of warnings: ' + data.warnings + ', not ' + 1);
                else done();
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });

    it('Should get multiple warnings', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_1')
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

    it('Should not get warnings if none', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_warning_2')
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
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_user_02')
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

    it('Should return null segment if none', (done: Done) => {
        fetch(getbaseURL() + '/api/userInfo?userID=getuserinfo_null')
        .then(async res => {
            if (res.status !== 200) {
                done('non 200 (' + res.status + ')');
            } else {
                const data = await res.json();
                if (data.lastSegmentID !== null) done('returned segment ' + data.warnings + ', not ' + null);
                else done(); // pass
            }
        })
        .catch(err => ("couldn't call endpoint"));
    });
});

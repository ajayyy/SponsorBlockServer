import request from 'request';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {getHash} from '../../src/utils/getHash';

describe('getUserInfo', () => {
    before(() => {
        let startOfUserNamesQuery = "INSERT INTO userNames (userID, userName) VALUES";
        db.exec(startOfUserNamesQuery + "('" + getHash("getuserinfo_user_01") + "', 'Username user 01')");
        let startOfSponsorTimesQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden) VALUES";
        db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000001', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 0)");
        db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000002', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 0)");
        db.exec(startOfSponsorTimesQuery + "('yyyxxxzzz', 1, 11, -1, 'uuid000003', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 0)");
        db.exec(startOfSponsorTimesQuery + "('yyyxxxzzz', 1, 11, -2, 'uuid000004', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 1)");
        db.exec(startOfSponsorTimesQuery + "('xzzzxxyyy', 1, 11, -5, 'uuid000005', '" + getHash("getuserinfo_user_01") + "', 0, 10, 'sponsor', 1)");
        db.exec(startOfSponsorTimesQuery + "('zzzxxxyyy', 1, 11, 2, 'uuid000006', '" + getHash("getuserinfo_user_02") + "', 0, 10, 'sponsor', 0)");
        db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000007', '" + getHash("getuserinfo_user_02") + "', 0, 10, 'sponsor', 1)");
        db.exec(startOfSponsorTimesQuery + "('xxxyyyzzz', 1, 11, 2, 'uuid000008', '" + getHash("getuserinfo_user_02") + "', 0, 10, 'sponsor', 1)");


        db.exec("INSERT INTO warnings (userID, issueTime, issuerUserID) VALUES ('" + getHash('getuserinfo_warning_0') + "', 10, 'getuserinfo_vip')");
        db.exec("INSERT INTO warnings (userID, issueTime, issuerUserID) VALUES ('" + getHash('getuserinfo_warning_1') + "', 10, 'getuserinfo_vip')");
        db.exec("INSERT INTO warnings (userID, issueTime, issuerUserID) VALUES ('" + getHash('getuserinfo_warning_1') + "', 10, 'getuserinfo_vip')");
    });

    it('Should be able to get a 200', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo?userID=getuserinfo_user_01', null,
            (err, res) => {
                if (err) {
                    done('couldn\'t call endpoint');
                } else {
                    if (res.statusCode !== 200) {
                        done('non 200 (' + res.statusCode + ')');
                    } else {
                        done(); // pass
                    }
                }
            });
    });

    it('Should be able to get a 400 (No userID parameter)', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo', null,
            (err, res) => {
                if (err) {
                    done('couldn\'t call endpoint');
                } else {
                    if (res.statusCode !== 400) {
                        done('non 400');
                    } else {
                        done(); // pass
                    }
                }
            });
    });

    it('Should return info', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo?userID=getuserinfo_user_01', null,
            (err, res, body) => {
                if (err) {
                    done("couldn't call endpoint");
                } else {
                    if (res.statusCode !== 200) {
                        done("non 200");
                    } else {
                        const data = JSON.parse(body);
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
                }
            });
    });

    it('Should get warning data', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo?userID=getuserinfo_warning_0', null,
            (err, res, body) => {
                if (err) {
                    done("couldn't call endpoint");
                } else {
                    if (res.statusCode !== 200) {
                        done("non 200");
                    } else {
                        const data = JSON.parse(body);
                        if (data.warnings !== 1) {
                            done('wrong number of warnings: ' + data.warnings + ', not ' + 1);
                        } else {
                            done(); // pass
                        }
                    }
                }
            });
    });

    it('Should get multiple warnings', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo?userID=getuserinfo_warning_1', null,
            (err, res, body) => {
                if (err) {
                    done("couldn't call endpoint");
                } else {
                    if (res.statusCode !== 200) {
                        done("non 200");
                    } else {
                        const data = JSON.parse(body);
                        if (data.warnings !== 2) {
                            done('wrong number of warnings: ' + data.warnings + ', not ' + 2);
                        } else {
                            done(); // pass
                        }
                    }
                }
            });
    });

    it('Should not get warnings if noe', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo?userID=getuserinfo_warning_2', null,
            (err, res, body) => {
                if (err) {
                    done("couldn't call endpoint");
                } else {
                    if (res.statusCode !== 200) {
                        done("non 200");
                    } else {
                        const data = JSON.parse(body);
                        if (data.warnings !== 0) {
                            done('wrong number of warnings: ' + data.warnings + ', not ' + 0);
                        } else {
                            done(); // pass
                        }
                    }
                }
            });
    });

    it('Should return userID for userName (No userName set)', (done: Done) => {
        request.get(getbaseURL()
            + '/api/getUserInfo?userID=getuserinfo_user_02', null,
            (err, res, body) => {
                if (err) {
                    done('couldn\'t call endpoint');
                } else {
                    if (res.statusCode !== 200) {
                        done('non 200');
                    } else {
                        const data = JSON.parse(body);
                        if (data.userName !== 'c2a28fd225e88f74945794ae85aef96001d4a1aaa1022c656f0dd48ac0a3ea0f') {
                            return done('Did not return userID for userName');
                        }
                        done(); // pass
                    }
                }
            });
    });
});

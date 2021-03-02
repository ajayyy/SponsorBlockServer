import fetch from 'node-fetch';
import {config} from '../../src/config';
import {getHash} from '../../src/utils/getHash';
import {Done, getbaseURL} from '../utils';
import {db} from '../../src/databases/databases';
import {ImportMock} from 'ts-mock-imports';
import * as YouTubeAPIModule from '../../src/utils/youtubeApi';
import {YouTubeApiMock} from '../youtubeMock';

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, 'YouTubeAPI');
const sinonStub = mockManager.mock('listVideos');
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe('postSkipSegments', () => {
    before(() => {
        let startOfQuery = "INSERT INTO sponsorTimes (videoID, startTime, endTime, votes, UUID, userID, timeSubmitted, views, category, shadowHidden, hashedVideoID) VALUES";

        db.exec(startOfQuery + "('80percent_video', 0, 1000, 0, '80percent-uuid-0', '" + getHash("test") + "', 0, 0, 'interaction', 0, '80percent_video')");
        db.exec(startOfQuery + "('80percent_video', 1001, 1005, 0, '80percent-uuid-1', '" + getHash("test") + "', 0, 0, 'interaction', 0, '80percent_video')");
        db.exec(startOfQuery + "('80percent_video', 0, 5000, -2, '80percent-uuid-2', '" + getHash("test") + "', 0, 0, 'interaction', 0, '80percent_video')");

        const now = Date.now();
        const warnVip01Hash = getHash("warn-vip01");
        const warnUser01Hash = getHash("warn-user01");
        const warnUser02Hash = getHash("warn-user02");
        const warnUser03Hash = getHash("warn-user03");
        const MILLISECONDS_IN_HOUR = 3600000;
        const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;
        const startOfWarningQuery = 'INSERT INTO warnings (userID, issueTime, issuerUserID, enabled) VALUES';
        db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + now + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + (now - 1000) + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + (now - 2000) + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser01Hash + "', '" + (now - 3601000) + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + now + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + now + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + (now - (warningExpireTime + 1000)) + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser02Hash + "', '" + (now - (warningExpireTime + 2000)) + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser03Hash + "', '" + now + "', '" + warnVip01Hash + "', 0)");
        db.exec(startOfWarningQuery + "('" + warnUser03Hash + "', '" + (now - 1000) + "', '" + warnVip01Hash + "', 0)");
        db.exec(startOfWarningQuery + "('" + warnUser03Hash + "', '" + (now - 2000) + "', '" + warnVip01Hash + "', 1)");
        db.exec(startOfWarningQuery + "('" + warnUser03Hash + "', '" + (now - 3601000) + "', '" + warnVip01Hash + "', 1)");

        db.exec("INSERT INTO vipUsers (userID) VALUES ('" + getHash("VIPUserSubmission") + "')");
    });

    it('Should be able to submit a single time (Params method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcR&startTime=2&endTime=10&userID=test&category=sponsor", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        .then(res => {
            if (res.status === 200) {
                const row = await db.prepare('get', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcR"]);
                if (row.startTime === 2 && row.endTime === 10 && row.category === "sponsor") {
                    done();
                } else {
                    done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be able to submit a single time (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXcF",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(res => {
            if (res.status === 200) {
                const row = await db.prepare('get', "SELECT startTime, endTime, locked, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcF"]);
                if (row.startTime === 0 && row.endTime === 10 && row.locked === 0 && row.category === "sponsor") {
                    done();
                } else {
                    done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('VIP submission should start locked', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "VIPUserSubmission",
                videoID: "vipuserIDSubmission",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(res => {
            if (res.status === 200) {
                const row = await db.prepare('get', "SELECT startTime, endTime, locked, category FROM sponsorTimes WHERE videoID = ?", ["vipuserIDSubmission"]);
                if (row.startTime === 0 && row.endTime === 10 && row.locked === 1 && row.category === "sponsor") {
                    done();
                } else {
                    done("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });
    
    it('Should be able to submit multiple times (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                    userID: "test",
                    videoID: "dQw4w9WgXcQ",
                    segments: [{
                        segment: [3, 10],
                        category: "sponsor",
                    }, {
                        segment: [30, 60],
                        category: "intro",
                    }],
                }),
        })
        .then(res => {
            if (res.status === 200) {
                const rows = await db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ?", ["dQw4w9WgXcR"]);
                let success = true;
                if (rows.length === 2) {
                    for (const row of rows) {
                        if ((row.startTime !== 3 || row.endTime !== 10 || row.category !== "sponsor") &&
                            (row.startTime !== 30 || row.endTime !== 60 || row.category !== "intro")) {
                            success = false;
                            break;
                        }
                    }
                }
                if (success) done();
                else done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    }).timeout(5000);

    it('Should allow multiple times if total is under 80% of video(JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                    userID: "test",
                    videoID: "L_jWHffIx5E",
                    segments: [{
                        segment: [3, 3000],
                        category: "sponsor",
                    }, {
                        segment: [3002, 3050],
                        category: "intro",
                    }, {
                        segment: [45, 100],
                        category: "interaction",
                    }, {
                        segment: [99, 170],
                        category: "sponsor",
                    }],
                }),
        })
        .then(res => {
            if (res.status === 200) {
                const rows = await db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ? and votes > -1", ["L_jWHffIx5E"]);
                let success = true;
                if (rows.length === 4) {
                    for (const row of rows) {
                        if ((row.startTime !== 3 || row.endTime !== 3000 || row.category !== "sponsor") &&
                            (row.startTime !== 3002 || row.endTime !== 3050 || row.category !== "intro") &&
                            (row.startTime !== 45 || row.endTime !== 100 || row.category !== "interaction") &&
                            (row.startTime !== 99 || row.endTime !== 170 || row.category !== "sponsor")) {
                            success = false;
                            break;
                        }
                    }
                }
                if (success) done();
                else done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    }).timeout(5000);

    it('Should reject multiple times if total is over 80% of video (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userID: "test",
                    videoID: "n9rIGdXnSJc",
                    segments: [{
                        segment: [0, 2000],
                        category: "interaction",
                    }, {
                        segment: [3000, 4000],
                        category: "sponsor",
                    }, {
                        segment: [1500, 2750],
                        category: "sponsor",
                    }, {
                        segment: [4050, 4750],
                        category: "intro",
                    }],
                }),
            })
        .then(res => {
            if (res.status === 400) {
                const rows = await db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ? and votes > -1", ["n9rIGdXnSJc"]);
                let success = true;
                if (rows.length === 4) {
                    for (const row of rows) {
                        if ((row.startTime === 0 || row.endTime === 2000 || row.category === "interaction") ||
                            (row.startTime === 3000 || row.endTime === 4000 || row.category === "sponsor") ||
                            (row.startTime === 1500 || row.endTime === 2750 || row.category === "sponsor") ||
                            (row.startTime === 4050 || row.endTime === 4750 || row.category === "intro")) {
                            success = false;
                            break;
                        }
                    }
                }

                if (success) done();
                else
                    done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    }).timeout(5000);

    it('Should reject multiple times if total is over 80% of video including previosuly submitted times(JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "80percent_video",
                segments: [{
                    segment: [2000, 4000],
                    category: "sponsor",
                }, {
                    segment: [1500, 2750],
                    category: "sponsor",
                }, {
                    segment: [4050, 4750],
                    category: "sponsor",
                }],
            }),
        })
        .then(res => {
            if (res.status === 400) {
                const rows = await db.prepare('all', "SELECT startTime, endTime, category FROM sponsorTimes WHERE videoID = ? and votes > -1", ["80percent_video"]);
                let success = rows.length == 2;
                for (const row of rows) {
                    if ((row.startTime === 2000 || row.endTime === 4000 || row.category === "sponsor") ||
                        (row.startTime === 1500 || row.endTime === 2750 || row.category === "sponsor") ||
                        (row.startTime === 4050 || row.endTime === 4750 || row.category === "sponsor")) {
                        success = false;
                        break;
                    }
                }
                if (success) done();
                else
                    done("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    }).timeout(5000);

    it('Should be accepted if a non-sponsor is less than 1 second', (done: Done) => {
        fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing&category=intro", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 200) done(); // pass
            else {
                const body = await res.text();
                done("non 200 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it('Should be rejected if a sponsor is less than 1 second', (done: Done) => {
        fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 400) done(); // pass
            else {
                const body = await res.text();
                done("non 403 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it('Should be rejected if over 80% of the video', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=qqwerty&startTime=30&endTime=1000000&userID=testing")
        .then(async res => {
            if (res.status === 403) done(); // pass
            else {
                const body = await res.text();
                done("non 403 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it("Should be rejected if NB's predicted probability is <70%.", (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=LevkAjUE6d4&startTime=40&endTime=60&userID=testing")
        .then(async res => {
            if (res.status === 200) done(); // pass
            else {
                const body = await res.text();
                done("non 200 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it('Should be rejected if user has to many active warnings', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "warn-user01",
                videoID: "dQw4w9WgXcF",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(res => {
            if (res.status === 403) {
                done(); // success
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should be accepted if user has some active warnings', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                    userID: "warn-user02",
                    videoID: "dQw4w9WgXcF",
                    segments: [{
                        segment: [50, 60],
                        category: "sponsor",
                    }],
                }),
        })
        .then(async res => {
            if (res.status === 200) {
                done(); // success
            } else {
                const body = await res.text();
                done("Status code was " + res.status + " " + body);
            }
        })
        .catch(err => done(err));
    });

    it('Should be accepted if user has some warnings removed', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                    userID: "warn-user03",
                    videoID: "dQw4w9WgXcF",
                    segments: [{
                        segment: [53, 60],
                        category: "sponsor",
                    }],
                }),
        })
        .then(async res => {
            if (res.status === 200) {
                done(); // success
            } else {
                const body = await res.text();
                done("Status code was " + res.status + " " + body);
            }
        })
        .catch(err => done(err));
    });

    it('Should be allowed if youtube thinks duration is 0', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=noDuration&startTime=30&endTime=10000&userID=testing", {
                method: 'POST',
        })
        .then(async res => {
            if (res.status === 200) done(); // pass
            else {
                const body = await res.text();
                done("non 200 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it('Should be rejected if not a valid videoID', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=knownWrongID&startTime=30&endTime=1000000&userID=testing")
        .then(async res => {
            if (res.status === 403) done(); // pass
            else {
                const body = await res.text();
                done("non 403 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(err => done("Couldn't call endpoint"));
    });

    it('Should return 400 for missing params (Params method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?startTime=9&endTime=10&userID=test", {
                method: 'POST',
        })
        .then(res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(err => done(true));
    });

    it('Should return 400 for missing params (JSON method) 1', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                segments: [{
                    segment: [9, 10],
                    category: "sponsor",
                }, {
                    segment: [31, 60],
                    category: "intro",
                }],
            }),
        })
        .then(res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(err => done(true));
    });
    it('Should return 400 for missing params (JSON method) 2', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXcQ",
            }),
        })
        .then(res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(err => done(true));
    });
    it('Should return 400 for missing params (JSON method) 3', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXcQ",
                segments: [{
                    segment: [0],
                    category: "sponsor",
                }, {
                    segment: [31, 60],
                    category: "intro",
                }],
            }),
        })
        .then(res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(err => done(true));
    });
    it('Should return 400 for missing params (JSON method) 4', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXcQ",
                segments: [{
                    segment: [9, 10],
                }, {
                    segment: [31, 60],
                    category: "intro",
                }],
            }),
        })
        .then(res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(err => done(true));
    });
    it('Should return 400 for missing params (JSON method) 5', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXcQ",
            }),
        })
        .then(res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(err => done(true));
    });
});

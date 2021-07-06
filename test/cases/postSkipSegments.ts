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
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.prepare("run", insertSponsorTimeQuery, ['80percent_video', 0, 1000, 0, '80percent-uuid-0', getHash("testtesttesttesttesttesttesttesttest"), 0, 0, 'interaction', 0, '80percent_video']);
        db.prepare("run", insertSponsorTimeQuery, ['80percent_video', 1001, 1005, 0, '80percent-uuid-1', getHash("testtesttesttesttesttesttesttesttest"), 0, 0, 'interaction', 0, '80percent_video']);
        db.prepare("run", insertSponsorTimeQuery, ['80percent_video', 0, 5000, -2, '80percent-uuid-2', getHash("testtesttesttesttesttesttesttesttest"), 0, 0, 'interaction', 0, '80percent_video']);

        const now = Date.now();
        const warnVip01Hash = getHash("warn-vip01-qwertyuiopasdfghjklzxcvbnm");
        const warnUser01Hash = getHash("warn-user01-qwertyuiopasdfghjklzxcvbnm");
        const warnUser02Hash = getHash("warn-user02-qwertyuiopasdfghjklzxcvbnm");
        const warnUser03Hash = getHash("warn-user03-qwertyuiopasdfghjklzxcvbnm");
        const warnUser04Hash = getHash("warn-user04-qwertyuiopasdfghjklzxcvbnm");
        const reason01 = 'Reason01';
        const reason02 = '';
        const reason03 = 'Reason03';
        const reason04 = '';
        const MILLISECONDS_IN_HOUR = 3600000;
        const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issueTime", "issuerUserID", "enabled", "reason") VALUES(?, ?, ?, ?, ?)';
        db.prepare("run", insertWarningQuery, [warnUser01Hash, now, warnVip01Hash, 1, reason01]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 1000), warnVip01Hash, 1, reason01]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 2000), warnVip01Hash, 1, reason01]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 3601000), warnVip01Hash, 1, reason01]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, now, warnVip01Hash, 1, reason02]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, now, warnVip01Hash, 1, reason02]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, (now - (warningExpireTime + 1000)), warnVip01Hash, 1, reason02]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, (now - (warningExpireTime + 2000)), warnVip01Hash, 1, reason02]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, now, warnVip01Hash, 0, reason03]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, (now - 1000), warnVip01Hash, 0, reason03]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, (now - 2000), warnVip01Hash, 1, reason03]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, (now - 3601000), warnVip01Hash, 1, reason03]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, now, warnVip01Hash, 0, reason04]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, (now - 1000), warnVip01Hash, 0, reason04]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, (now - 2000), warnVip01Hash, 1, reason04]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, (now - 3601000), warnVip01Hash, 1, reason04]);

        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        db.prepare("run", insertVipUserQuery, [getHash("VIPUserSubmissionVIPUserSubmissionVIPUserSubmission")]);
    });

    it('Should be able to submit a single time (Params method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcR&startTime=2&endTime=10&userID=testtesttesttesttesttesttesttesttest&category=sponsor", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcR"]);
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
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXcF",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcF"]);
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

    it('Should be able to submit a single time with an action type (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXcV",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                    actionType: "mute"
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "actionType" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcV"]);
                if (row.startTime === 0 && row.endTime === 10 && row.locked === 0 && row.category === "sponsor" && row.actionType === "mute") {
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

    it('Should be able to submit a single time with a duration from the YouTube API (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXZX",
                videoDuration: 100,
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXZX"]);
                if (row.startTime === 0 && row.endTime === 10 && row.locked === 0 && row.category === "sponsor" && row.videoDuration === 4980) {
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

    it('Should be able to submit a single time with a precise duration close to the one from the YouTube API (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXZH",
                videoDuration: 4980.20,
                segments: [{
                    segment: [1, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXZH"]);
                if (row.startTime === 1 && row.endTime === 10 && row.locked === 0 && row.category === "sponsor" && row.videoDuration === 4980.20) {
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

    it('Should be able to submit a single time with a duration in the body (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "noDuration",
                videoDuration: 100,
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, ["noDuration"]);
                if (row.startTime === 0 && row.endTime === 10 && row.locked === 0 && row.category === "sponsor" && row.videoDuration === 100) {
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

    it('Should be able to submit with a new duration, and hide old submissions and remove segment locks', async () => {
        await db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category") 
            VALUES(?, ?, ?)`, [getHash("VIPUser-lockCategories"), 'noDuration', 'sponsor']);

        try {
            const res = await fetch(getbaseURL()
                + "/api/postVideoSponsorTimes", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userID: "testtesttesttesttesttesttesttesttest",
                    videoID: "noDuration",
                    videoDuration: 100,
                    segments: [{
                        segment: [1, 10],
                        category: "sponsor",
                    }],
                }),
            });

            if (res.status === 200) {
                const lockCategoriesRow = await db.prepare('get', `SELECT * from "lockCategories" WHERE videoID = ?`, ["noDuration"]);
                const videoRows = await db.prepare('all', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" 
                    FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 0`, ["noDuration"]);
                const videoRow = videoRows[0];
                const hiddenVideoRows = await db.prepare('all', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" 
                    FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 1`, ["noDuration"]);
                if (lockCategoriesRow === undefined && videoRows.length === 1 && hiddenVideoRows.length === 1 && videoRow.startTime === 1 && videoRow.endTime === 10 
                        && videoRow.locked === 0 && videoRow.category === "sponsor" && videoRow.videoDuration === 100) {
                    return;
                } else {
                    return "Submitted times were not saved. Actual submission: " + JSON.stringify(videoRow);
                }
            } else {
                return "Status code was " + res.status;
            }
        } catch (e) {
            return e;
        }
    });

    it('Should still not be allowed if youtube thinks duration is 0', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=noDuration&startTime=30&endTime=10000&userID=testtesttesttesttesttesttesttesttesting", {
                method: 'POST',
        })
        .then(async res => {
            if (res.status === 403) done(); // pass
            else {
                const body = await res.text();
                done("non 403 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be able to submit a single time under a different service (JSON method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXcG",
                service: "PeerTube",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "service" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcG"]);
                if (row.startTime === 0 && row.endTime === 10 && row.locked === 0 && row.category === "sponsor" && row.service === "PeerTube") {
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
                userID: "VIPUserSubmissionVIPUserSubmissionVIPUserSubmission",
                videoID: "vipuserIDSubmission",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 200) {
                const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["vipuserIDSubmission"]);
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
                    userID: "testtesttesttesttesttesttesttesttest",
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
        .then(async res => {
            if (res.status === 200) {
                const rows = await db.prepare('all', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcR"]);
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
                    userID: "testtesttesttesttesttesttesttesttest",
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
        .then(async res => {
            if (res.status === 200) {
                const rows = await db.prepare('all', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ? and "votes" > -1`, ["L_jWHffIx5E"]);
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
                    userID: "testtesttesttesttesttesttesttesttest",
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
        .then(async res => {
            if (res.status === 403) {
                const rows = await db.prepare('all', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ? and "votes" > -1`, ["n9rIGdXnSJc"]);
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
                userID: "testtesttesttesttesttesttesttesttest",
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
        .then(async res => {
            if (res.status === 403) {
                const rows = await db.prepare('all', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ? and "votes" > -1`, ["80percent_video"]);
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
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testtesttesttesttesttesttesttesttesting&category=intro", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 200) done(); // pass
            else {
                const body = await res.text();
                done("non 200 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be rejected if segment starts and ends at the same time', (done: Done) => {
        fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=90&endTime=90&userID=testtesttesttesttesttesttesttesttesting&category=intro", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 400) done(); // pass
            else {
                const body = await res.text();
                done("non 400 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be accepted if highlight segment starts and ends at the same time', (done: Done) => {
        fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30&userID=testtesttesttesttesttesttesttesttesting&category=highlight", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 200) done(); // pass
            else {
                const body = await res.text();
                done("non 200 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be rejected if highlight segment doesn\'t start and end at the same time', (done: Done) => {
        fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testtesttesttesttesttesttesttesttesting&category=highlight", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 400) done(); // pass
            else {
                const body = await res.text();
                done("non 400 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be rejected if a sponsor is less than 1 second', (done: Done) => {
        fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testtesttesttesttesttesttesttesttesting", {
            method: 'POST',
        })
        .then(async res => {
            if (res.status === 400) done(); // pass
            else {
                const body = await res.text();
                done("non 403 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be rejected if over 80% of the video', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=qqwerty&startTime=30&endTime=1000000&userID=testtesttesttesttesttesttesttesttesting")
        .then(async res => {
            if (res.status === 403) done(); // pass
            else {
                const body = await res.text();
                done("non 403 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it("Should be rejected if NB's predicted probability is <70%.", (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=LevkAjUE6d4&startTime=40&endTime=60&userID=testtesttesttesttesttesttesttesttesting")
        .then(async res => {
            if (res.status === 200) done(); // pass
            else {
                const body = await res.text();
                done("non 200 status code: " + res.status + " (" + body + ")");
            }
        })
        .catch(() => done("Couldn't call endpoint"));
    });

    it('Should be rejected with custom message if user has to many active warnings', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "warn-user01-qwertyuiopasdfghjklzxcvbnm",
                videoID: "dQw4w9WgXcF",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 403) {
                const errorMessage = await res.text();
                if (errorMessage === 'Reason01') {
                    done(); // success
                } else {
                    done("Status code was 403 but message was: " + errorMessage);
                }
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
                    userID: "warn-user02-qwertyuiopasdfghjklzxcvbnm",
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
                    userID: "warn-user03-qwertyuiopasdfghjklzxcvbnm",
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

    it('Should return 400 for missing params (Params method)', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?startTime=9&endTime=10&userID=testtesttesttesttesttesttesttesttest", {
                method: 'POST',
        })
        .then(async res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(() => done(true));
    });

    it('Should be rejected with default message if user has to many active warnings', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "warn-user01-qwertyuiopasdfghjklzxcvbnm",
                videoID: "dQw4w9WgXcF",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 403) {
                const errorMessage = await res.text();
                if (errorMessage !== '') {
                    done(); // success
                } else {
                    done("Status code was 403 but message was: " + errorMessage);
                }
            } else {
                done("Status code was " + res.status);
            }
        })
        .catch(err => done(err));
    });

    it('Should return 400 for missing params (JSON method) 1', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                segments: [{
                    segment: [9, 10],
                    category: "sponsor",
                }, {
                    segment: [31, 60],
                    category: "intro",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(() => done(true));
    });
    it('Should return 400 for missing params (JSON method) 2', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXcQ",
            }),
        })
        .then(async res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(() => done(true));
    });
    it('Should return 400 for missing params (JSON method) 3', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
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
        .then(async res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(() => done(true));
    });
    it('Should return 400 for missing params (JSON method) 4', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXcQ",
                segments: [{
                    segment: [9, 10],
                }, {
                    segment: [31, 60],
                    category: "intro",
                }],
            }),
        })
        .then(async res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(() => done(true));
    });
    it('Should return 400 for missing params (JSON method) 5', (done: Done) => {
        fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "testtesttesttesttesttesttesttesttest",
                videoID: "dQw4w9WgXcQ",
            }),
        })
        .then(async res => {
            if (res.status === 400) done();
            else done(true);
        })
        .catch(() => done(true));
    });
});

import fetch from 'node-fetch';
import {config} from '../../src/config';
import {getHash} from '../../src/utils/getHash';
import {getbaseURL} from '../utils';
import {ImportMock} from 'ts-mock-imports';
import * as YouTubeAPIModule from '../../src/utils/youtubeApi';
import {YouTubeApiMock} from '../youtubeMock';
import {IDatabase} from "../../src/databases/IDatabase";

declare const db: IDatabase

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, 'YouTubeAPI');
const sinonStub = mockManager.mock('listVideos');
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe('postSkipSegments', () => {
    beforeAll(() => {
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.prepare("run", insertSponsorTimeQuery, ['80percent_video', 0, 1000, 0, '80percent-uuid-0', getHash("test"), 0, 0, 'interaction', 0, '80percent_video']);
        db.prepare("run", insertSponsorTimeQuery, ['80percent_video', 1001, 1005, 0, '80percent-uuid-1', getHash("test"), 0, 0, 'interaction', 0, '80percent_video']);
        db.prepare("run", insertSponsorTimeQuery, ['80percent_video', 0, 5000, -2, '80percent-uuid-2', getHash("test"), 0, 0, 'interaction', 0, '80percent_video']);

        const now = Date.now();
        const warnVip01Hash = getHash("warn-vip01");
        const warnUser01Hash = getHash("warn-user01");
        const warnUser02Hash = getHash("warn-user02");
        const warnUser03Hash = getHash("warn-user03");
        const MILLISECONDS_IN_HOUR = 3600000;
        const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issueTime", "issuerUserID", "enabled") VALUES(?, ?, ?, ?)';
        db.prepare("run", insertWarningQuery, [warnUser01Hash, now, warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 1000), warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 2000), warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, (now - 3601000), warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, now, warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, now, warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, (now - (warningExpireTime + 1000)), warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, (now - (warningExpireTime + 2000)), warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, now, warnVip01Hash, 0]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, (now - 1000), warnVip01Hash, 0]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, (now - 2000), warnVip01Hash, 1]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, (now - 3601000), warnVip01Hash, 1]);

        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        db.prepare("run", insertVipUserQuery, [getHash("VIPUserSubmission")]);
    });

    it('Should be able to submit a single time (Params method)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=dQw4w9WgXcR&startTime=2&endTime=10&userID=test&category=sponsor", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcR"]);
            if (row.startTime !== 2 || row.endTime !== 10 || row.category !== "sponsor") {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit a single time (JSON method)', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcF"]);
            if (row.startTime !== 0 || row.endTime !== 10 || row.locked !== 0 || row.category !== "sponsor") {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit a single time with a duration from the YouTube API (JSON method)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXZX",
                videoDuration: 100,
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXZX"]);
            if (row.startTime !== 0 || row.endTime !== 10 || row.locked !== 0 || row.category !== "sponsor" || row.videoDuration !== 4980) {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit a single time with a precise duration close to the one from the YouTube API (JSON method)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXZH",
                videoDuration: 4980.20,
                segments: [{
                    segment: [1, 10],
                    category: "sponsor",
                }],
            }),
        })
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXZH"]);
            if (row.startTime !== 1 || row.endTime !== 10 || row.locked !== 0 || row.category !== "sponsor" || row.videoDuration !== 4980.20) {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit a single time with a duration in the body (JSON method)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "noDuration",
                videoDuration: 100,
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, ["noDuration"]);
            if (row.startTime !== 0 || row.endTime !== 10 || row.locked !== 0 || row.category !== "sponsor" || row.videoDuration !== 100) {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit with a new duration, and hide old submissions and remove segment locks', async () => {
        await db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category") 
            VALUES(?, ?, ?)`, [getHash("VIPUser-lockCategories"), 'noDuration', 'sponsor']);

        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
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
            if (lockCategoriesRow !== undefined || videoRows.length !== 1 || hiddenVideoRows.length !== 1 || videoRow.startTime !== 1 || videoRow.endTime !== 10
                || videoRow.locked !== 0 || videoRow.category !== "sponsor" || videoRow.videoDuration !== 100) {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(videoRow));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should still not be allowed if youtube thinks duration is 0', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=noDuration&startTime=30&endTime=10000&userID=testing", {
                method: 'POST',
        })
        if (res.status !== 403) {
            const body = await res.text();
            throw new Error("non 403 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be able to submit a single time under a different service (JSON method)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: "test",
                videoID: "dQw4w9WgXcG",
                service: "PeerTube",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }),
        })
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category", "service" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcG"]);
            if (row.startTime !== 0 || row.endTime !== 10 || row.locked !== 0 || row.category !== "sponsor" || row.service !== "PeerTube") {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('VIP submission should start locked', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status === 200) {
            const row = await db.prepare('get', `SELECT "startTime", "endTime", "locked", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["vipuserIDSubmission"]);
            if (row.startTime !== 0 || row.endTime !== 10 || row.locked !== 1 || row.category !== "sponsor") {
                throw new Error("Submitted times were not saved. Actual submission: " + JSON.stringify(row));
            }
        } else {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be able to submit multiple times (JSON method)', async () => {
        const res = await fetch(getbaseURL()
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
            if (!success)
                throw new Error("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
            throw new Error("Status code was " + res.status);
        }
    }, 5000);

    it('Should allow multiple times if total is under 80% of video(JSON method)', async () => {
        const res = await fetch(getbaseURL()
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
            if (!success)
                throw new Error("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
            throw new Error("Status code was " + res.status);
        }
    }, 5000);

    it('Should reject multiple times if total is over 80% of video (JSON method)', async () => {
        const res = await fetch(getbaseURL()
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

            if (!success)
                throw new Error("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
            throw new Error("Status code was " + res.status);
        }
    }, 5000);

    it('Should reject multiple times if total is over 80% of video including previosuly submitted times(JSON method)', async () => {
        const res = await fetch(getbaseURL()
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
            if (!success)
                throw new Error("Submitted times were not saved. Actual submissions: " + JSON.stringify(rows));
        } else {
            throw new Error("Status code was " + res.status);
        }
    }, 5000);

    it('Should be accepted if a non-sponsor is less than 1 second', async () => {
        const res = await fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing&category=intro", {
            method: 'POST',
        })
        if (res.status !== 200) {
            const body = await res.text();
            throw new Error("non 200 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be rejected if segment starts and ends at the same time', async () => {
        const res = await fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=90&endTime=90&userID=testing&category=intro", {
            method: 'POST',
        })
        if (res.status !== 400) {
            const body = await res.text();
            throw new Error("non 400 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be accepted if highlight segment starts and ends at the same time', async () => {
        const res = await fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30&userID=testing&category=highlight", {
            method: 'POST',
        })
        if (res.status !== 200) {
            const body = await res.text();
            throw new Error("non 200 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be rejected if highlight segment doesn\'t start and end at the same time', async () => {
        const res = await fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing&category=highlight", {
            method: 'POST',
        })
        if (res.status !== 400) {
            const body = await res.text();
            throw new Error("non 400 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be rejected if a sponsor is less than 1 second', async () => {
        const res = await fetch(getbaseURL()
            + "/api/skipSegments?videoID=qqwerty&startTime=30&endTime=30.5&userID=testing", {
            method: 'POST',
        })
        if (res.status !== 400) {
            const body = await res.text();
            throw new Error("non 403 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be rejected if over 80% of the video', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=qqwerty&startTime=30&endTime=1000000&userID=testing")
        if (res.status !== 403) {
            const body = await res.text();
            throw new Error("non 403 status code: " + res.status + " (" + body + ")");
        }
    });

    it("Should be rejected if NB's predicted probability is <70%.", async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?videoID=LevkAjUE6d4&startTime=40&endTime=60&userID=testing")
        if (res.status !== 200) {
            const body = await res.text();
            throw new Error("non 200 status code: " + res.status + " (" + body + ")");
        }
    });

    it('Should be rejected if user has to many active warnings', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 403) {
            throw new Error("Status code was " + res.status);
        }
    });

    it('Should be accepted if user has some active warnings', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 200) {
            const body = await res.text();
            throw new Error("Status code was " + res.status + " " + body);
        }
    });

    it('Should be accepted if user has some warnings removed', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 200) {
            const body = await res.text();
            throw new Error("Status code was " + res.status + " " + body);
        }
    });

    it('Should return 400 for missing params (Params method)', async () => {
        const res = await fetch(getbaseURL()
            + "/api/postVideoSponsorTimes?startTime=9&endTime=10&userID=test", {
                method: 'POST',
        })
        if (res.status !== 400) throw new Error("Status code was " + res.status)
    });

    it('Should return 400 for missing params (JSON method) 1', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 400) throw new Error("Status code was " + res.status)
    });
    it('Should return 400 for missing params (JSON method) 2', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 400) throw new Error("Status code was " + res.status)
    });
    it('Should return 400 for missing params (JSON method) 3', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 400) throw new Error("Status code was " + res.status)
    });
    it('Should return 400 for missing params (JSON method) 4', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 400) throw new Error("Status code was " + res.status)
    });
    it('Should return 400 for missing params (JSON method) 5', async () => {
        const res = await fetch(getbaseURL()
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
        if (res.status !== 400) throw new Error("Status code was " + res.status)
    });
});

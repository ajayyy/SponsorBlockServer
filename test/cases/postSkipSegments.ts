import { config } from "../../src/config";
import { getHash } from "../../src/utils/getHash";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../youtubeMock";
import assert from "assert";
import { client } from "../utils/httpClient";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("postSkipSegments", () => {
// Constant and helpers
    const submitUserOne = `PostSkipUser1${".".repeat(18)}`;
    const submitUserTwo = `PostSkipUser2${".".repeat(18)}`;
    const submitUserThree = `PostSkipUser3${".".repeat(18)}`;

    const warnUser01 = "warn-user01-qwertyuiopasdfghjklzxcvbnm";
    const warnUser01Hash = getHash(warnUser01);
    const warnUser02 = "warn-user02-qwertyuiopasdfghjklzxcvbnm";
    const warnUser02Hash = getHash(warnUser02);
    const warnUser03 = "warn-user03-qwertyuiopasdfghjklzxcvbnm";
    const warnUser03Hash = getHash(warnUser03);
    const warnUser04 = "warn-user04-qwertyuiopasdfghjklzxcvbnm";
    const warnUser04Hash = getHash(warnUser04);

    const submitUserOneHash = getHash(submitUserOne);
    const submitVIPuser = `VIPPostSkipUser${".".repeat(16)}`;
    const warnVideoID = "dQw4w9WgXcF";
    const badInputVideoID = "dQw4w9WgXcQ";

    const queryDatabase = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseActionType = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "actionType" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseDuration = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseVideoInfo = (videoID: string) => db.prepare("get", `SELECT * FROM "videoInfo" WHERE "videoID" = ?`, [videoID]);

    const endpoint = "/api/skipSegments";
    const postSkipSegmentJSON = (data: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        data
    });
    const postSkipSegmentParam = (params: Record<string, any>) => client({
        method: "POST",
        url: endpoint,
        params
    });

    before(() => {
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.prepare("run", insertSponsorTimeQuery, ["80percent_video", 0, 1000, 0, "80percent-uuid-0", submitUserOneHash, 0, 0, "interaction", 0, "80percent_video"]);
        db.prepare("run", insertSponsorTimeQuery, ["80percent_video", 1001, 1005, 0, "80percent-uuid-1", submitUserOneHash, 0, 0, "interaction", 0, "80percent_video"]);
        db.prepare("run", insertSponsorTimeQuery, ["80percent_video", 0, 5000, -2, "80percent-uuid-2", submitUserOneHash, 0, 0, "interaction", 0, "80percent_video"]);

        const now = Date.now();
        const warnVip01Hash = getHash("warn-vip01-qwertyuiopasdfghjklzxcvbnm");
        const reason01 = "Reason01";
        const reason02 = "";
        const reason03 = "Reason03";
        const reason04 = "";
        const MILLISECONDS_IN_HOUR = 3600000;
        const warningExpireTime = MILLISECONDS_IN_HOUR * config.hoursAfterWarningExpires;

        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime") VALUES(?, ?, ?, ?, ?)';
        // User 1
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, now]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, (now - 1000)]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, (now - 2000)]);
        db.prepare("run", insertWarningQuery, [warnUser01Hash, warnVip01Hash, 1, reason01, (now - 3601000)]);
        // User 2
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, now]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, now]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, (now - (warningExpireTime + 1000))]);
        db.prepare("run", insertWarningQuery, [warnUser02Hash, warnVip01Hash, 1, reason02, (now - (warningExpireTime + 2000))]);
        // User 3
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 0, reason03, now]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 0, reason03, (now - 1000)]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 1, reason03, (now - 2000)]);
        db.prepare("run", insertWarningQuery, [warnUser03Hash, warnVip01Hash, 1, reason03, (now - 3601000)]);
        // User 4
        db.prepare("run", insertWarningQuery, [warnUser04Hash, warnVip01Hash, 0, reason04, now]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, warnVip01Hash, 0, reason04, (now - 1000)]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, warnVip01Hash, 1, reason04, (now - 2000)]);
        db.prepare("run", insertWarningQuery, [warnUser04Hash, warnVip01Hash, 1, reason04, (now - 3601000)]);

        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        db.prepare("run", insertVipUserQuery, [getHash(submitVIPuser)]);
    });

    it("Should be able to submit a single time (Params method)", (done) => {
        const videoID = "dQw4w9WgXcR";
        postSkipSegmentParam({
            videoID,
            startTime: 2,
            endTime: 10,
            userID: submitUserOne,
            category: "sponsor"
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(videoID);
                const expected = {
                    startTime: 2,
                    endTime: 10,
                    category: "sponsor",
                };
                assert.ok(partialDeepEquals(row, expected));

                const videoInfo = await queryDatabaseVideoInfo(videoID);
                const expectedVideoInfo = {
                    videoID,
                    title: "Example Title",
                    channelID: "ExampleChannel",
                    published: 123,
                    genreUrl: ""
                };
                assert.ok(partialDeepEquals(videoInfo, expectedVideoInfo));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time (JSON method)", (done) => {
        const videoID = "dQw4w9WgXcF";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    locked: 0,
                    category: "sponsor",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time with an action type (JSON method)", (done) => {
        const videoID = "dQw4w9WgXcV";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
                actionType: "mute"
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseActionType(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    category: "sponsor",
                    actionType: "mute",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit an intro with mute action type (JSON method)", (done) => {
        const videoID = "dQw4w9WgXpQ";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "intro",
                actionType: "mute"
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 400);
                const row = await queryDatabaseActionType(videoID);
                assert.strictEqual(row, undefined);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time with a duration from the YouTube API (JSON method)", (done) => {
        const videoID = "dQw4w9WgXZX";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            videoDuration: 100,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseDuration(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    category: "sponsor",
                    videoDuration: 4980,
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time with a precise duration close to the one from the YouTube API (JSON method)", (done) => {
        const videoID = "dQw4w9WgXZH";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            videoDuration: 4980.20,
            segments: [{
                segment: [1, 10],
                category: "sponsor",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseDuration(videoID);
                const expected = {
                    startTime: 1,
                    endTime: 10,
                    locked: 0,
                    category: "sponsor",
                    videoDuration: 4980.20,
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time with a duration in the body (JSON method)", (done) => {
        const videoID = "noDuration";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            videoDuration: 100,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseDuration(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    locked: 0,
                    category: "sponsor",
                    videoDuration: 100,
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with a new duration, and hide old submissions and remove segment locks", async () => {
        const videoID = "noDuration";
        await db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category")
            VALUES(?, ?, ?)`, [getHash("VIPUser-lockCategories"), videoID, "sponsor"]);

        try {
            const res = await postSkipSegmentJSON({
                userID: submitUserOne,
                videoID,
                videoDuration: 100,
                segments: [{
                    segment: [1, 10],
                    category: "sponsor",
                }],
            });
            assert.strictEqual(res.status, 200);
            const lockCategoriesRow = await db.prepare("get", `SELECT * from "lockCategories" WHERE videoID = ?`, [videoID]);
            const videoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "videoDuration"
                FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 0`, [videoID]);
            const hiddenVideoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "videoDuration"
                FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 1`, [videoID]);
            assert.ok(!lockCategoriesRow);
            const expected = {
                startTime: 1,
                endTime: 10,
                locked: 0,
                category: "sponsor",
                videoDuration: 100,
            };
            assert.ok(partialDeepEquals(videoRows[0], expected));
            assert.strictEqual(videoRows.length, 1);
            assert.strictEqual(hiddenVideoRows.length, 1);
        } catch (e) {
            return e;
        }
    });

    it("Should still not be allowed if youtube thinks duration is 0", (done) => {
        const videoID= "noDuration";
        postSkipSegmentJSON({
            userID: submitUserThree,
            videoID,
            videoDuration: 100,
            segments: [{
                segment: [30, 10000],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time under a different service (JSON method)", (done) => {
        const videoID = "dQw4w9WgXcG";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            service: "PeerTube",
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "service" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    locked: 0,
                    category: "sponsor",
                    service: "PeerTube",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("VIP submission should start locked", (done) => {
        const videoID = "vipuserIDSubmission";
        postSkipSegmentJSON({
            userID: submitVIPuser,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    locked: 1,
                    category: "sponsor",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit multiple times (JSON method)", (done) => {
        const videoID = "dQw4w9WgXcT";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            segments: [{
                segment: [3, 10],
                category: "sponsor",
            }, {
                segment: [30, 60],
                category: "intro",
            }],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const rows = await db.prepare("all", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
                const expected = [{
                    startTime: 3,
                    endTime: 10,
                    category: "sponsor"
                }, {
                    startTime: 30,
                    endTime: 60,
                    category: "intro"
                }];
                assert.deepStrictEqual(rows, expected);
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);

    it("Should allow multiple times if total is under 80% of video(JSON method)", (done) => {
        const videoID = "L_jWHffIx5E";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
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
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const rows = await db.prepare("all", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ? and "votes" > -1`, [videoID]);
                const expected = [{
                    startTime: 3,
                    endTime: 3000,
                    category: "sponsor"
                }, {
                    startTime: 3002,
                    endTime: 3050,
                    category: "intro"
                }, {
                    startTime: 45,
                    endTime: 100,
                    category: "interaction"
                }, {
                    startTime: 99,
                    endTime: 170,
                    category: "sponsor"
                }];
                assert.deepStrictEqual(rows, expected);
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);

    it("Should reject multiple times if total is over 80% of video (JSON method)", (done) => {
        const videoID = "n9rIGdXnSJc";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
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
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const rows = await db.prepare("all", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ? and "votes" > -1`, [videoID]);
                assert.deepStrictEqual(rows, []);
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);

    it("Should reject multiple times if total is over 80% of video including previosuly submitted times(JSON method)", (done) => {
        const videoID = "80percent_video";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
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
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const expected = [{
                    category: "sponsor",
                    startTime: 2000,
                    endTime: 4000
                }, {
                    category: "sponsor",
                    startTime: 1500,
                    endTime: 2750
                }, {
                    category: "sponsor",
                    startTime: 4050,
                    endTime: 4750
                }];
                const rows = await queryDatabase(videoID);
                assert.notDeepStrictEqual(rows, expected);
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);

    it("Should be accepted if a non-sponsor is less than 1 second", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30.5,
            userID: submitUserTwo,
            category: "intro"
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if segment starts and ends at the same time", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 90,
            endTime: 90,
            userID: submitUserTwo,
            category: "intro"
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be accepted if highlight segment starts and ends at the same time", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30,
            userID: submitUserTwo,
            category: "poi_highlight"
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if highlight segment doesn't start and end at the same time", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30.5,
            userID: submitUserTwo,
            category: "poi_highlight"
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if a sponsor is less than 1 second", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30.5,
            userID: submitUserTwo
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if over 80% of the video", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 1000000,
            userID: submitUserTwo,
            category: "sponsor"
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if NB's predicted probability is <70%.", (done) => {
        const videoID = "LevkAjUE6d4";
        postSkipSegmentParam({
            videoID,
            startTime: 40,
            endTime: 60,
            userID: submitUserTwo,
            category: "sponsor"
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected with custom message if user has to many active warnings", (done) => {
        postSkipSegmentJSON({
            userID: warnUser01,
            videoID: warnVideoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                const errorMessage = res.data;
                const reason = "Reason01";
                const expected = "Submission rejected due to a warning from a moderator. This means that we noticed you were making some common mistakes"
                + " that are not malicious, and we just want to clarify the rules. "
                + "Could you please send a message in discord.gg/SponsorBlock or matrix.to/#/#sponsor:ajay.app so we can further help you? "
                + `Your userID is ${warnUser01Hash}.\n\nWarning reason: '${reason}'`;

                assert.strictEqual(errorMessage, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be accepted if user has some active warnings", (done) => {
        postSkipSegmentJSON({
            userID: warnUser02,
            videoID: warnVideoID,
            segments: [{
                segment: [50, 60],
                category: "sponsor",
            }],
        })
            .then(res => {
                if (res.status === 200) {
                    done(); // success
                } else {
                    done(`Status code was ${res.status} ${res.data}`);
                }
            })
            .catch(err => done(err));
    });

    it("Should be accepted if user has some warnings removed", (done) => {
        postSkipSegmentJSON({
            userID: warnUser03,
            videoID: warnVideoID,
            segments: [{
                segment: [53, 60],
                category: "sponsor",
            }],
        })
            .then(res => {
                if (res.status === 200) {
                    done(); // success
                } else {
                    done(`Status code was ${res.status} ${res.data}`);
                }
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (Params method)", (done) => {
        postSkipSegmentParam({
            startTime: 9,
            endTime: 10,
            userID: submitUserOne
        })
            .then(res => {
                if (res.status === 400) done();
                else done(true);
            })
            .catch(err => done(err));
    });

    it("Should be rejected with default message if user has to many active warnings", (done) => {
        postSkipSegmentJSON({
            userID: warnUser01,
            videoID: warnVideoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                const errorMessage = res.data;
                assert.notStrictEqual(errorMessage, "");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 1", (done) => {
        postSkipSegmentJSON({
            userID: submitUserOne,
            segments: [{
                segment: [9, 10],
                category: "sponsor",
            }, {
                segment: [31, 60],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 for missing params (JSON method) 2", (done) => {
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID: badInputVideoID,
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("Should return 400 for missing params (JSON method) 3", (done) => {
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID: badInputVideoID,
            segments: [{
                segment: [0],
                category: "sponsor",
            }, {
                segment: [31, 60],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 4", (done) => {
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID: badInputVideoID,
            segments: [{
                segment: [9, 10],
            }, {
                segment: [31, 60],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params (JSON method) 5", (done) => {
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID: badInputVideoID,
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 403 and custom reason for submiting in lockedCategory", (done) => {
        const videoID = "lockedVideo";
        db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason")
            VALUES(?, ?, ?, ?)`, [getHash("VIPUser-lockCategories"), videoID, "sponsor", "Custom Reason"])
            .then(() => postSkipSegmentJSON({
                userID: submitUserOne,
                videoID,
                segments: [{
                    segment: [1, 10],
                    category: "sponsor",
                }],
            }))
            .then(res => {
                assert.strictEqual(res.status, 403);
                assert.match(res.data, /Lock reason: /);
                assert.match(res.data, /Custom Reason/);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 403 for submiting in lockedCategory", (done) => {
        const videoID = "lockedVideo1";
        db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") 
            VALUES(?, ?, ?, ?)`, [getHash("VIPUser-lockCategories"), videoID, "intro", ""])
            .then(() => postSkipSegmentJSON({
                userID: submitUserOne,
                videoID,
                segments: [{
                    segment: [1, 10],
                    category: "intro",
                }],
            }))
            .then(res => {
                assert.strictEqual(res.status, 403);
                assert.doesNotMatch(res.data, /Lock reason: /);
                assert.doesNotMatch(res.data, /Custom Reason/);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with custom user-agent 1", (done) => {
        client({
            url: endpoint,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.youtube/5.0"
            },
            data: {
                userID: submitUserOne,
                videoID: "userAgent-1",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "userAgent" FROM "sponsorTimes" WHERE "videoID" = ?`, ["userAgent-1"]);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    userAgent: "Vanced/5.0",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with empty user-agent", (done) => {
        client({
            url: endpoint,
            method: "POST",
            data: {
                userID: submitUserOne,
                videoID: "userAgent-3",
                segments: [{
                    segment: [0, 10],
                    category: "sponsor",
                }],
                userAgent: "",
            }
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "userAgent" FROM "sponsorTimes" WHERE "videoID" = ?`, ["userAgent-3"]);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    userAgent: "",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with custom userAgent in body", (done) => {
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID: "userAgent-4",
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
            userAgent: "MeaBot/5.0"
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "userAgent" FROM "sponsorTimes" WHERE "videoID" = ?`, ["userAgent-4"]);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    userAgent: "MeaBot/5.0",
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with commas in timestamps", (done) => {
        const videoID = "commas-1";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            segments: [{
                segment: ["0,2", "10,392"],
                category: "sponsor",
            }]
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(videoID);
                const expected = {
                    startTime: 0.2,
                    endTime: 10.392
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be rejected if a POI is at less than 1 second", (done) => {
        const videoID = "qqwerty";
        postSkipSegmentParam({
            videoID,
            startTime: 0.5,
            endTime: 0.5,
            category: "poi_highlight",
            userID: submitUserTwo
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit with colons in timestamps", (done) => {
        const videoID = "colon-1";
        postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            segments: [{
                segment: ["0:2.000", "3:10.392"],
                category: "sponsor",
            }]
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

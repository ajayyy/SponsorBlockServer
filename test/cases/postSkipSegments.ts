import { getHash } from "../../src/utils/getHash";
import { partialDeepEquals, arrayDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../mocks/youtubeMock";
import assert from "assert";
import { client } from "../utils/httpClient";

export type Segment = {
    segment: number[];
    category: string;
    actionType?: string;
    description?: string;
};

const endpoint = "/api/skipSegments";
export const postSkipSegmentJSON = (data: Record<string, any>) => client({
    method: "POST",
    url: endpoint,
    data
});
export const postSkipSegmentParam = (params: Record<string, any>) => client({
    method: "POST",
    url: endpoint,
    params
});
export const convertMultipleToDBFormat = (segments: Segment[]) =>
    segments.map(segment => convertSingleToDBFormat(segment));

export const convertSingleToDBFormat = (segment: Segment) => ({
    startTime: segment.segment[0],
    endTime: segment.segment[1],
    category: segment.category,
});

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("postSkipSegments", () => {
    // Constant and helpers
    const submitUserOne = `PostSkipUser1${".".repeat(18)}`;
    const submitUserTwo = `PostSkipUser2${".".repeat(18)}`;
    const submitUserTwoHash = getHash(submitUserTwo);
    const submitUserThree = `PostSkipUser3${".".repeat(18)}`;

    const banUser01 = "ban-user01-loremipsumdolorsitametconsectetur";
    const banUser01Hash = getHash(banUser01);

    const submitVIPuser = `VIPPostSkipUser${".".repeat(16)}`;
    const shadowBanVideoID = "postSkipBan";
    const shadowBanVideoID2 = "postSkipBan2";

    const queryDatabase = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "votes", "userID", "locked", "category", "actionType" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseActionType = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "actionType" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseDuration = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseVideoInfo = (videoID: string) => db.prepare("get", `SELECT * FROM "videoInfo" WHERE "videoID" = ?`, [videoID]);

    before(() => {
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "actionType", "videoDuration", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.prepare("run", insertSponsorTimeQuery, ["full_video_segment", 0, 0, 0, "full-video-uuid-0", submitUserTwoHash, 0, 0, "sponsor", "full", 0, 0, "full_video_segment"]);

        db.prepare("run", insertSponsorTimeQuery, ["full_video_duration_segment", 0, 0, 0, "full-video-duration-uuid-0", submitUserTwoHash, 0, 0, "sponsor", "full", 123, 0, "full_video_duration_segment"]);
        db.prepare("run", insertSponsorTimeQuery, ["full_video_duration_segment", 25, 30, 0, "full-video-duration-uuid-1", submitUserTwoHash, 0, 0, "sponsor", "skip", 123, 0, "full_video_duration_segment"]);

        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        db.prepare("run", insertVipUserQuery, [getHash(submitVIPuser)]);

        // ban user
        db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, [banUser01Hash]);
    });

    it("Should be able to submit a single time (Params method)", (done) => {
        const videoID = "postSkipParamSingle";
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
                };
                assert.ok(partialDeepEquals(videoInfo, expectedVideoInfo));

                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time (JSON method)", (done) => {
        const videoID = "postSkipJSONSingle";
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
        const videoID = "postSkipJSONSingleActionType";
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

    it("Should be able to submit a single time with a duration from the YouTube API (JSON method)", (done) => {
        const videoID = "postSkip5";
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
        const videoID = "postSkip6";
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

    it("Should be able to submit with a new duration, and not hide full video segments", async () => {
        const videoID = "full_video_duration_segment";
        const res = await postSkipSegmentJSON({
            userID: submitUserOne,
            videoID,
            videoDuration: 100,
            segments: [{
                segment: [20, 30],
                category: "sponsor",
            }],
        });
        assert.strictEqual(res.status, 200);
        const videoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "actionType", "videoDuration"
            FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 0`, [videoID]);
        const hiddenVideoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "videoDuration"
            FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 1`, [videoID]);
        assert.strictEqual(videoRows.length, 2);
        const expected = {
            startTime: 20,
            endTime: 30,
            locked: 0,
            category: "sponsor",
            videoDuration: 100
        };
        const fullExpected = {
            category: "sponsor",
            actionType: "full"
        };
        assert.ok((partialDeepEquals(videoRows[0], fullExpected) && partialDeepEquals(videoRows[1], expected))
            || (partialDeepEquals(videoRows[1], fullExpected) && partialDeepEquals(videoRows[0], expected)));
        assert.strictEqual(hiddenVideoRows.length, 1);
    });

    it("Should be able to submit a single time under a different service (JSON method)", (done) => {
        const videoID = "postSkip7";
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
        const videoID = "postSkipJSONMultiple";
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
                assert.ok(arrayDeepEquals(rows, expected));
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
                assert.match(res.data, /Reason: /);
                assert.match(res.data, /Custom Reason/);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return not be 403 when submitting with locked category but unlocked actionType", (done) => {
        const videoID = "lockedVideo";
        db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason")
            VALUES(?, ?, ?, ?)`, [getHash("VIPUser-lockCategories"), videoID, "sponsor", "Custom Reason"])
            .then(() => postSkipSegmentJSON({
                userID: submitUserOne,
                videoID,
                segments: [{
                    segment: [1, 10],
                    category: "sponsor",
                    actionType: "mute"
                }],
            }))
            .then(res => {
                assert.strictEqual(res.status, 200);
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

    it("Should allow submitting full video sponsor", (done) => {
        const videoID = "qqwerth";
        postSkipSegmentParam({
            videoID,
            startTime: 0,
            endTime: 0,
            category: "sponsor",
            actionType: "full",
            userID: submitUserTwo
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 0,
                    votes: 0,
                    userID: submitUserTwoHash,
                    category: "sponsor",
                    actionType: "full"
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Submitting duplicate full video sponsor should count as an upvote", (done) => {
        const videoID = "full_video_segment";
        postSkipSegmentParam({
            videoID,
            startTime: 0,
            endTime: 0,
            category: "sponsor",
            actionType: "full",
            userID: submitUserOne
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabase(videoID);
                const expected = {
                    startTime: 0,
                    endTime: 0,
                    votes: 1,
                    userID: submitUserTwoHash,
                    category: "sponsor",
                    actionType: "full"
                };
                assert.ok(partialDeepEquals(row, expected));
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

    it("Should automatically shadowban segments if user is banned", (done) => {
        const videoID = shadowBanVideoID;
        postSkipSegmentParam({
            videoID,
            startTime: 0,
            endTime: 10,
            category: "sponsor",
            userID: banUser01
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "shadowHidden", "userID" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
                const expected = {
                    startTime: 0,
                    endTime: 10,
                    shadowHidden: 1,
                    userID: banUser01Hash
                };
                assert.deepStrictEqual(row, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not add full segments to database if user if shadowbanned", (done) => {
        const videoID = shadowBanVideoID2;
        postSkipSegmentParam({
            videoID,
            startTime: 0,
            endTime: 0,
            category: "sponsor",
            actionType: "full",
            userID: banUser01
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "shadowHidden", "userID" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
                assert.strictEqual(row, undefined);
                done();
            })
            .catch(err => done(err));
    });

    it("Should successfully submit if video is private", (done) => {
        const videoID = "private-video";
        postSkipSegmentParam({
            videoID,
            startTime: 1,
            endTime: 5,
            category: "sponsor",
            userID: submitUserTwo
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should throw 409 on duplicate submission", (done) => {
        const videoID = "private-video";
        postSkipSegmentParam({
            videoID,
            startTime: 5.555,
            endTime: 8.888,
            category: "sponsor",
            userID: submitUserTwo
        })
            .then(res => assert.strictEqual(res.status, 200) )
            .then(() => postSkipSegmentParam({
                videoID,
                startTime: 5.555,
                endTime: 8.888,
                category: "sponsor",
                userID: submitUserTwo
            }))
            .then(res => {
                assert.strictEqual(res.status, 409);
                done();
            })
            .catch(err => done(err));
    });
});

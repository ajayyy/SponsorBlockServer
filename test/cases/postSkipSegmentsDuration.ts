import assert from "assert";
import { postSkipSegmentJSON, postSkipSegmentParam } from "./postSkipSegments";
import { getHash } from "../../src/utils/getHash";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../mocks/youtubeMock";
import { convertSingleToDBFormat } from "./postSkipSegments";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("postSkipSegments - duration", () => {
    const userIDOne = "postSkip-DurationUserOne";
    const userIDTwo = "postSkip-DurationUserTwo";
    const videoID = "postSkip-DurationVideo";
    const noDurationVideoID = "noDuration";
    const userID = userIDOne;

    const queryDatabaseDuration = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "videoDuration" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);

    before(() => {
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "actionType", "videoDuration", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.prepare("run", insertSponsorTimeQuery, ["full_video_duration_segment", 0, 0, 0, "full-video-duration-uuid-0", userIDTwo, 0, 0, "sponsor", "full", 123, 0, "full_video_duration_segment"]);
        db.prepare("run", insertSponsorTimeQuery, ["full_video_duration_segment", 25, 30, 0, "full-video-duration-uuid-1", userIDTwo, 0, 0, "sponsor", "skip", 123, 0, "full_video_duration_segment"]);
    });

    it("Should be able to submit a single time with a precise duration close to the one from the YouTube API (JSON method)", (done) => {
        const segment = {
            segment: [1, 10],
            category: "sponsor",
        };
        postSkipSegmentJSON({
            userID,
            videoID,
            videoDuration: 4980.20,
            segments: [segment],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseDuration(videoID);
                const expected = {
                    ...convertSingleToDBFormat(segment),
                    locked: 0,
                    videoDuration: 4980.20,
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single time with a duration in the body (JSON method)", (done) => {
        const videoID = "noDuration";
        const segment = {
            segment: [0, 10],
            category: "sponsor",
        };
        postSkipSegmentJSON({
            userID,
            videoID,
            videoDuration: 100,
            segments: [segment],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseDuration(videoID);
                const expected = {
                    ...convertSingleToDBFormat(segment),
                    locked: 0,
                    videoDuration: 100,
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit with a new duration, and hide old submissions and remove segment locks", async () => {
        const videoID = "noDuration";
        const segment = {
            segment: [1, 10],
            category: "sponsor",
        };
        await db.prepare("run", `INSERT INTO "lockCategories" ("userID", "videoID", "category")
            VALUES(?, ?, ?)`, [getHash("generic-VIP"), videoID, "sponsor"]);
        try {
            const res = await postSkipSegmentJSON({
                userID,
                videoID,
                videoDuration: 100,
                segments: [segment],
            });
            assert.strictEqual(res.status, 200);
            const lockCategoriesRow = await db.prepare("get", `SELECT * from "lockCategories" WHERE videoID = ?`, [videoID]);
            const videoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "videoDuration"
                FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 0`, [videoID]);
            const hiddenVideoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "videoDuration"
                FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 1`, [videoID]);
            assert.ok(!lockCategoriesRow);
            const expected = {
                ...convertSingleToDBFormat(segment),
                locked: 0,
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
        postSkipSegmentJSON({
            userID,
            videoID: noDurationVideoID,
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
        const segment = {
            segment: [20, 30],
            category: "sponsor",
        };
        const res = await postSkipSegmentJSON({
            userID,
            videoID,
            videoDuration: 100,
            segments: [segment],
        });
        assert.strictEqual(res.status, 200);
        const videoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "actionType", "videoDuration"
            FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 0`, [videoID]);
        const hiddenVideoRows = await db.prepare("all", `SELECT "startTime", "endTime", "locked", "category", "videoDuration"
            FROM "sponsorTimes" WHERE "videoID" = ? AND hidden = 1`, [videoID]);
        assert.strictEqual(videoRows.length, 2);
        const expected = {
            ...convertSingleToDBFormat(segment),
            locked: 0,
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

    it("Should be able to submit a single time with a duration from the YouTube API (JSON method)", (done) => {
        const segment = {
            segment: [0, 10],
            category: "sponsor",
        };
        const videoID = "postDuration-ytjson";
        postSkipSegmentJSON({
            userID,
            videoID,
            videoDuration: 100,
            segments: [segment],
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseDuration(videoID);
                const expected = {
                    ...convertSingleToDBFormat(segment),
                    videoDuration: 4980,
                };
                assert.ok(partialDeepEquals(row, expected));
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
            userID
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });
});
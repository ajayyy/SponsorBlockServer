import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { arrayDeepEquals } from "../utils/partialDeepEquals";
import { postSkipSegmentJSON, convertMultipleToDBFormat } from "./postSkipSegments";
import { YouTubeApiMock } from "../mocks/youtubeMock";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("postSkipSegments - Automod 80%", () => {
    const userID = "postSkipSegments-automodSubmit";
    const userIDHash = getHash(userID);

    const over80VideoID = "80percent_video";

    const queryDatabaseCategory = (videoID: string) => db.prepare("all", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ? and "votes" > -1`, [videoID]);

    before(async () => {
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "actionType", "videoDuration", "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimeQuery, [over80VideoID, 0, 1000, 0, "80percent-uuid-0", userIDHash, 0, 0, "interaction", "skip", 0, 0, over80VideoID]);
        await db.prepare("run", insertSponsorTimeQuery, [over80VideoID, 1001, 1005, 0, "80percent-uuid-1", userIDHash, 0, 0, "interaction", "skip", 0, 0, over80VideoID]);
        await db.prepare("run", insertSponsorTimeQuery, [over80VideoID, 0, 5000, -2, "80percent-uuid-2", userIDHash, 0, 0, "interaction", "skip", 0, 0, over80VideoID]);
    });

    it("Should allow multiple times if total is under 80% of video (JSON method)", (done) => {
        const videoID = "postSkipSegments_80percent_video_blank1";
        const segments = [{
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
        }];
        postSkipSegmentJSON({
            userID,
            videoID,
            segments
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const rows = await queryDatabaseCategory(videoID);
                const expected = convertMultipleToDBFormat(segments);
                assert.ok(arrayDeepEquals(rows, expected));
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);

    it("Should reject multiple times if total is over 80% of video (JSON method)", (done) => {
        const videoID = "postSkipSegments_80percent_video_blank2";
        const segments = [{
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
        }];
        postSkipSegmentJSON({
            userID,
            videoID,
            segments
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const rows = await queryDatabaseCategory(videoID);
                assert.deepStrictEqual(rows, []);
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);

    it("Should reject multiple times if total is over 80% of video including previosuly submitted times (JSON method)", (done) => {
        const segments = [{
            segment: [2000, 4000], // adds 2000
            category: "sponsor",
        }, {
            segment: [1500, 2750], // adds 500
            category: "sponsor",
        }, {
            segment: [4050, 4570], // adds 520
            category: "sponsor",
        }];
        const expected = [{
            startTime: 0,
            endTime: 1000,
            category: "interaction"
        }, {
            startTime: 1001,
            endTime: 1005,
            category: "interaction"
        }];
        postSkipSegmentJSON({
            userID,
            videoID: over80VideoID,
            segments: segments
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const rows = await queryDatabaseCategory(over80VideoID);
                assert.ok(arrayDeepEquals(rows, expected, true));
                done();
            })
            .catch(err => done(err));
    }).timeout(5000);
});

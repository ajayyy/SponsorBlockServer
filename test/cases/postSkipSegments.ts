import { partialDeepEquals, arrayDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
// Mocks
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../mocks/youtubeMock";

import assert from "assert";
import { client } from "../utils/httpClient";
import { genAnonUser, genUser } from "../utils/genUser";
import { genRandomValue } from "../utils/genRandom";
import { insertVipUser } from "../utils/queryGen";

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
    const submitVIPuser = genUser("postSkipSegments", "vipuser");

    const queryDatabase = (videoID: string) => db.prepare("get", `SELECT "videoID", "startTime", "endTime", "votes", "userID", "locked", "category", "actionType" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseActionType = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "actionType" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    const queryDatabaseVideoInfo = (videoID: string) => db.prepare("get", `SELECT * FROM "videoInfo" WHERE "videoID" = ?`, [videoID]);

    before(() => {
        insertVipUser(db, submitVIPuser);
    });

    it("Should be able to submit a single time (Params method)", async () => {
        const videoID = genRandomValue("video", "post-skip-param");
        const segment = {
            videoID,
            startTime: 2,
            endTime: 10,
            category: "sponsor"
        };
        // submit
        const submit = await postSkipSegmentParam({
            ...segment,
            userID: genAnonUser().privID,
        });
        assert.strictEqual(submit.status, 200);
        // check database
        const row = await queryDatabase(videoID);
        const expected = {
            ...segment,
        };
        assert.ok(partialDeepEquals(row, expected));
        // query videoInfo
        const videoInfo = await queryDatabaseVideoInfo(videoID);
        const expectedVideoInfo = {
            videoID,
            title: "Example Title",
            channelID: "ExampleChannel",
            published: 123,
        };
        assert.ok(partialDeepEquals(videoInfo, expectedVideoInfo));
    });

    it("Should be able to submit a single time (JSON method)", async () => {
        const videoID = genRandomValue("video", "post-skip-json");
        const user = genAnonUser();
        const submit = await postSkipSegmentJSON({
            userID: user.privID,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        });
        assert.strictEqual(submit.status, 200);
        const row = await queryDatabase(videoID);
        const expected = {
            startTime: 0,
            endTime: 10,
            locked: 0,
            category: "sponsor",
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Should be able to submit a single time with an action type (JSON method)", async () => {
        const videoID = genRandomValue("video", "post-skip-json-action-type");
        const submit = await postSkipSegmentJSON({
            userID: genAnonUser().privID,
            videoID,
            segments: [{
                segment: [0, 10],
                category: "sponsor",
                actionType: "mute"
            }],
        });
        assert.strictEqual(submit.status, 200);
        const row = await queryDatabaseActionType(videoID);
        const expected = {
            startTime: 0,
            endTime: 10,
            category: "sponsor",
            actionType: "mute",
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Should be able to submit a single time under a different service (JSON method)", async () => {
        const videoID = genRandomValue("video", "post-skip-json-service");
        const submit = await postSkipSegmentJSON({
            userID: genAnonUser().privID,
            videoID,
            service: "PeerTube",
            segments: [{
                segment: [0, 10],
                category: "sponsor",
            }],
        });
        assert.strictEqual(submit.status, 200);
        const row = await db.prepare("get", `SELECT "startTime", "endTime", "locked", "category", "service" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
        const expected = {
            startTime: 0,
            endTime: 10,
            locked: 0,
            category: "sponsor",
            service: "PeerTube",
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("VIP submission should start locked", async () => {
        const videoID = genRandomValue("video", "post-skip-vip");
        const segment = {
            videoID,
            startTime: 0,
            endTime: 10,
            category: "sponsor"
        };
        const submit = await postSkipSegmentParam({
            userID: submitVIPuser.privID,
            ...segment
        });
        assert.strictEqual(submit.status, 200);
        const row = await queryDatabase(videoID);
        assert.ok(partialDeepEquals(row, segment));
    });

    it("Should be able to submit multiple times (JSON method)", async () => {
        const videoID = genRandomValue("video", "post-skip-json-multiple");
        const submit = await postSkipSegmentJSON({
            userID: genAnonUser().privID,
            videoID,
            segments: [{
                segment: [3, 10],
                category: "sponsor",
            }, {
                segment: [30, 60],
                category: "intro",
            }],
        });
        assert.strictEqual(submit.status, 200);
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
    }).timeout(5000);

    it("Should be accepted if a non-sponsor is less than 1 second", async () => {
        const videoID = genRandomValue("video", "post-short-non-sponsor");
        const submit = await postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30.5,
            userID: genAnonUser().privID,
            category: "intro"
        });
        assert.strictEqual(submit.status, 200);
    });

    it("Should be accepted if highlight segment starts and ends at the same time", async () => {
        const videoID = genRandomValue("video", "post-skip-highlight");
        const submit = await postSkipSegmentParam({
            videoID,
            startTime: 30,
            endTime: 30,
            userID: genAnonUser().privID,
            category: "poi_highlight"
        });
        assert.strictEqual(submit.status, 200);
    });

    it("Should be able to submit with commas in timestamps", async () => {
        const videoID = genRandomValue("video", "post-skip-commas");
        const submit = await postSkipSegmentJSON({
            userID: genAnonUser().privID,
            videoID,
            segments: [{
                segment: ["0,2", "10,392"],
                category: "sponsor",
            }]
        });
        assert.strictEqual(submit.status, 200);
        const row = await queryDatabase(videoID);
        const expected = {
            startTime: 0.2,
            endTime: 10.392
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Should allow submitting full video sponsor", async () => {
        const videoID = genRandomValue("video", "post-skip-full-video");
        const user = genAnonUser();
        const segment = {
            videoID,
            startTime: 0,
            endTime: 0,
            category: "sponsor",
            actionType: "full",
        };
        const submit = await postSkipSegmentParam({
            ...segment,
            userID: user.privID
        });
        assert.strictEqual(submit.status, 200);
        const row = await queryDatabase(videoID);
        const expected = {
            ...segment,
            userID: user.pubID
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Submitting duplicate full video sponsor should count as an upvote", async () => {
        const videoID = genRandomValue("video", "vote-dupe-full-video");
        const submitUser = genAnonUser();
        const voteUser = genAnonUser();
        const segment = {
            videoID,
            startTime: 0,
            endTime: 0,
            category: "sponsor",
            actionType: "full"
        };
        // submitting
        const submitOne = await postSkipSegmentParam({
            ...segment,
            userID: submitUser.privID
        });
        assert.strictEqual(submitOne.status, 200);
        // add eligibility for voteUser
        await postSkipSegmentParam({
            videoID: genRandomValue("video", "vote-eligible"),
            userID: voteUser.privID,
            category: "sponsor",
            startTime: 0,
            endTime: 10,
        });
        // submit second segment
        const submitTwo = await postSkipSegmentParam({
            ...segment,
            userID: voteUser.privID
        });
        assert.strictEqual(submitTwo.status, 200);
        // checking
        const row = await queryDatabase(videoID);
        const expected = {
            ...segment,
            votes: 1
        };
        assert.ok(partialDeepEquals(row, expected));
    });

    it("Should not be able to submit with colons in timestamps", async () => {
        const videoID = genRandomValue("video", "post-skip-colons");
        const submit = await postSkipSegmentJSON({
            userID: genAnonUser().privID,
            videoID,
            segments: [{
                segment: ["0:2.000", "3:10.392"],
                category: "sponsor",
            }]
        });
        assert.strictEqual(submit.status, 400);
    });

    it("Should throw 409 on duplicate submission", async () => {
        const videoID = "private-video";
        const submitSegment = {
            videoID,
            startTime: 5.555,
            endTime: 8.888,
            category: "sponsor",
            userID: genAnonUser().privID
        };
        const firstSubmit = await postSkipSegmentParam(submitSegment);
        assert.strictEqual(firstSubmit.status, 200);
        const secondSubmit = await postSkipSegmentParam(submitSegment);
        assert.strictEqual(secondSubmit.status, 409);
    });
});

import assert from "assert";
import { postSkipSegmentParam } from "./postSkipSegments";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import { ImportMock } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { YouTubeApiMock } from "../mocks/youtubeMock";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

describe("postSkipSegments - shadowban", () => {
    const banUser01 = "postSkip-banUser01";
    const banUser01Hash = getHash(banUser01);

    const shadowBanVideoID1 = "postSkipBan1";
    const shadowBanVideoID2 = "postSkipBan2";

    const queryDatabaseShadowhidden = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "shadowHidden", "userID" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);

    before(async () => {
        await db.prepare("run", `INSERT INTO "shadowBannedUsers" ("userID") VALUES(?)`, [banUser01Hash]);
    });

    it("Should automatically shadowban segments if user is banned", (done) => {
        const videoID = shadowBanVideoID1;
        postSkipSegmentParam({
            videoID,
            startTime: 0,
            endTime: 10,
            category: "sponsor",
            userID: banUser01
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseShadowhidden(videoID);
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
                const row = await queryDatabaseShadowhidden(videoID);
                assert.strictEqual(row, undefined);
                done();
            })
            .catch(err => done(err));
    });
});

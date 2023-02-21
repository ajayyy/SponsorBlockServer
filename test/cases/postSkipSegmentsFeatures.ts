import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import { genRandom } from "../utils/getRandom";
import { Feature } from "../../src/types/user.model";
import { Segment, postSkipSegmentJSON, convertSingleToDBFormat } from "./postSkipSegments";

describe("postSkipSegments Features - Chapters", () => {
    const submitUser_noPermissions = "postSkipSegments-chapters-noperm";
    const submitUser_reputation = "postSkipSegments-chapters-reputation";
    const submitUser_feature = "postSkipSegments-chapters-feature";

    const queryDatabaseChapter = (videoID: string) => db.prepare("get", `SELECT "startTime", "endTime", "category", "actionType", "description" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID]);
    function createSegment(): Segment {
        return {
            segment: [0, 10],
            category: "chapter",
            actionType: "chapter",
            description: genRandom()
        };
    }

    before(() => {
        const submitNumberOfTimes = 10;
        const submitUser_reputationHash = getHash(submitUser_reputation);
        const insertSponsorTimeQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "locked", "UUID", "userID", "timeSubmitted", views, category, "actionType", "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        for (let i = 0; i < submitNumberOfTimes; i++) {
            const uuid = `post_reputation_uuid-${i}`;
            const videoID = `post_reputation_video-${i}`;
            db.prepare("run", insertSponsorTimeQuery, [videoID, 1, 11, 5, 1, uuid, submitUser_reputationHash, 1597240000000, 50, "sponsor", "skip", 0]);
        }
        // user feature
        db.prepare("run", `INSERT INTO "userFeatures" ("userID", "feature", "issuerUserID", "timeSubmitted") VALUES(?, ?, ?, ?)`, [getHash(submitUser_feature), Feature.ChapterSubmitter, "generic-VIP", 0]);
    });

    it("Should be able to submit a single chapter due to reputation (JSON method)", (done) => {
        const segment = createSegment();
        const videoID = "postSkipSegments-chapter-reputation";
        postSkipSegmentJSON({
            userID: submitUser_reputation,
            videoID,
            segments: [segment]
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseChapter(videoID);
                assert.ok(partialDeepEquals(row, convertSingleToDBFormat(segment)));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a single chapter due to user feature (JSON method)", (done) => {
        const segment = createSegment();
        const videoID = "postSkipSegments-chapter-feature";
        postSkipSegmentJSON({
            userID: submitUser_feature,
            videoID,
            segments: [segment]
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await queryDatabaseChapter(videoID);
                assert.ok(partialDeepEquals(row, convertSingleToDBFormat(segment)));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit a chapter without permission (JSON method)", (done) => {
        const videoID = "postSkipSegments-chapter-submit";
        postSkipSegmentJSON({
            userID: submitUser_noPermissions,
            videoID,
            segments: [createSegment()]
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

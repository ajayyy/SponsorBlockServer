import assert from "assert";
import { postSkipSegmentJSON } from "./postSkipSegments";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";

describe("postSkipSegments - LockedVideos", () => {
    const userIDOne = "postSkip-DurationUserOne";
    const VIPLockUser = "VIPUser-lockCategories";
    const videoID = "lockedVideo";
    const userID = userIDOne;

    before(async () => {
        const insertLockCategoriesQuery = `INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES(?, ?, ?, ?)`;
        await db.prepare("run", insertLockCategoriesQuery, [getHash(VIPLockUser), videoID, "sponsor", "Custom Reason"]);
        await db.prepare("run", insertLockCategoriesQuery, [getHash(VIPLockUser), videoID, "intro", ""]);
    });

    it("Should return 403 and custom reason for submiting in lockedCategory", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [1, 10],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                assert.match(res.data, /Reason: /);
                assert.match(res.data, /Custom Reason/);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return not be 403 when submitting with locked category but unlocked actionType", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [1, 10],
                category: "sponsor",
                actionType: "mute"
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 403 for submiting in lockedCategory", (done) => {
        postSkipSegmentJSON({
            userID,
            videoID,
            segments: [{
                segment: [1, 10],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                assert.doesNotMatch(res.data, /Lock reason: /);
                assert.doesNotMatch(res.data, /Custom Reason/);
                done();
            })
            .catch(err => done(err));
    });
});

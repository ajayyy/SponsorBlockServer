import assert from "assert";
import { postSkipSegmentJSON } from "./postSkipSegments";
import { db } from "../../src/databases/databases";
import { insertLock } from "../utils/queryGen";
import { genAnonUser } from "../utils/genUser";
import { genRandomValue } from "../utils/genRandom";

describe("postSkipSegments - LockedVideos", () => {
    const videoID = genRandomValue("video", "postSkipLocked");

    before(() => {
        insertLock(db, { videoID, category: "sponsor", reason: "Custom Reason" });
        insertLock(db, { videoID, category: "intro", reason: "" });
    });

    it("Should return 403 and custom reason for submiting in lockedCategory", () =>
        postSkipSegmentJSON({
            userID: genAnonUser().privID,
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
            })
    );

    it("Should return not be 403 when submitting with locked category but unlocked actionType", () =>
        postSkipSegmentJSON({
            userID: genAnonUser().privID,
            videoID,
            segments: [{
                segment: [1, 10],
                category: "sponsor",
                actionType: "mute"
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
            })
    );

    it("Should return 403 for submiting in lockedCategory", () =>
        postSkipSegmentJSON({
            userID: genAnonUser().privID,
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
            })
    );
});
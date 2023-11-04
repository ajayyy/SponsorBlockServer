import assert from "assert";
import { postSkipSegmentParam } from "./postSkipSegments";
import { config } from "../../src/config";
import sinon from "sinon";
import { genRandomValue } from "../utils/genRandom";

const videoID = genRandomValue("videoID", "postSkipSegments400Stub");

describe("postSkipSegments 400 - stubbed config", () => {
    const USERID_LIMIT = 30;
    before(() => {
        sinon.stub(config, "minUserIDLength").value(USERID_LIMIT);
    });
    after(() => {
        sinon.restore();
    });

    it("Should return 400 if userID is too short", () => {
        const userID = "a".repeat(USERID_LIMIT - 10);
        return postSkipSegmentParam({
            videoID,
            startTime: 1,
            endTime: 5,
            category: "sponsor",
            userID
        })
            .then(res => assert.strictEqual(res.status, 400));
    });
});

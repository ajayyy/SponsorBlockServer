import {getSubmissionUUID} from "../../src/utils/getSubmissionUUID";
import assert from "assert";
import { ActionType, VideoID } from "../../src/types/segments.model";
import { UserID } from "../../src/types/user.model";

describe("getSubmissionUUID", () => {
    it("Should return the hashed value", () => {
        assert.strictEqual(getSubmissionUUID("video001" as VideoID, "skip" as ActionType, "testuser001" as UserID, 13.33337, 42.000001), "48ad47e445e67a7b963d9200037b36ec706eddcb752fdadc7bb2f061b56be6a23");
    });
});

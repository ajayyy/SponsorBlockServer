import { getSubmissionUUID } from "../../src/utils/getSubmissionUUID";
import assert from "assert";
import { ActionType, VideoID, Service } from "../../src/types/segments.model";
import { UserID } from "../../src/types/user.model";

describe("getSubmissionUUID", () => {
    it("Should return the hashed value", () => {
        assert.strictEqual(
            getSubmissionUUID("video001" as VideoID, "skip" as ActionType, "testuser001" as UserID, 13.33337, 42.000001, Service.YouTube),
            "529611b4cdd7319e705a32ae9557a02e59c8dbc1306097b2d2d5807c6405e9b1a");
    });
});

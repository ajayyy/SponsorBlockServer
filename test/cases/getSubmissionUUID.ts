import { getSubmissionUUID } from "../../src/utils/getSubmissionUUID";
import assert from "assert";
import { ActionType, VideoID, Service, Category } from "../../src/types/segments.model";
import { UserID } from "../../src/types/user.model";

describe("getSubmissionUUID", () => {
    it("Should return the hashed value", () => {
        assert.strictEqual(
            getSubmissionUUID("video001" as VideoID, "sponsor" as Category, "skip" as ActionType, "", "testuser001" as UserID, 13.33337, 42.000001, Service.YouTube),
            "2a473bca993dd84d8c2f6a4785989b20948dfe0c12c00f6f143bbda9ed561dca7");
    });
});

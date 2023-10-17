import { getSubmissionUUID } from "../../src/utils/getSubmissionUUID";
import assert from "assert";
import { ActionType, VideoID, Service, Category } from "../../src/types/segments.model";
import { HashedUserID } from "../../src/types/user.model";
import { getHash } from "../../src/utils/getHash";
import { HashedValue } from "../../src/types/hash.model";
import { genAnonUser } from "../utils/genUser";
import { genRandomValue } from "../utils/genRandom";

function testHash (segment: segment, version: number): HashedValue {
    const manualHash = getHash(Object.values(segment).join(""), 1) as HashedValue;
    const generatedHash = getSubmissionUUID(segment.videoID, segment.category, segment.actionType, segment.description, segment.userID, segment.startTime, segment.endTime, segment.service);
    assert.strictEqual(version, Number(generatedHash.at(-1)), "version should match passed in version");
    assert.strictEqual(`${manualHash}${version}`, generatedHash);
    return generatedHash;
}

interface segment {
    videoID: VideoID,
    startTime: number,
    endTime: number,
    userID: HashedUserID,
    description: string,
    category: Category,
    actionType: ActionType,
    service: Service
}

const version = 7;

describe("getSubmissionUUID", () => {
    it("Should return the hashed value identical to manually generated value", () => {
        const segment: segment = {
            videoID: "video001" as VideoID,
            startTime: 13.33337,
            endTime: 42.000001,
            userID: "testuser001" as HashedUserID,
            description: "",
            category: "sponsor" as Category,
            actionType: "skip" as ActionType,
            service: Service.YouTube
        };
        const testedHash = testHash(segment, version);
        // test against baked hash
        assert.strictEqual(testedHash, "2a473bca993dd84d8c2f6a4785989b20948dfe0c12c00f6f143bbda9ed561dca7");
    });
    it ("Should return identical hash for randomly generated values", () => {
        const user = genAnonUser();
        const segment: segment = {
            videoID: genRandomValue("video", "getUUID") as VideoID,
            startTime: Math.random()*1000,
            endTime: Math.random()*500,
            userID: user.pubID,
            description: genRandomValue("description", "getUUID"),
            category: "sponsor" as Category,
            actionType: "skip" as ActionType,
            service: Service.YouTube
        };
        testHash(segment, version);
    });
});

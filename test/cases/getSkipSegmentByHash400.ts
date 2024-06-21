import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { ImportMock, } from "ts-mock-imports";
import * as YouTubeAPIModule from "../../src/utils/youtubeApi";
import { genRandomValue, genRandom } from "../utils/genRandom";
import { insertSegment } from "../utils/segmentQueryGen";
import { YouTubeApiMock } from "../mocks/youtubeMock";
import { AxiosRequestConfig } from "axios";
import assert from "assert";
import { client } from "../utils/httpClient";

const mockManager = ImportMock.mockStaticClass(YouTubeAPIModule, "YouTubeAPI");
const sinonStub = mockManager.mock("listVideos");
sinonStub.callsFake(YouTubeApiMock.listVideos);

const endpoint = "/api/skipSegments";

const genRandomHash = () => genRandom(4);

describe("getSkipSegmentsByHash 4XX", () => {
    const realVideoID = genRandomValue("video", "getSkipSegments");
    const realVideoIDHashed = getHash(realVideoID);
    const realVideo = {
        videoID: realVideoID,
        hashedID: realVideoIDHashed,
        partialHash: realVideoIDHashed.substring(0, 5)
    };

    before(async() => {
        await insertSegment(db, { videoID: realVideo.videoID });
    });

    const assertStatus = (axiosConfig: AxiosRequestConfig, status: number, hash = genRandomHash()) => {
        axiosConfig.validateStatus = () => true;
        return client.get(`${endpoint}/${hash}`, axiosConfig)
            .then(res => {
                //console.log(res)
                assert.notStrictEqual(res.data, "videoID not specified");
                assert.ok(!res.data?.[0]?.segments?.length);
                assert.strictEqual(res.status, status, res.data);
            });
    };

    it("Should return 400 for bad format categories", () => {
        return assertStatus({ params: { categories: "shilling" } }, 400);
    });

    it("Should return 400 prefix too short", () => {
        return assertStatus({ params: { categories: `["shilling"]` } }, 400, "11");
    });

    it("Should return 400 prefix too long", () => {
        const prefix = "1".repeat(50);
        assert.ok(prefix.length > 33, "failed to generate long enough string");
        return assertStatus({ params: { category: "sponsor" } }, 400, prefix);
    });

    it("Should return 404 prefix in range", () => {
        const prefix = "1".repeat(4);
        return assertStatus({ params: { categories: `["sponsor"]` } }, 404, prefix);
    });

    it("Should return 400 if categories are is number", () => {
        return assertStatus({ params: { categories: 3 } }, 400);
    });

    it("Should return 400 if actionTypes is number", () => {
        return assertStatus({ params: { actionTypes: 3 } }, 400);
    });

    it("Should return 400 if actionTypes are invalid json", () => {
        return assertStatus({ params: { actionTypes: "{test}" } }, 400);
    });

    it("Should return 400 if requiredSegments is number", () => {
        return assertStatus({ url: `${endpoint}/${genRandomHash()}`, params: { requiredSegments: 3 } }, 400);
    });

    it("Should return 400 if requiredSegments is invalid json", () => {
        return assertStatus({ url: `${endpoint}/${genRandomHash()}`, params: { requiredSegments: "{test}" } }, 400);
    });

    it("Should 404 instead of 400 if requiredSegments is invalid", () => {
        return assertStatus({ url: `${endpoint}/${realVideo.partialHash}`, params: { requiredSegments: undefined } }, 404);
    });

    it("Should return 404 if all videos hidden", () => {
        const videoID = genRandomValue("video", "getSkipSegmentsHash404");
        const hashedIDPrefix = getHash(videoID).substring(0, 5);
        insertSegment(db, { hidden: 1, videoID });
        return assertStatus({}, 404, hashedIDPrefix);
    });
});

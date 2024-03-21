import { db } from "../../src/databases/databases";
import { arrayPartialDeepEquals, partialDeepEquals } from "../utils/partialDeepEquals";
import assert from "assert";
import { client } from "../utils/httpClient";
import { genAnonUser } from "../utils/genUser";
import { genRandomNumber, genRandomValue } from "../utils/genRandom";
import { insertSegment, insertSegmentParams } from "../utils/segmentQueryGen";
import { AxiosRequestConfig } from "axios";
import { Service } from "../../src/types/segments.model";

type ResponseSegment = {
    segment?: [number, number] | number[],
    category?: string,
    UUID?: string,
    videoDuration?: number,
    actionType?: string,
    votes?: number,
    locked?: number,
    description?: string
};

const defaultResponseSegment = {
    segment: [1, 10] as [number, number],
    category: "sponsor",
    UUID: "",
    videoDuration: 0,
    actionType: "skip",
    votes: 0,
    locked: 0,
    description: ""
};

const genRandomStartEnd = (min = 0, max = 100): [number, number] => {
    const start = genRandomNumber(min, max);
    const end = genRandomNumber(start + 1, max);
    return [start, end];
};

describe("getSkipSegments", () => {
    const endpoint = "/api/skipSegments";
    let randomVideoID: string;

    beforeEach(() => {
        randomVideoID = genRandomValue("video", "getSkipSegments");
    });

    const createSegment = async(segment: ResponseSegment = {}, overrides: insertSegmentParams = {}): Promise<ResponseSegment> => {
        // setup random values
        const user = genAnonUser();
        const UUID = genRandomValue("uuid", "getSkipSegments");
        // if description, add chapter
        if (segment.description) {
            segment.category = "chapter";
            segment.actionType = "chapter";
        }
        // insert segments
        const responseSegmentOverride: ResponseSegment = {
            ...defaultResponseSegment,
            UUID,
            ...segment
        };
        const sanitizedResponseSegment = responseSegmentOverride as ResponseSegment;
        delete sanitizedResponseSegment.segment;
        const result: insertSegmentParams = {
            ...sanitizedResponseSegment,
            videoID: randomVideoID,
            startTime: segment.segment?.[0] ?? 0,
            endTime: segment.segment?.[1] ?? 10,
            userID: user.pubID,
            ...overrides
        };
        await insertSegment(db, result);
        return responseSegmentOverride;
    };

    const createAndAssert = async (segments: ResponseSegment[] = [{}], request: AxiosRequestConfig, overrides: insertSegmentParams = {}) => {
        const parsedSegments: ResponseSegment[] = [];
        for (const segment of segments) {
            parsedSegments.push(await createSegment(segment, overrides));
        }
        // fetch response
        const obj = { url: endpoint, method: "get", ...request };
        const res = await client(obj);
        // assert response
        assert.strictEqual(res.status, 200);
        const data = res.data;
        assert.ok(arrayPartialDeepEquals(data, parsedSegments), `Expected \n${JSON.stringify(parsedSegments, null, 2)} \nto equal \n${JSON.stringify(data, null, 2)}`);
        assert.strictEqual(data.length, parsedSegments.length);
    };

    it("Should be able to get a time by category", () => {
        const overrides = { category: "sponsor" };
        return createAndAssert([overrides], { params: { videoID: randomVideoID, ...overrides } });
    });

    it("Should be able to get a time by category and action type", () => {
        const overrides = { category: "sponsor", actionType: "mute" };
        return createAndAssert([overrides], { params: { videoID: randomVideoID, ...overrides } });
    });

    it("Should be able to get a time by category and multiple action types", () => {
        const override1 = { segment: genRandomStartEnd(), category: "intro", actionType: "mute" };
        const override2 = { segment: genRandomStartEnd(), category: "intro", actionType: "skip" };
        return createAndAssert([override1, override2], { url: `${endpoint}?videoID=${randomVideoID}&category=intro&actionType=mute&actionType=skip` });
    });

    it("Should be able to get a time by category and getSkipSegmentMultiple action types (JSON array)", () => {
        const override1 = { segment: genRandomStartEnd(), category: "sponsor", actionType: "mute" };
        const override2 = { segment: genRandomStartEnd(), category: "sponsor", actionType: "skip" };
        return createAndAssert([override1, override2], { params: { videoID: randomVideoID, category: "sponsor", actionTypes: `["mute","skip"]` } });
    });

    it("Should be able to get a time by category for a different service", () => {
        const serviceOverride = { service: "PeerTube" as Service };
        const override = { category: "sponsor" };
        return createAndAssert([override], { params: { videoID: randomVideoID, ...override, ...serviceOverride } }, serviceOverride);
    });

    it("Should be able to get a time by category", () => {
        const override = { category: "intro" };
        return createAndAssert([override], { params: { videoID: randomVideoID, ...override } });
    });

    it("Should be able to get a time by categories array", () => {
        return createAndAssert([{}], { params: { videoID: randomVideoID, categories: `["sponsor"]` } });
    });

    it("Should be able to get a time by categories array", () => {
        const override = { category: "intro" };
        return createAndAssert([override], { params: { videoID: randomVideoID, categories: `["intro"]` } });
    });

    it("Should return 404 if all submissions are hidden", async () => {
        await createSegment({}, { videoID: randomVideoID, hidden: true });
        client.get(endpoint, { params: { videoID: randomVideoID } })
            .then(res => assert.strictEqual(res.status, 404));
    });

    it("Should be able to get getSkipSegmentMultiple times by category", () => {
        const category = { category: "intro" };
        const override1 = { segment: genRandomStartEnd(10), ...category };
        const override2 = { segment: genRandomStartEnd(20), ...category };
        return createAndAssert([override1, override2], { params: { videoID: randomVideoID, categories: `["intro"]` } });
    });

    it("Should be able to get getSkipSegmentMultiple times by getSkipSegmentMultiple categories", () => {
        const override1 = { segment: genRandomStartEnd(), category: "sponsor" };
        const override2 = { segment: genRandomStartEnd(), category: "intro" };
        return createAndAssert([override1, override2], { params: { videoID: randomVideoID, categories: `["sponsor", "intro"]` } });
    });

    it("Should be possible to send unexpected query parameters", () => {
        return createAndAssert([{}], { params: { videoID: randomVideoID, fakeparam: "hello" } });
    });

    it("Low voted submissions should be hidden", async () => {
        await createSegment({}, { videoID: randomVideoID, votes: -3 });
        return createAndAssert([{}], { params: { videoID: randomVideoID } });
    });

    it("Should return 404 if no segment found", () => {
        client.get(endpoint, { params: { videoID: randomVideoID } })
            .then(res => assert.strictEqual(res.status, 404));
    });

    it("Should return 400 if bad categories argument", () => {
        client.get(endpoint, { params: { videoID: randomVideoID, categories: `[not-quoted,not-quoted]` } })
            .then(res => assert.strictEqual(res.status, 400));
    });

    it("Should always get getSkipSegmentLocked segment", () => {
        const nonLocked = { category: "intro", votes: 10000 };
        const locked = { category: "intro", locked: 1 };
        createAndAssert([nonLocked, locked], { params: { videoID: randomVideoID } });
    });

    it("Should be able to get getSkipSegmentMultiple categories with repeating parameters", () => {
        const override1 = { segment: genRandomStartEnd(), category: "sponsor" };
        const override2 = { segment: genRandomStartEnd(), category: "intro" };
        return createAndAssert([override1, override2], { url: `${endpoint}?category=sponsor&category=intro`, params: { videoID: randomVideoID } });
    });

    it("Should be able to get, categories param overriding repeating category", () => {
        const override1 = { segment: genRandomStartEnd(), category: "sponsor" };
        const override2 = { segment: genRandomStartEnd(), category: "intro" };
        createSegment({ ...override2 }, { videoID: randomVideoID });
        return createAndAssert([override1], { params: { videoID: randomVideoID, categories: ["sponsor"], category: "intro" } });
    });

    it("Should be able to get specific segments with requiredSegments", () => {
        const required1 = { segment: genRandomStartEnd(10, 20), UUID: genRandomValue("uuid", "getSkipSegments-req"), votes: -2 };
        const required2 = { segment: genRandomStartEnd(20, 30), UUID: genRandomValue("uuid", "getSkipSegments-req"), votes: -2 };
        return createAndAssert([required1, required2],
            { params: { videoID: randomVideoID, requiredSegments: `["${required1.UUID}","${required2.UUID}"]` } });
    });

    it("Should be able to get specific segments with repeating requiredSegment", () => {
        const required1 = { segment: genRandomStartEnd(10, 20), UUID: genRandomValue("uuid", "getSkipSegments-req"), votes: -2 };
        const required2 = { segment: genRandomStartEnd(20, 30), UUID: genRandomValue("uuid", "getSkipSegments-req"), votes: -2 };
        return createAndAssert([required1, required2],
            { url: `${endpoint}?requiredSegment=${required1.UUID}&requiredSegment=${required2.UUID}`, params: { videoID: randomVideoID } });
    });

    it("Should be able to get overlapping chapter segments if very different", async () => {
        const chapter1 = { segment: [60, 80], UUID: genRandomValue("uuid", "getSkipSegments-req"), description: "Chapter 1" };
        const chapter2 = { segment: [70, 75], UUID: genRandomValue("uuid", "getSkipSegments-req"), description: "Chapter 2" };
        const chapter3 = { segment: [71, 75], UUID: genRandomValue("uuid", "getSkipSegments-req"), description: "Chapter 3" };
        for (const chapter of [chapter1, chapter2, chapter3]) {
            createSegment(chapter, { videoID: randomVideoID });
        }
        const videoResponse = await client.get(endpoint, { params: { videoID: randomVideoID, actionType: "chapter", category: "chapter" } });
        const ch12 = [chapter1, chapter2];
        const ch13 = [chapter1, chapter3];
        const data = videoResponse.data;
        assert.strictEqual(data.length, 2);
        return assert.ok(partialDeepEquals(data, ch12, false) || partialDeepEquals(data, ch13));
    });

    it("Should get 400 if no videoID passed in", () => {
        return client.get(endpoint)
            .then(res => assert.strictEqual(res.status, 400));
    });

    it("Should be able to get requiredSegment by partial", () => {
        const required1 = { segment: genRandomStartEnd(10, 20), UUID: genRandomValue("uuid", "getSkipSegments-req"), votes: -2 };
        const required2 = { segment: genRandomStartEnd(20, 30), UUID: genRandomValue("uuid", "getSkipSegments-req"), votes: -2 };
        return createAndAssert([required1, required2],
            { url: `${endpoint}?requiredSegment=${required1.UUID.slice(0,8)}&requiredSegment=${required2.UUID.slice(0,8)}`, params: { videoID: randomVideoID } });
    });

    it("Should be able to get hidden segments with requiredSegments", () => {
        const hidden = { UUID: genRandomValue("uuid", "getSkipSegments-req") };
        return createAndAssert([hidden], { params: { videoID: randomVideoID, requiredSegment: hidden.UUID } }, { hidden: true });
    });

    it("Should be able to get shadowhidden segments with requiredSegments", () => {
        const shadowHidden = { UUID: genRandomValue("uuid", "getSkipSegments-req") };
        return createAndAssert([shadowHidden], { params: { videoID: randomVideoID, requiredSegment: shadowHidden.UUID } }, { shadowHidden: true });
    });

    it("Should get 400 for invalid category type", () => {
        return client.get(endpoint, { params: { videoID: randomVideoID, category: 1 } })
            .then(res => assert.strictEqual(res.status, 400));
    });
});

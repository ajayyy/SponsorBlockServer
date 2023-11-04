import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import assert from "assert";
import { insertSegment, insertSegmentParams } from "../utils/segmentQueryGen";
import { AxiosResponse } from "axios";
import { multiGenProxy } from "../utils/genRandom";
import { genAnonUser } from "../utils/genUser";

const endpoint = "/api/searchSegments";
const videoIDs = multiGenProxy("video", "getSearchSegments");

const getSearchSegments = (videoID: string, params: Record<string, any>) => client.get(endpoint, { params: { videoID, ...params } });
const assertSegments = (uuids: string[], actual: AxiosResponse, count?: number) => {
    assert.strictEqual(actual.status, 200);
    const segments = actual.data.segments;
    const segmentCount = count ?? uuids.length;
    assert.strictEqual(actual.data.segmentCount, segmentCount);
    assert.strictEqual(actual.data.page, 0);
    for (const i in uuids) {
        assert.strictEqual(segments[i].UUID, uuids[i]);
    }
};

describe("getSearchSegments - variedVideo", () => {
    const videoID = videoIDs["variedVideo"];
    const getVideoSearch = (params: Record<string, any>) => getSearchSegments(videoID, params);
    before(async () => {
        await insertSegment(db, { videoID, votes: 2, timeSubmitted: 1, UUID: "search-normal", category: "sponsor" });
        await insertSegment(db, { videoID, votes: -2, timeSubmitted: 2, UUID: "search-downvote", category: "selfpromo" });
        await insertSegment(db, { videoID, votes: 1, timeSubmitted: 3, UUID: "search-locked", category: "interaction", locked: true });
        await insertSegment(db, { videoID, votes: 1, timeSubmitted: 4, UUID: "search-hidden", category: "sponsor", hidden: true });
        await insertSegment(db, { videoID, votes: 1, timeSubmitted: 5, UUID: "search-shadowhidden", category: "sponsor", shadowHidden: true });
    });

    it("Should be able to filter by lock status", async () => {
        const res = await getVideoSearch({ locked: false });
        const expected = [
            "search-normal",
            "search-downvote",
            "search-hidden",
            "search-shadowhidden"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by hide status", async () => {
        const res = await getVideoSearch({ hidden: false });
        const expected = [
            "search-normal",
            "search-downvote",
            "search-locked",
            "search-shadowhidden"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by ignored status", async () => {
        const res = await getVideoSearch({ ignored: false });
        const expected = [
            "search-normal",
            "search-locked"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to show all segments under searchTest0", async () => {
        const res = await getVideoSearch({});
        const expected = [
            "search-normal",
            "search-downvote",
            "search-locked",
            "search-hidden",
            "search-shadowhidden"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by category", async () => {
        const res = await getVideoSearch({ category: "selfpromo" });
        const expected = [
            "search-downvote"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by category array", async () => {
        const res = await getVideoSearch({ category: ["selfpromo"] });
        const expected = [
            "search-downvote"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by category with categories array string", async () => {
        const res = await getVideoSearch({ categories: `["selfpromo"]` });
        const expected = [
            "search-downvote"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by category with categories array", async () => {
        const res = await getVideoSearch({ categories: ["selfpromo"] });
        const expected = [
            "search-downvote"
        ];
        return assertSegments(expected, res);
    });
});

describe("getSearchSegments - views", () => {
    const videoID = videoIDs["views"];
    const getVideoSearch = (params: Record<string, any>) => getSearchSegments(videoID, params);
    before(async () => {
        await insertSegment(db, { videoID, timeSubmitted: 1, views: 5, UUID: "search-lowview" });
        await insertSegment(db, { videoID, timeSubmitted: 2, views: 50, UUID: "search-highview" });
    });

    it("Should be able to filter segments by min views", async () => {
        const res = await getVideoSearch({ minViews: 6 });
        const expected = [
            "search-highview"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter segments by max views", async () => {
        const res = await getVideoSearch({ maxViews: 10 });
        const expected = [
            "search-lowview"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter segments by min and max views", async () => {
        const res = await getVideoSearch({ minViews: 10, maxViews: 100 });
        const expected = [
            "search-highview"
        ];
        return assertSegments(expected, res);
    });
});

describe("getSearchSegments - votes", () => {
    const videoID = videoIDs["votes"];
    const getVideoSearch = (params: Record<string, any>) => getSearchSegments(videoID, params);
    before(async () => {
        await insertSegment(db, { videoID, timeSubmitted: 1, votes: -1, UUID: "search-lowvote" });
        await insertSegment(db, { videoID, timeSubmitted: 2, votes: 0, UUID: "search-zerovote" });
        await insertSegment(db, { videoID, timeSubmitted: 3, votes: 50, UUID: "search-highvote" });
    });

    it("Should be able to filter segments by min votes", async () => {
        const res = await getVideoSearch({ minVotes: 0 });
        const expected = [
            "search-zerovote",
            "search-highvote"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter segments by max votes", async () => {
        const res = await getVideoSearch({ maxVotes: 10 });
        const expected = [
            "search-lowvote",
            "search-zerovote"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter segments by both min and max votes", async () => {
        const res = await getVideoSearch({ minVotes: 0, maxVotes: 10 });
        const expected = [
            "search-zerovote"
        ];
        return assertSegments(expected, res);
    });
});

describe("getSearchSegments - paginated", () => {
    const videoID = videoIDs["paginated"];
    const getVideoSearch = (params: Record<string, any>) => getSearchSegments(videoID, params);
    before(async () => {
        await insertSegment(db, { videoID, timeSubmitted: 11, UUID: "search1-1", startTime: 3, endTime: 4 });
        await insertSegment(db, { videoID, timeSubmitted: 12, UUID: "search1-2", startTime: 3, endTime: 5 });
        await insertSegment(db, { videoID, timeSubmitted: 13, UUID: "search1-3", startTime: 3, endTime: 6 });
        await insertSegment(db, { videoID, timeSubmitted: 14, UUID: "search1-4", startTime: 3, endTime: 7 });
        await insertSegment(db, { videoID, timeSubmitted: 15, UUID: "search1-5", startTime: 3, endTime: 8 });
        await insertSegment(db, { videoID, timeSubmitted: 16, UUID: "search1-6", startTime: 3, endTime: 9 });
        await insertSegment(db, { videoID, timeSubmitted: 17, UUID: "search1-7", startTime: 3, endTime: 10 });
        await insertSegment(db, { videoID, timeSubmitted: 18, UUID: "search1-8", startTime: 3, endTime: 11 });
        await insertSegment(db, { videoID, timeSubmitted: 19, UUID: "search1-9", startTime: 3, endTime: 12 });
        await insertSegment(db, { videoID, timeSubmitted: 20, UUID: "search1-10", startTime: 3, endTime: 13 });
        await insertSegment(db, { videoID, timeSubmitted: 21, UUID: "search2-1", startTime: 3, endTime: 14 });
        await insertSegment(db, { videoID, timeSubmitted: 22, UUID: "search2-2", startTime: 3, endTime: 15 });
    });

    const firstPage = [
        "search1-1",
        "search1-2",
        "search1-3",
        "search1-4",
        "search1-5",
        "search1-6",
        "search1-7",
        "search1-8",
        "search1-9",
        "search1-10"
    ];

    it("Should be able to get first page of results", async () => {
        const res = await getVideoSearch({});
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be able to get second page of results", async () => {
        const res = await getVideoSearch({ page: 1 });
        const expected = [
            "search2-1",
            "search2-2"
        ];
        assert.strictEqual(res.status, 200);
        const segments = res.data.segments;
        assert.strictEqual(res.data.segmentCount, 12);
        assert.strictEqual(res.data.page, 1);
        for (const i in expected) {
            assert.strictEqual(segments[i].UUID, expected[i]);
        }
    });

    it("Should be able to get with custom limit", async () => {
        const res = await getVideoSearch({ limit: 2 });
        const expected = firstPage.slice(0, 2);
        return assertSegments(expected, res, 12);
    });

    it("Should be able to get with custom limit(2) and page(2)", async () => {
        const res = await getVideoSearch({ limit: 2, page: 2 });
        const expected = firstPage.slice(4, 6);
        assert.strictEqual(res.status, 200);
        const segments = res.data.segments;
        assert.strictEqual(res.data.segmentCount, 12);
        assert.strictEqual(res.data.page, 2);
        for (const i in expected) {
            assert.strictEqual(segments[i].UUID, expected[i]);
        }
    });

    it("Should be able to get with over range page", async () => {
        const res = await getVideoSearch({ limit: 2, page: 2000 });
        assert.strictEqual(res.status, 200);
        const data = res.data;
        const segments = data.segments;
        assert.strictEqual(data.segmentCount, 12);
        assert.strictEqual(data.page, 2000);
        assert.strictEqual(segments.length, 0);
    });

    it("Should be able to get with invalid page (-100)", async () => {
        const res = await getVideoSearch({ page: -100 });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be able to get with invalid page (text)", async () => {
        const res = await getVideoSearch({ page: "hello" });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be use default limit if invalid limit query (0)", async () => {
        const res = await getVideoSearch({ limit: 0 });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be use default limit if invalid limit query (-100)", async () => {
        const res = await getVideoSearch({ limit: -100 });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be use default limit if invalid limit query (text)", async () => {
        const res = await getVideoSearch({ limit: "hello" });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be use default limit if invalid limit query (2000)", async () => {
        const res = await getVideoSearch({ limit: 2000 });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });

    it("Should be able to get sorted result (desc)", async () => {
        const res = await getVideoSearch({ sortBy: "endTime", sortDir: "desc" });
        const expected = [
            "search2-2",
            "search2-1",
            "search1-10",
            "search1-9",
            "search1-8",
            "search1-7",
            "search1-6",
            "search1-5",
            "search1-4",
            "search1-3"
        ];
        return assertSegments(expected, res, 12);
    });

    it("Should be able to get sorted result (asc)", async () => {
        const res = await getVideoSearch({ sortBy: "endTime" });
        const expected = [
            "search1-1",
            "search1-2",
            "search1-3",
            "search1-4",
            "search1-5",
            "search1-6",
            "search1-7",
            "search1-8",
            "search1-9",
            "search1-10"
        ];
        return assertSegments(expected, res, 12);
    });

    it("Should be use default sorted if invalid sort field", async () => {
        const res = await getVideoSearch({ sortBy: "not exist", sortDir: "desc" });
        const expected = firstPage;
        return assertSegments(expected, res, 12);
    });
});

describe("getSearchSegments - specific", () => {
    const user = genAnonUser();
    const videoID = videoIDs["specific"];
    const getVideoSearch = (params: Record<string, any>) => getSearchSegments(videoID, params);
    const segment: insertSegmentParams = {
        videoID,
        UUID: "search-values",
        timeSubmitted: 22,
        startTime: 0,
        endTime: 10,
        category: "filler",
        actionType: "mute",
        votes: 1,
        views: 1,
        locked: 1,
        hidden: 0,
        description: "",
        shadowHidden: 0,
        userID: user.pubID,
    };
    before(async () => {
        await insertSegment(db, segment);
    });

    it("Should be able to filter by category with actionTypes JSON", async () => {
        const res = await getVideoSearch({ actionTypes: `["mute"]` });
        const expected = [
            "search-values"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by category with actionType array", async () => {
        const res = await getVideoSearch({ actionTypes: ["mute"] });
        const expected = [
            "search-values"
        ];
        return assertSegments(expected, res);
    });

    it("Should be able to filter by category with actionType string", async () => {
        const res = await getVideoSearch({ actionType: "mute" });
        const expected = [
            "search-values"
        ];
        return assertSegments(expected, res);
    });

    it("Should return all wanted values", async () => {
        const res = await getVideoSearch({});
        assert.strictEqual(res.status, 200);
        const data = res.data;
        assert.strictEqual(data.segmentCount, 1);
        assert.strictEqual(data.page, 0);
        delete segment.videoID; // videoID not returned in searchSegments
        assert.deepEqual(segment, data.segments[0]);
    });
});

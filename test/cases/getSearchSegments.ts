import { db } from "../../src/databases/databases";
import { client } from "../utils/httpClient";
import assert from "assert";

describe("getSearchSegments", () => {
    const endpoint = "/api/searchSegments";
    before(async () => {
        const query = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "views", "locked", "hidden", "shadowHidden", "timeSubmitted", "UUID", "userID", "category", "actionType") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", query, ["searchTest0", 0, 1,    2, 0,   0, 0, 0, 1, "search-normal",        "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest0", 0, 2,    -2, 0,  0, 0, 0, 2, "search-downvote",      "searchTestUser", "selfpromo", "skip",]);
        await db.prepare("run", query, ["searchTest0", 0, 3,    1, 0,   1, 0, 0, 3, "search-locked",        "searchTestUser", "interaction", "skip"]);
        await db.prepare("run", query, ["searchTest0", 0, 4,    1, 0,   0, 1, 0, 4, "search-hidden",        "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest0", 0, 5,    1, 0,   0, 0, 1, 5, "search-shadowhidden",  "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest1", 1, 2,    1, 5,   0, 0, 0, 6, "search-lowview",       "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest1", 1, 3,    1, 50,  0, 0, 0, 7, "search-highview",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest2", 1, 4,    -1, 0,  0, 0, 0, 8, "search-lowvote",       "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest2", 2, 3,    0, 0,   0, 0, 0, 9, "search-zerovote",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest2", 2, 4,    50, 0,  0, 0, 0, 10, "search-highvote",     "searchTestUser", "sponsor", "skip"]);
        // page
        await db.prepare("run", query, ["searchTest4", 3, 4,    1, 0,   0, 0, 0, 10, "search-page1-1",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 5,    1, 0,   0, 0, 0, 11, "search-page1-2",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 6,    1, 0,   0, 0, 0, 12, "search-page1-3",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 7,    1, 0,   0, 0, 0, 13, "search-page1-4",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 8,    1, 0,   0, 0, 0, 14, "search-page1-5",       "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 9,    1, 0,   0, 0, 0, 15, "search-page1-6",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 10,   1, 0,   0, 0, 0, 16, "search-page1-7",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 11,   1, 0,   0, 0, 0, 17, "search-page1-8",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 12,   1, 0,   0, 0, 0, 18, "search-page1-9",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 13,   1, 0,   0, 0, 0, 19, "search-page1-10",     "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 14,   1, 0,   0, 0, 0, 20, "search-page2-1",      "searchTestUser", "sponsor", "skip"]);
        await db.prepare("run", query, ["searchTest4", 3, 15,   1, 0,   0, 0, 0, 21, "search-page2-2",      "searchTestUser", "sponsor", "skip"]);
        return;
    });

    it("Should be able to show all segments under searchTest0", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest0" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 5);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-normal");
                assert.strictEqual(segments[1].UUID, "search-downvote");
                assert.strictEqual(segments[2].UUID, "search-locked");
                assert.strictEqual(segments[3].UUID, "search-hidden");
                assert.strictEqual(segments[4].UUID, "search-shadowhidden");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter by category", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest0", category: "selfpromo" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 1);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-downvote");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter by category", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest0", category: "selfpromo" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 1);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-downvote");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter by lock status", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest0", locked: false } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 4);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-normal");
                assert.strictEqual(segments[1].UUID, "search-downvote");
                assert.strictEqual(segments[2].UUID, "search-hidden");
                assert.strictEqual(segments[3].UUID, "search-shadowhidden");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter by hide status", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest0", hidden: false } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 4);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-normal");
                assert.strictEqual(segments[1].UUID, "search-downvote");
                assert.strictEqual(segments[2].UUID, "search-locked");
                assert.strictEqual(segments[3].UUID, "search-shadowhidden");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter by ignored status", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest0", ignored: false } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 3);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-normal");
                assert.strictEqual(segments[1].UUID, "search-downvote");
                assert.strictEqual(segments[2].UUID, "search-locked");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter segments by min views", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest1", minViews: 6 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 1);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-highview");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter segments by max views", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest1", maxViews: 10 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 1);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-lowview");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter segments by min and max views", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest1", maxViews: 10, minViews: 1 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 1);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-lowview");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter segments by min votes", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest2", minVotes: 0 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 2);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-zerovote");
                assert.strictEqual(segments[1].UUID, "search-highvote");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter segments by max votes", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest2", maxVotes: 10 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 2);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-lowvote");
                assert.strictEqual(segments[1].UUID, "search-zerovote");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to filter segments by both min and max votes", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest2", maxVotes: 10, minVotes: 0 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 1);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-zerovote");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get first page of results", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest4" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 12);
                assert.strictEqual(data.page, 0);
                assert.strictEqual(segments[0].UUID, "search-page1-1");
                assert.strictEqual(segments[1].UUID, "search-page1-2");
                assert.strictEqual(segments[2].UUID, "search-page1-3");
                assert.strictEqual(segments[3].UUID, "search-page1-4");
                assert.strictEqual(segments[4].UUID, "search-page1-5");
                assert.strictEqual(segments[5].UUID, "search-page1-6");
                assert.strictEqual(segments[6].UUID, "search-page1-7");
                assert.strictEqual(segments[7].UUID, "search-page1-8");
                assert.strictEqual(segments[8].UUID, "search-page1-9");
                assert.strictEqual(segments[9].UUID, "search-page1-10");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get second page of results", (done) => {
        client.get(endpoint, { params: { videoID: "searchTest4", page: 1 } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const segments = data.segments;
                assert.strictEqual(data.segmentCount, 12);
                assert.strictEqual(data.page, 1);
                assert.strictEqual(segments[0].UUID, "search-page2-1");
                assert.strictEqual(segments[1].UUID, "search-page2-2");
                done();
            })
            .catch(err => done(err));
    });
});

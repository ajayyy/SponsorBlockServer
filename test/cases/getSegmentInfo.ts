import { db } from "../../src/databases/databases";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import assert from "assert";
import { client } from "../utils/httpClient";
import { insertSegment } from "../utils/segmentQueryGen";
import { genRandom } from "../utils/genRandom";

const endpoint = "/api/segmentInfo";
const singleUUIDLookup = (UUID: string) => client.get(endpoint, { params: { UUID } });

const genUUID = () => genRandom(66).substring(0, 65);

const assertParams = async (params: any, expected: any) => {
    const res = await client.get(endpoint, { params });
    assert.strictEqual(res.status, 200);
    assert.ok(partialDeepEquals(res.data, expected));
};

const assertSingleUUID = async (UUID: string, expected: any) => {
    const res = await singleUUIDLookup(UUID);
    assert.strictEqual(res.status, 200);
    assert.ok(partialDeepEquals(res.data, expected));
};

const assertStatus = (params: string, status: number) =>
    client.get(`${endpoint}${params}`)
        .then(res => assert.strictEqual(res.status, status));

const ENOENTID = genUUID();
const upvotedID = genUUID();
const downvotedID = genUUID();
const lockedupID = genUUID();
const infvotesID = genUUID();
const shadowhiddenID = genUUID();
const lockeddownID = genUUID();
const hiddenID = genUUID();
const fillerID1 = genUUID();
const fillerID2 = genUUID();
const fillerID3 = genUUID();
const fillerID4 = genUUID();
const fillerID5 = genUUID();
const oldID = `${genRandom(8)}-${genRandom(4)}-${genRandom(4)}-${genRandom(4)}-${genRandom(12)}`;
const userAgents = {
    vanced: "Vanced/5.0",
    meabot: "Meabot/5.0",
    mpv: "mpv_sponsorblock/5.0",
    nodesb: "node_sponsorblock/0.2.0",
    blank: ""
};

describe("getSegmentInfo", () => {
    before(async () => {
        await insertSegment(db, { UUID: upvotedID, videoID: "segmentInfoUpvoted", votes: 2, userAgent: userAgents.vanced });
        await insertSegment(db, { UUID: downvotedID, videoID: "segmentInfoDownvoted", votes: -2, userAgent: userAgents.meabot });
        await insertSegment(db, { UUID: lockedupID, videoID: "segmentInfoLockedup", votes: 2, locked: true, userAgent: userAgents.mpv });
        await insertSegment(db, { UUID: infvotesID, videoID: "segmentInfoInfvotes", votes: 100000, userAgent: userAgents.nodesb });
        await insertSegment(db, { UUID: hiddenID, videoID: "segmentInfoHidden", hidden: true });
        await insertSegment(db, { UUID: shadowhiddenID, videoID: "segmentInfoShadowhidden",shadowHidden: true });
        await insertSegment(db, { UUID: lockeddownID, videoID: "segmentInfoLockedown", votes: -2, locked: true });
        await insertSegment(db, { UUID: oldID, videoID: "segmentInfoOldID", votes: 1 });
        await insertSegment(db, { UUID: fillerID1, videoID: "segmentInfoFiller" });
        await insertSegment(db, { UUID: fillerID2, videoID: "segmentInfoFiller" });
        await insertSegment(db, { UUID: fillerID3, videoID: "segmentInfoFiller" });
        await insertSegment(db, { UUID: fillerID4, videoID: "segmentInfoFiller" });
        await insertSegment(db, { UUID: fillerID5, videoID: "segmentInfoFiller" });
    });

    // test against expected data
    it("Should be able to retreive upvoted segment", () => {
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2,
            userAgent: userAgents.vanced,
        }];
        return assertSingleUUID(upvotedID, expected);
    });

    it("Should be able to retreive downvoted segment", () => {
        const expected = [{
            videoID: "segmentInfoDownvoted",
            votes: -2,
            userAgent: userAgents.meabot,
        }];
        return assertSingleUUID(downvotedID, expected);
    });

    it("Should be able to retreive locked up segment", () => {
        const expected = [{
            videoID: "segmentInfoLockedup",
            locked: 1,
            votes: 2,
            userAgent: userAgents.mpv,
        }];
        return assertSingleUUID(lockedupID, expected);
    });

    it("Should be able to retreive infinite vote segment", () => {
        const expected = [{
            videoID: "segmentInfoInfvotes",
            votes: 100000,
            userAgent: userAgents.nodesb,
        }];
        return assertSingleUUID(infvotesID, expected);
    });

    it("Should be able to retreive shadowhidden segment", () => {
        const expected = [{
            videoID: "segmentInfoShadowhidden",
            shadowHidden: 1,
            userAgent: userAgents.blank,
        }];
        return assertSingleUUID(shadowhiddenID, expected);
    });

    it("Should be able to retreive locked down segment", () => {
        const expected = [{
            videoID: "segmentInfoLockedown",
            locked: 1,
            votes: -2,
        }];
        return assertSingleUUID(lockeddownID, expected);
    });

    it("Should be able to retreive hidden segment", () => {
        const expected = [{
            videoID: "segmentInfoHidden",
            hidden: 1,
        }];
        return assertSingleUUID(hiddenID, expected);
    });

    it("Should be able to retreive segment with old ID", () => {
        const expected = [{
            videoID: "segmentInfoOldID",
            votes: 1,
        }];
        return assertSingleUUID(oldID, expected);
    });

    // array tests against expected
    it("Should be able to retreive single segment in array", async () => {
        const res = await client.get(endpoint, { params: { UUIDs: `["${upvotedID}"]` } });
        assert.strictEqual(res.status, 200);
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2,
        }];
        assert.ok(partialDeepEquals(res.data, expected));
    });

    it("Should be able to retreive multiple segments in array", () => {
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2,
        }, {
            videoID: "segmentInfoDownvoted",
            votes: -2,
        }];
        const UUIDs = `["${upvotedID}", "${downvotedID}"]`;
        return assertParams({ UUIDs }, expected);
    });

    it("Should be possible to send unexpected query parameters", () => {
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2,
        }];
        return assertParams({ UUID: upvotedID, fakeparam: "hello", category: "sponsor" }, expected);
    });

    // array tests
    // array 200 tests
    it("Should return 400 if array passed to UUID", () =>
        assertStatus(`?UUID=["${upvotedID}", "${downvotedID}"]`, 400)
    );

    // array 400 tests
    it("Should return 400 if bad array passed to UUIDs", () =>
        assertStatus("?UUIDs=[not-quoted,not-quoted]", 400)
    );

    it("Should return 404 if unknown UUID passed", () => {
        const uuid = genUUID();
        assertStatus(`?UUID=${uuid}`, 404);
    });

    it("Should return 404 if unknown UUIDs passed in array", () => {
        const uuid1 = genUUID();
        const uuid2 = genUUID();
        assertStatus(`?UUIDs=["${uuid1}", "${uuid2}"]`, 404);
    });

    it("Should return good UUID when mixed with bad UUIDs", async () => {
        const res = await client.get(`${endpoint}?UUIDs=["${upvotedID}", "anotherfakeuuid"]`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.length, 1);
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2,
        }];
        assert.ok(partialDeepEquals(res.data, expected));
    });

    it("Should cut off array at 10", async function() {
        this.timeout(10000);
        const UUIDs = [
            upvotedID,
            downvotedID,
            lockedupID,
            shadowhiddenID,
            lockeddownID,
            hiddenID,
            fillerID1,
            fillerID2,
            fillerID3,
            fillerID4,
            fillerID5,
        ];
        const res = await client.get(endpoint, { params: { UUIDs: JSON.stringify(UUIDs) } });
        assert.strictEqual(res.status, 200);
        const data = res.data;
        assert.strictEqual(data.length, 10);
        assert.strictEqual(data.length, 10);
        assert.strictEqual(data[0].videoID, "segmentInfoUpvoted");
        assert.strictEqual(data[0].votes, 2);
        assert.strictEqual(data[9].videoID, "segmentInfoFiller");
        assert.strictEqual(data[9].UUID, fillerID4);
    });

    it("Should not duplicate reponses", async () => {
        const UUIDs = Array(10).fill(upvotedID);
        UUIDs.push(downvotedID);
        const res = await client.get(`${endpoint}?UUIDs=${JSON.stringify(UUIDs)}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.length, 2);
    });

    it("Should return 404 if UUID not found", () =>
        assertStatus(`?UUID=${ENOENTID}`, 404)
    );

    it("Should be able to retreive multiple segments with multiple parameters", async () => {
        const res = await client.get(`${endpoint}?UUID=${upvotedID}&UUID=${downvotedID}`);
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2,
        }, {
            videoID: "segmentInfoDownvoted",
            votes: -2,
        }];
        assert.strictEqual(res.status, 200);
        assert.ok(partialDeepEquals(res.data, expected));
        assert.strictEqual(res.data.length, 2);
    });

    it("Should not parse repeated UUID if UUIDs present", async () => {
        const res = await client.get(`${endpoint}?UUID=${downvotedID}&UUID=${lockedupID}&UUIDs=["${upvotedID}"]`);
        const expected = [{
            videoID: "segmentInfoUpvoted",
            votes: 2
        }];
        assert.strictEqual(res.status, 200);
        assert.ok(partialDeepEquals(res.data, expected));
    });

    it("Should return 400 if no UUIDs not sent", () =>
        assertStatus("", 400)
    );
});

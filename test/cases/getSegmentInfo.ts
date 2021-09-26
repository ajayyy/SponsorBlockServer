import { db } from "../../src/databases/databases";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import assert from "assert";
import { client } from "../utils/httpClient";

const ENOENTID =        "0".repeat(64);
const upvotedID =       `a${"0".repeat(63)}`;
const downvotedID =     `b${"0".repeat(63)}`;
const lockedupID =      `c${"0".repeat(63)}`;
const infvotesID =      `d${"0".repeat(63)}`;
const shadowhiddenID =  `e${"0".repeat(63)}`;
const lockeddownID =    `f${"0".repeat(63)}`;
const hiddenID =        `1${"0".repeat(63)}`;
const fillerID1 =       `11${"0".repeat(62)}`;
const fillerID2 =       `12${"0".repeat(62)}`;
const fillerID3 =       `13${"0".repeat(62)}`;
const fillerID4 =       `14${"0".repeat(62)}`;
const fillerID5 =       `15${"0".repeat(62)}`;
const oldID =           `${"0".repeat(8)}-${"0000-".repeat(3)}${"0".repeat(12)}`;
const userAgents = {
    vanced: "Vanced/5.0",
    meabot: "Meabot/5.0",
    mpv: "mpv_sponsorblock/5.0",
    nodesb: "node_sponsorblock/0.2.0",
    blank: ""
};

const endpoint = "/api/segmentInfo";
const singleUUIDLookup = (UUID: string) => client.get(endpoint, { params: { UUID } });

describe("getSegmentInfo", () => {
    before(async () => {
        const insertQuery = `INSERT INTO 
            "sponsorTimes"("videoID", "startTime", "endTime", "votes", "locked",
            "UUID", "userID", "timeSubmitted", "views", "hidden", "shadowHidden", "userAgent") 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.prepare("run", insertQuery, ["segmentInfoUpvoted", 1, 10, 2, 0, upvotedID,             "segmentInfoUser", 0, 50, 0, 0, userAgents.vanced]);
        await db.prepare("run", insertQuery, ["segmentInfoDownvoted", 1, 10, -2, 0, downvotedID,        "segmentInfoUser", 0, 50, 0, 0, userAgents.meabot]);
        await db.prepare("run", insertQuery, ["segmentInfoLockedup", 1, 10, 2, 1, lockedupID,           "segmentInfoUser", 0, 50, 0, 0, userAgents.mpv]);
        await db.prepare("run", insertQuery, ["segmentInfoInfvotes", 1, 10, 100000, 0, infvotesID,      "segmentInfoUser", 0, 50, 0, 0, userAgents.nodesb]);
        await db.prepare("run", insertQuery, ["segmentInfoHidden", 1, 10, 2, 0, hiddenID,               "segmentInfoUser", 0, 50, 1, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoShadowhidden", 1, 10, 2, 0, shadowhiddenID,   "segmentInfoUser", 0, 50, 0, 1, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoLockedown", 1, 10, -2, 1, lockeddownID,       "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoOldID", 1, 10, 1, 0, oldID,                   "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoUpvoted", 1, 2, 1, 0, fillerID1,              "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoFiller", 2, 3, 1, 0, fillerID2,               "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoFiller", 3, 4, 1, 0, fillerID3,               "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoFiller", 4, 5, 1, 0, fillerID4,               "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
        await db.prepare("run", insertQuery, ["segmentInfoFiller", 5, 6, 1, 0, fillerID5,               "segmentInfoUser", 0, 50, 0, 0, userAgents.blank]);
    });

    it("Should be able to retreive upvoted segment", (done) => {
        singleUUIDLookup(upvotedID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2,
                    userAgent: userAgents.vanced,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive downvoted segment", (done) => {
        singleUUIDLookup(downvotedID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoDownvoted",
                    votes: -2,
                    userAgent: userAgents.meabot,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive locked up segment", (done) => {
        singleUUIDLookup(lockedupID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoLockedup",
                    locked: 1,
                    votes: 2,
                    userAgent: userAgents.mpv,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive infinite vote segment", (done) => {
        singleUUIDLookup(infvotesID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoInfvotes",
                    votes: 100000,
                    userAgent: userAgents.nodesb,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive shadowhidden segment", (done) => {
        singleUUIDLookup(shadowhiddenID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoShadowhidden",
                    shadowHidden: 1,
                    userAgent: userAgents.blank,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive locked down segment", (done) => {
        singleUUIDLookup(lockeddownID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoLockedown",
                    locked: 1,
                    votes: -2,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive hidden segment", (done) => {
        singleUUIDLookup(hiddenID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoHidden",
                    hidden: 1,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive segment with old ID", (done) => {
        singleUUIDLookup(oldID)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoOldID",
                    votes: 1,
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive single segment in array", (done) => {
        client.get(endpoint, { params: { UUIDs: `["${upvotedID}"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2,
                }];
                assert.strictEqual(data.length, 1);
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive multiple segments in array", (done) => {
        client.get(endpoint, { params: { UUIDs: `["${upvotedID}", "${downvotedID}"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2,
                }, {
                    videoID: "segmentInfoDownvoted",
                    votes: -2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be possible to send unexpected query parameters", (done) => {
        client.get(endpoint, { params: { UUID: upvotedID, fakeparam: "hello", category: "sponsor" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if array passed to UUID", (done) => {
        client.get(`${endpoint}?UUID=["${upvotedID}", "${downvotedID}"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if bad array passed to UUIDs", (done) => {
        client.get(`${endpoint}?UUIDs=[not-quoted,not-quoted]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if bad UUID passed", (done) => {
        client.get(`${endpoint}?UUID=notarealuuid`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if bad UUIDs passed in array", (done) => {
        client.get(`${endpoint}?UUIDs=["notarealuuid", "anotherfakeuuid"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return good UUID when mixed with bad UUIDs", (done) => {
        client.get(`${endpoint}?UUIDs=["${upvotedID}", "anotherfakeuuid"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should cut off array at 10", function(done) {
        this.timeout(10000);
        const filledIDArray = `["${upvotedID}", "${downvotedID}", "${lockedupID}", "${shadowhiddenID}", "${lockeddownID}", "${hiddenID}", "${fillerID1}", "${fillerID2}", "${fillerID3}", "${fillerID4}", "${fillerID5}"]`;
        client.get(endpoint, { params: { UUIDs: filledIDArray } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.strictEqual(data.length, 10);
                assert.strictEqual(data[0].videoID, "segmentInfoUpvoted");
                assert.strictEqual(data[0].votes, 2);
                assert.strictEqual(data[9].videoID, "segmentInfoFiller");
                assert.strictEqual(data[9].UUID, fillerID4);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not duplicate reponses", (done) => {
        client.get(`${endpoint}?UUIDs=["${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${downvotedID}"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if UUID not found", (done) => {
        client.get(endpoint, { params: { UUID: ENOENTID } })
            .then(res => {
                if (res.status !== 400) done(`non 400 response code: ${res.status}`);
                else done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive multiple segments with multiple parameters", (done) => {
        client.get(`${endpoint}?UUID=${upvotedID}&UUID=${downvotedID}`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2,
                }, {
                    videoID: "segmentInfoDownvoted",
                    votes: -2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not parse repeated UUID if UUIDs present", (done) => {
        client.get(`${endpoint}?UUID=${downvotedID}&UUID=${lockedupID}&UUIDs=["${upvotedID}"]`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "segmentInfoUpvoted",
                    votes: 2
                }];
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });
});

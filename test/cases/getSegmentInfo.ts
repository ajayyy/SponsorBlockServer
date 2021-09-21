import fetch from "node-fetch";
import { db } from "../../src/databases/databases";
import { Done, getbaseURL, partialDeepEquals } from "../utils";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";

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

describe("getSegmentInfo", () => {
    before(async () => {
        const insertQuery = `INSERT INTO 
            "sponsorTimes"("videoID", "startTime", "endTime", "votes", "locked",
            "UUID", "userID", "timeSubmitted", "views", "category", "service",
            "videoDuration", "hidden", "shadowHidden", "hashedVideoID", "userAgent") 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.prepare("run", insertQuery, ["upvoted", 1, 10, 2, 0, upvotedID, "testman", 0, 50, "sponsor", "YouTube", 100, 0, 0, getHash("upvoted", 1), userAgents.vanced]);
        await db.prepare("run", insertQuery, ["downvoted", 1, 10, -2, 0, downvotedID, "testman", 0, 50, "sponsor", "YouTube", 120, 0, 0, getHash("downvoted", 1), userAgents.meabot]);
        await db.prepare("run", insertQuery, ["locked-up", 1, 10, 2, 1, lockedupID, "testman", 0, 50, "sponsor", "YouTube", 101, 0, 0, getHash("locked-up", 1), userAgents.mpv]);
        await db.prepare("run", insertQuery, ["infvotes", 1, 10, 100000, 0, infvotesID, "testman", 0, 50, "sponsor", "YouTube", 101, 0, 0, getHash("infvotes", 1), userAgents.nodesb]);
        await db.prepare("run", insertQuery, ["hidden", 1, 10, 2, 0, hiddenID, "testman", 0, 50, "sponsor", "YouTube", 140, 1, 0, getHash("hidden", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["shadowhidden", 1, 10, 2, 0, shadowhiddenID, "testman", 0, 50, "sponsor", "YouTube", 140, 0, 1, getHash("shadowhidden", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["locked-down", 1, 10, -2, 1, lockeddownID, "testman", 0, 50, "sponsor", "YouTube", 200, 0, 0, getHash("locked-down", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["oldID", 1, 10, 1, 0, oldID, "testman", 0, 50, "sponsor", "YouTube", 300, 0, 0, getHash("oldID", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["filler", 1, 2, 1, 0, fillerID1, "testman", 0, 50, "sponsor", "YouTube", 300, 0, 0, getHash("filler", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["filler", 2, 3, 1, 0, fillerID2, "testman", 0, 50, "sponsor", "YouTube", 300, 0, 0, getHash("filler", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["filler", 3, 4, 1, 0, fillerID3, "testman", 0, 50, "sponsor", "YouTube", 300, 0, 0, getHash("filler", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["filler", 4, 5, 1, 0, fillerID4, "testman", 0, 50, "sponsor", "YouTube", 300, 0, 0, getHash("filler", 1), userAgents.blank]);
        await db.prepare("run", insertQuery, ["filler", 5, 6, 1, 0, fillerID5, "testman", 0, 50, "sponsor", "YouTube", 300, 0, 0, getHash("filler", 1), userAgents.blank]);
    });

    it("Should be able to retreive upvoted segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${upvotedID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2,
                    userAgent: userAgents.vanced,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive downvoted segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${downvotedID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "downvoted",
                    votes: -2,
                    userAgent: userAgents.meabot,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive locked up segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${lockedupID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "locked-up",
                    locked: 1,
                    votes: 2,
                    userAgent: userAgents.mpv,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive infinite vote segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${infvotesID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "infvotes",
                    votes: 100000,
                    userAgent: userAgents.nodesb,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive shadowhidden segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${shadowhiddenID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "shadowhidden",
                    shadowHidden: 1,
                    userAgent: userAgents.blank,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive locked down segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${lockeddownID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "locked-down",
                    locked: 1,
                    votes: -2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive hidden segment", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${hiddenID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "hidden",
                    hidden: 1,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive segment with old ID", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${oldID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "oldID",
                    votes: 1,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive single segment in array", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=["${upvotedID}"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2,
                }];
                assert.strictEqual(data.length, 1);
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive multiple segments in array", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=["${upvotedID}", "${downvotedID}"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2,
                }, {
                    videoID: "downvoted",
                    votes: -2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be possible to send unexpected query parameters", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${upvotedID}&fakeparam=hello&category=sponsor`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if array passed to UUID", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=["${upvotedID}", "${downvotedID}"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if bad array passed to UUIDs", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=[not-quoted,not-quoted]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if bad UUID passed", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=notarealuuid`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if bad UUIDs passed in array", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=["notarealuuid", "anotherfakeuuid"]`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return good UUID when mixed with bad UUIDs", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=["${upvotedID}", "anotherfakeuuid"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should cut off array at 10", function(done: Done) {
        this.timeout(10000);
        const filledIDArray = `["${upvotedID}", "${downvotedID}", "${lockedupID}", "${shadowhiddenID}", "${lockeddownID}", "${hiddenID}", "${fillerID1}", "${fillerID2}", "${fillerID3}", "${fillerID4}", "${fillerID5}"]`;
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=${filledIDArray}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.length, 10);
                assert.strictEqual(data[0].videoID, "upvoted");
                assert.strictEqual(data[0].votes, 2);
                assert.strictEqual(data[9].videoID, "filler");
                assert.strictEqual(data[9].UUID, fillerID4);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not duplicate reponses", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUIDs=["${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${upvotedID}", "${downvotedID}"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if UUID not found", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${ENOENTID}`)
            .then(res => {
                if (res.status !== 400) done(`non 400 respone code: ${res.status}`);
                else done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should be able to retreive multiple segments with multiple parameters", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${upvotedID}&UUID=${downvotedID}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2,
                }, {
                    videoID: "downvoted",
                    votes: -2,
                }];
                assert.ok(partialDeepEquals(data, expected));
                assert.strictEqual(data.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not parse repeated UUID if UUIDs present", (done: Done) => {
        fetch(`${getbaseURL()}/api/segmentInfo?UUID=${downvotedID}&UUID=${lockedupID}&UUIDs=["${upvotedID}"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID: "upvoted",
                    votes: 2
                }];
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });
});

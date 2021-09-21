import fetch from "node-fetch";
import { db } from "../../src/databases/databases.js";
import { Done, getbaseURL, partialDeepEquals } from "../utils.js";
import { getHash } from "../../src/utils/getHash.js";
import assert from "assert";

describe("getVideoSponsorTime (Old get method)", () => {
    before(async () => {
        const insertSponsorTimes = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimes, ["old-testtesttest", 1, 11, 2, "uuid-0", "testman", 0, 50, "sponsor", 0, getHash("old-testtesttest", 1)]);
        await db.prepare("run", insertSponsorTimes, ["old-testtesttest,test", 1, 11, 2, "uuid-1", "testman", 0, 50, "sponsor", 0, getHash("old-testtesttest,test", 1)]);
    });

    it("Should be able to get a time", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=old-testtesttest`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segment found", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=notarealvideo`)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });


    it("Should be possible to send unexpected query parameters", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=old-testtesttest&fakeparam=hello`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(() => done("couldn't callendpoint"));
    });

    it("Should be able send a comma in a query param", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=old-testtesttest,test`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    UUIDs: ["uuid-1"],
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get the correct time", (done: Done) => {
        fetch(`${getbaseURL()}/api/getVideoSponsorTimes?videoID=old-testtesttest`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    sponsorTimes: [[1, 11]],
                    UUIDs: ["uuid-0"]
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });
});

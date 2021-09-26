import { db } from "../../src/databases/databases";
import { partialDeepEquals } from "../utils/partialDeepEquals";
import assert from "assert";
import { client } from "../utils/httpClient";

const endpoint = "/api/getVideoSponsorTimes";
const getOldSponsorTime = (videoID: string) => client.get(endpoint, { params: { videoID } });

describe("getVideoSponsorTime (Old get method)", () => {
    before(async () => {
        const insertSponsorTimes = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertSponsorTimes, ["oldGetSponsorTime0",      1, 11, 2, "oldGetSponsorTime00", "oldGetSponsorTimeUser", 0, 50, "sponsor", 0]);
        await db.prepare("run", insertSponsorTimes, ["oldGetSponsorTime1,test", 1, 11, 2, "oldGetSponsorTime01", "oldGetSponsorTimeUser", 0, 50, "sponsor", 0]);
    });

    it("Should be able to get a time", (done) => {
        getOldSponsorTime("oldGetSponsorTime0")
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 404 if no segment found", (done) => {
        getOldSponsorTime("notarealvideo")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });


    it("Should be possible to send unexpected query parameters", (done) => {
        client.get(endpoint, { params: { videoID: "oldGetSponsorTime0", fakeparam: "hello" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(() => done("couldn't callendpoint"));
    });

    it("Should be able send a comma in a query param", (done) => {
        getOldSponsorTime("oldGetSponsorTime1,test")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    UUIDs: ["oldGetSponsorTime01"],
                };
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get the correct time", (done) => {
        getOldSponsorTime("oldGetSponsorTime0")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    sponsorTimes: [[1, 11]],
                    UUIDs: ["oldGetSponsorTime00"]
                };
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });
});

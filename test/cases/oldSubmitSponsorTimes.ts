import { partialDeepEquals } from "../utils/partialDeepEquals";import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";

const videoID1 = "dQw4w9WgXcQ";
const videoID2 = "dQw4w9WgXcE";
const userID = "testtesttesttesttesttesttesttesttest";
const endpoint = "/api/postVideoSponsorTimes";

describe("postVideoSponsorTime (Old submission method)", () => {
    it("Should be able to submit a time (GET)", (done) => {
        client.get(endpoint, { params: { videoID: videoID1, startTime: 1, endTime: 10, userID } })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID1]);
                const expected = {
                    startTime: 1,
                    endTime: 10,
                    category: "sponsor"
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a time (POST)", (done) => {
        client({
            url: endpoint,
            params: { videoID: videoID2, startTime: 1, endTime: 11, userID },
            method: "post",
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, [videoID2]);
                const expected = {
                    startTime: 1,
                    endTime: 11,
                    category: "sponsor"
                };
                assert.ok(partialDeepEquals(row, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params", (done) => {
        client.post(endpoint, { params: { startTime: 1, endTime: 10, userID } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

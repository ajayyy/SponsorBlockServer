import fetch from "node-fetch";
import {Done, getbaseURL} from "../utils";
import {db} from "../../src/databases/databases";
import assert from "assert";

describe("postVideoSponsorTime (Old submission method)", () => {
    it("Should be able to submit a time (GET)", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/postVideoSponsorTimes?videoID=dQw4w9WgXcQ&startTime=1&endTime=10&userID=testtesttesttesttesttesttesttesttest`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcQ"]);
                assert.strictEqual(row.startTime, 1);
                assert.strictEqual(row.endTime, 10);
                assert.strictEqual(row.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a time (POST)", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/postVideoSponsorTimes?videoID=dQw4w9WgXcE&startTime=1&endTime=11&userID=testtesttesttesttesttesttesttesttest`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await db.prepare("get", `SELECT "startTime", "endTime", "category" FROM "sponsorTimes" WHERE "videoID" = ?`, ["dQw4w9WgXcE"]);
                assert.strictEqual(row.startTime, 1);
                assert.strictEqual(row.endTime, 11);
                assert.strictEqual(row.category, "sponsor");
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=testtesttesttesttesttesttesttesttest`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

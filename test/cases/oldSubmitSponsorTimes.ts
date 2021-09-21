import fetch from "node-fetch";
import { Done } from "../utils/utils";
import { getbaseURL } from "../utils/getBaseURL";
import { partialDeepEquals } from "../utils/partialDeepEquals";import {db} from "../../src/databases/databases";
import assert from "assert";

const videoID1 = "dQw4w9WgXcQ";
const videoID2 = "dQw4w9WgXcE";
const userID = "testtesttesttesttesttesttesttesttest";

describe("postVideoSponsorTime (Old submission method)", () => {
    it("Should be able to submit a time (GET)", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/postVideoSponsorTimes?videoID=${videoID1}&startTime=1&endTime=10&userID=${userID}`)
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

    it("Should be able to submit a time (POST)", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/postVideoSponsorTimes?videoID=${videoID2}&startTime=1&endTime=11&userID=${userID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

    it("Should return 400 for missing params", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/postVideoSponsorTimes?startTime=1&endTime=10&userID=${userID}`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

import fetch from "node-fetch";
import { Done, getbaseURL } from "../utils.js";
import { db } from "../../src/databases/databases.js";
import { getHash } from "../../src/utils/getHash.js";
import assert from "assert";

describe("getSavedTimeForUser", () => {
    before(async () => {
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES';
        await db.prepare("run", `${startOfQuery}(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ["getSavedTimeForUser", 1, 11, 2, "abc1239999", getHash("testman"), 0, 50, "sponsor", 0, getHash("getSavedTimeForUser", 0)]);
        return;
    });

    it("Should be able to get a 200", (done: Done) => {
        fetch(`${getbaseURL()}/api/getSavedTimeForUser?userID=testman`)
            .then(async res => {
                const data = await res.json();
                // (end-start)*minute * views
                const savedMinutes = ((11-1)/60) * 50;
                const expected = {
                    timeSaved: savedMinutes
                };
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch((err) => done(err));
    });
});

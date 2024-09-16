import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { deepStrictEqual } from "assert";
import { client } from "../utils/httpClient";
import assert from "assert";

// helpers
const endpoint = "/api/getSavedTimeForUser";
const isoDate = new Date().toISOString();

const getSavedTimeForUser = (userID: string) => client({
    url: endpoint,
    params: { userID }
});

describe("getSavedTimeForUser", () => {
    const user1 = "getSavedTimeForUser1";
    const user2 = "getSavedTimeforUser2";
    const [ start, end, views ] = [1, 11, 50];

    before(async () => {
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", "views", "shadowHidden", "updatedAt") VALUES';
        await db.prepare("run", `${startOfQuery}(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ["getSavedTimeForUser", start, end, 2, "getSavedTimeUUID0", getHash(user1), 0, views, 0, isoDate]);
        return;
    });
    it("Should be able to get a saved time", (done) => {
        getSavedTimeForUser(user1)
            .then(res => {
                // (end-start)*minute * views
                const savedMinutes = ((end-start)/60) * views;
                const expected = {
                    timeSaved: savedMinutes
                };
                deepStrictEqual(res.data, expected);
                done();
            })
            .catch((err) => done(err));
    });
    it("Should return 404 if no submissions", (done) => {
        getSavedTimeForUser(user2)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch((err) => done(err));
    });
    it("Should return 400 if no userID", (done) => {
        client({ url: endpoint })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch((err) => done(err));
    });
});

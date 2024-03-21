import { db } from "../../src/databases/databases";
import { deepStrictEqual } from "assert";
import { client } from "../utils/httpClient";
import assert from "assert";
import { insertSegment } from "../utils/segmentQueryGen";
import { genUser } from "../utils/genUser";

// helpers
const endpoint = "/api/getSavedTimeForUser";
const getSavedTimeForUser = (privID: string) => client({
    url: endpoint,
    params: { userID: privID }
});

describe("getSavedTimeForUser", () => {
    const user1 = genUser("getSavedTimeForUser", "user1");
    const user2 = genUser("getSavedTimeForUser", "user2");
    const [ start, end, views ] = [1, 11, 50];

    before(async () => {
        await insertSegment(db, { startTime: start, endTime: end, views, userID: user1.pubID });
    });
    it("Should be able to get a saved time", (done) => {
        getSavedTimeForUser(user1.privID)
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
        getSavedTimeForUser(user2.privID)
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

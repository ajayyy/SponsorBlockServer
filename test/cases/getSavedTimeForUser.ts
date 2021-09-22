import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import { deepStrictEqual } from "assert";
import { client } from "../utils/httpClient";
const endpoint = "/api/getSavedTimeForUser";

describe("getSavedTimeForUser", () => {
    const user1 = "getSavedTimeForUserUser";
    before(async () => {
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", "views", "shadowHidden") VALUES';
        await db.prepare("run", `${startOfQuery}(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ["getSavedTimeForUser", 1, 11, 2, "gstfu0", getHash(user1), 0, 50, 0]);
        return;
    });

    it("Should be able to get a 200", (done) => {
        client.get(endpoint, { params: { userID: user1 } })
            .then(res => {
                // (end-start)*minute * views
                const savedMinutes = ((11-1)/60) * 50;
                const expected = {
                    timeSaved: savedMinutes
                };
                deepStrictEqual(res.data, expected);
                done();
            })
            .catch((err) => done(err));
    });
});

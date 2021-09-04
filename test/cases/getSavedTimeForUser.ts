import fetch from "node-fetch";
import {Done, getbaseURL} from "../utils";
import {db} from "../../src/databases/databases";
import {getHash} from "../../src/utils/getHash";
import {deepStrictEqual} from "assert";

describe("getSavedTimeForUser", () => {
    before(async () => {
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", "views", "shadowHidden") VALUES';
        await db.prepare("run", `${startOfQuery}(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ["getSavedTimeForUser", 1, 11, 2, "gstfu0", getHash("getSavedTimeForUserUser"), 0, 50, 0]);
        return;
    });

    it("Should be able to get a 200", (done: Done) => {
        fetch(`${getbaseURL()}/api/getSavedTimeForUser?userID=getSavedTimeForUserUser`)
            .then(async res => {
                const data = await res.json();
                // (end-start)*minute * views
                const savedMinutes = ((11-1)/60) * 50;
                const expected = {
                    timeSaved: savedMinutes
                };
                deepStrictEqual(data, expected);
                done();
            })
            .catch((err) => done(err));
    });
});

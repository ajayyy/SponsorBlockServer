import fetch from "node-fetch";
import { Done, getbaseURL } from "../utils.js";
import { db } from "../../src/databases/databases.js";
import { getHash } from "../../src/utils/getHash.js";
import assert from "assert";

describe("postClearCache", () => {
    before(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES ('${getHash("clearing-vip")}')`);
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden", "hashedVideoID") VALUES';
        await db.prepare("run", `${startOfQuery}('clear-test', 0, 1, 2, 'clear-uuid', 'testman', 0, 50, 'sponsor', 0, '" + getHash("clear-test", 1) + "')`);
    });

    it("Should be able to clear cache for existing video", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/clearCache?userID=clearing-vip&videoID=clear-test`, {
            method: "POST"
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to clear cache for nonexistent video", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/clearCache?userID=clearing-vip&videoID=dne-video`, {
            method: "POST"
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should get 403 as non-vip", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/clearCache?userID=regular-user&videoID=clear-tes`, {
            method: "POST"
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should give 400 with missing videoID", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/clearCache?userID=clearing-vip`, {
            method: "POST"
        })
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should give 400 with missing userID", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/clearCache?userID=clearing-vip`, {
            method: "POST"
        })
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

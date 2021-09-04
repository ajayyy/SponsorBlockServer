import fetch from "node-fetch";
import {Done, getbaseURL} from "../utils";
import {db} from "../../src/databases/databases";
import {getHash} from "../../src/utils/getHash";
import assert from "assert";

const VIPUser = "clearCacheVIP";
const regularUser = "regular-user";

describe("postClearCache", () => {
    before(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES ('${getHash(VIPUser)}')`);
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", "views", "category", "shadowHidden") VALUES';
        await db.prepare("run", `${startOfQuery}('clear-test', 0, 1, 2, 'clear-uuid', 'testman', 0, 50, 'sponsor', 0)`);
    });

    it("Should be able to clear cache for existing video", (done: Done) => {
        fetch(`${getbaseURL()
        }/api/clearCache?userID=${VIPUser}&videoID=clear-test`, {
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
        }/api/clearCache?userID=${VIPUser}&videoID=dne-video`, {
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
        }/api/clearCache?userID=${regularUser}&videoID=clear-tes`, {
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
        }/api/clearCache?userID=${VIPUser}`, {
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
        }/api/clearCache?userID=${VIPUser}`, {
            method: "POST"
        })
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

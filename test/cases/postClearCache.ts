import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

const VIPUser = "clearCacheVIP";
const regularUser = "regular-user";
const endpoint = "/api/clearCache";
const postClearCache = (userID: string, videoID: string) => client({ method: "post", url: endpoint, params: { userID, videoID } });

describe("postClearCache", () => {
    before(async () => {
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES ('${getHash(VIPUser)}')`);
        const startOfQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", "views", "category", "shadowHidden") VALUES';
        await db.prepare("run", `${startOfQuery}('clear-test', 0, 1, 2, 'clear-uuid', 'testman', 0, 50, 'sponsor', 0)`);
    });

    it("Should be able to clear cache for existing video", (done) => {
        postClearCache(VIPUser, "clear-test")
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to clear cache for nonexistent video", (done) => {
        postClearCache(VIPUser, "dne-video")
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should get 403 as non-vip", (done) => {
        postClearCache(regularUser, "clear-test")
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should give 400 with missing videoID", (done) => {
        client.post(endpoint, { params: { userID: VIPUser } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should give 400 with missing userID", (done) => {
        client.post(endpoint, { params: { videoID: "clear-test" } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

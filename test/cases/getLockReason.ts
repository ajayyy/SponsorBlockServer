import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";

const endpoint = "/api/lockReason";

describe("getLockReason", () => {
    before(async () => {
        const vipUserID = "getLockReasonVIP";
        const vipUserHash = getHash(vipUserID);
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [vipUserHash]);
        await db.prepare("run", insertVipUserQuery, [vipUserHash]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [vipUserHash, "getLockReason", "sponsor", "sponsor-reason"]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserHash, "getLockReason", "interaction", "interaction-reason"]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserHash, "getLockReason", "preview", "preview-reason"]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserHash, "getLockReason", "music_offtopic", "nonmusic-reason"]);
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        if (version > 20) return;
        else return `Version isn't greater than 20. Version is ${version}`;
    });

    it("Should be able to get single reason", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", category: "sponsor" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "sponsor", locked: 1, reason: "sponsor-reason" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get empty locks", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", category: "intro" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "intro", locked: 0, reason: "" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should get multiple locks with array", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", categories: `["intro","sponsor"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "sponsor", locked: 1, reason: "sponsor-reason" },
                    { category: "intro", locked: 0, reason: "" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should get multiple locks with repeated category", (done) => {
        client.get(`${endpoint}?videoID=getLockReason&category=interaction&category=music_offtopic&category=intro`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "interaction", locked: 1, reason: "interaction-reason" },
                    { category: "music_offtopic", locked: 1, reason: "nonmusic-reason" },
                    { category: "intro", locked: 0, reason: "" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return all categories if none specified", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "sponsor", locked: 1, reason: "sponsor-reason" },
                    { category: "interaction", locked: 1, reason: "interaction-reason" },
                    { category: "preview", locked: 1, reason: "preview-reason" },
                    { category: "music_offtopic", locked: 1, reason: "nonmusic-reason" },
                    { category: "selfpromo", locked: 0, reason: "" },
                    { category: "intro", locked: 0, reason: "" },
                    { category: "outro", locked: 0, reason: "" },
                    { category: "poi_highlight", locked: 0, reason: "" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if no videoID specified", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

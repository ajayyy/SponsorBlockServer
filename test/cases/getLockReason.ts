import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { partialDeepEquals } from "../utils/partialDeepEquals";

const endpoint = "/api/lockReason";

const vipUserName1 = "getLockReason-vipUserName_1";
const vipUserID1 = getHash("getLockReason-vipUserID_1");
const vipUserName2 = "getLockReason-vipUserName_2";
const vipUserID2 = getHash("getLockReason-vipUserID_2");
const isoDate = new Date().toISOString();

describe("getLockReason", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID", "createdAt") VALUES (?, ?)';
        await db.prepare("run", insertVipUserQuery, [vipUserID1, isoDate]);
        await db.prepare("run", insertVipUserQuery, [vipUserID2, isoDate]);

        const insertVipUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertVipUserNameQuery, [vipUserID1, vipUserName1, isoDate, isoDate]);
        await db.prepare("run", insertVipUserNameQuery, [vipUserID2, vipUserName2, isoDate, isoDate]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "actionType", "category", "reason", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [vipUserID1, "getLockReason", "skip", "sponsor", "sponsor-reason", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserID1, "getLockReason", "skip", "interaction", "interaction-reason", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserID1, "getLockReason", "skip", "preview", "preview-reason", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserID1, "getLockReason", "mute", "music_offtopic", "nonmusic-reason", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserID2, "getLockReason", "mute", "outro", "outro-reason", isoDate, isoDate]);
        await db.prepare("run", insertLockCategoryQuery, [vipUserID2, "getLockReason", "full", "selfpromo", "selfpromo-reason", isoDate, isoDate]);
    });

    after(async () => {
        const deleteUserNameQuery = 'DELETE FROM "userNames" WHERE "userID" = ? AND "userName" = ?';
        await db.prepare("run", deleteUserNameQuery, [vipUserID1, vipUserName1]);
        await db.prepare("run", deleteUserNameQuery, [vipUserID2, vipUserName2]);
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
                    { category: "sponsor", locked: 1, reason: "sponsor-reason", userID: vipUserID1, userName: vipUserName1 }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get with actionTypes array", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", category: "selfpromo", actionTypes: '["full"]' } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "selfpromo", locked: 1, reason: "selfpromo-reason", userID: vipUserID2, userName: vipUserName2 }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get with actionType", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", category: "selfpromo", actionType: "full" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "selfpromo", locked: 1, reason: "selfpromo-reason", userID: vipUserID2, userName: vipUserName2 }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get with actionType array", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", category: "selfpromo", actionType: ["full"] } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "selfpromo", locked: 1, reason: "selfpromo-reason", userID: vipUserID2, userName: vipUserName2 }
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
                    { category: "intro", locked: 0, reason: "", userID: "", userName: "" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should get multiple locks with array", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason", categories: `["intro","sponsor","outro"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "intro", locked: 0, reason: "", userID: "", userName: "" },
                    { category: "sponsor", locked: 1, reason: "sponsor-reason", userID: vipUserID1, userName: vipUserName1 },
                    { category: "outro", locked: 1, reason: "outro-reason", userID: vipUserID2, userName: vipUserName2 }
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
                    { category: "interaction", locked: 1, reason: "interaction-reason", userID: vipUserID1, userName: vipUserName1  },
                    { category: "music_offtopic", locked: 1, reason: "nonmusic-reason", userID: vipUserID1, userName: vipUserName1  },
                    { category: "intro", locked: 0, reason: "", userID: "", userName: "" }
                ];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return all skip + mute categories if none specified", (done) => {
        client.get(endpoint, { params: { videoID: "getLockReason" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [
                    { category: "sponsor", locked: 1, reason: "sponsor-reason", userID: vipUserID1, userName: vipUserName1 },
                    { category: "selfpromo", locked: 0, reason: "", userID: "", userName: "" },
                    { category: "exclusive_access", locked: 0, reason: "", userID: "", userName: "" },
                    { category: "interaction", locked: 1, reason: "interaction-reason", userID: vipUserID1, userName: vipUserName1 },
                    { category: "intro", locked: 0, reason: "", userID: "", userName: "" },
                    { category: "outro", locked: 1, reason: "outro-reason", userID: vipUserID2, userName: vipUserName2 },
                    { category: "preview", locked: 1, reason: "preview-reason", userID: vipUserID1, userName: vipUserName1 },
                    { category: "music_offtopic", locked: 1, reason: "nonmusic-reason", userID: vipUserID1, userName: vipUserName1 },
                    { category: "filler", locked: 0, reason: "", userID: "", userName: "" },
                ];
                partialDeepEquals(res.data, expected, false);
                done();
            })
            .catch(err => done(err));
    });
});

describe("getLockReason 400", () => {
    it("Should return 400 with missing videoID", (done) => {
        client.get(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 with invalid actionTypes ", (done) => {
        client.get(endpoint, { params: { videoID: "valid-videoid", actionTypes: 3 } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 with invalid actionTypes JSON ", (done) => {
        client.get(endpoint, { params: { videoID: "valid-videoid", actionTypes: "{3}" } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 with invalid categories", (done) => {
        client.get(endpoint, { params: { videoID: "valid-videoid", categories: 3 } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 with invalid categories JSON", (done) => {
        client.get(endpoint, { params: { videoID: "valid-videoid", categories: "{3}" } })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

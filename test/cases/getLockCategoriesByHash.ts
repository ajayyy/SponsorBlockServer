import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { ActionType } from "../../src/types/segments.model";

const fakeHash = "b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35";
const endpoint = "/api/lockCategories";
const getLockCategories = (hash: string, actionType = [ActionType.Mute, ActionType.Skip]) => client.get(`${endpoint}/${hash}`, { params: { actionType } });

describe("getLockCategoriesByHash", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("getLockCategoriesHashVIP")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "actionType", "category", "reason", "hashedVideoID") VALUES (?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash1", "skip", "sponsor", "1-reason-short", getHash("getLockHash1", 1)]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash1", "skip", "interaction", "1-reason-longer", getHash("getLockHash1", 1)]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash2", "skip", "preview", "2-reason", getHash("getLockHash2", 1)]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash3", "skip", "nonmusic", "3-reason", getHash("getLockHash3", 1)]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-1", "mute", "outro", "fake1-reason", fakeHash]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-2", "mute", "intro", "fake2-longer-reason", fakeHash]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-2", "mute", "preview", "fake2-short", fakeHash]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-2", "full", "sponsor", "fake2-notshown", fakeHash]);
    });

    it("Database should be greater or equal to version 29", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert(
            version >= 29,
            `Version isn't greater than 29. Version is ${version}`);
    });

    it("Should be able to get multiple locks in one object", (done) => {
        const videoID = "getLockHash1";
        const hash = getHash(videoID, 1);
        getLockCategories(hash.substring(0,4))
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID,
                    hash,
                    categories: [
                        "sponsor",
                        "interaction"
                    ],
                    reason: "1-reason-longer"
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get single lock", (done) => {
        const videoID = "getLockHash2";
        const hash = getHash(videoID, 1);
        getLockCategories(hash.substring(0,6))
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID,
                    hash,
                    categories: [
                        "preview"
                    ],
                    reason: "2-reason"
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get by half full hash", (done) => {
        const videoID = "getLockHash3";
        const hash = getHash(videoID, 1);
        getLockCategories(hash.substring(0,32))
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID,
                    hash,
                    categories: [
                        "nonmusic"
                    ],
                    reason: "3-reason"
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get multiple by similar hash with multiple categories", (done) => {
        getLockCategories(fakeHash.substring(0,5))
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "fakehash-1",
                    hash: fakeHash,
                    categories: [
                        "outro"
                    ],
                    reason: "fake1-reason"
                }, {
                    videoID: "fakehash-2",
                    hash: fakeHash,
                    categories: [
                        "intro",
                        "preview"
                    ],
                    reason: "fake2-longer-reason"
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 once hash prefix varies", (done) => {
        getLockCategories("b05aa")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 if no lock exists", (done) => {
        getLockCategories("aaaaaa")
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if full hash sent", (done) => {
        getLockCategories(fakeHash)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if hash too short", (done) => {
        getLockCategories("00")
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if no hash specified", (done) => {
        getLockCategories("")
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get by actionType", (done) => {
        getLockCategories(fakeHash.substring(0,5), [ActionType.Full])
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = [{
                    videoID: "fakehash-2",
                    hash: fakeHash,
                    categories: [
                        "sponsor"
                    ],
                    reason: "fake2-notshown"
                }];
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });
});

import fetch from "node-fetch";
import { Done } from "../utils/utils";
import { getbaseURL } from "../utils/getBaseURL";
import {getHash} from "../../src/utils/getHash";
import {db} from "../../src/databases/databases";
import assert from "assert";

const fakeHash = "b05a20424f24a53dac1b059fb78d861ba9723645026be2174c93a94f9106bb35";

describe("getLockCategoriesByHash", () => {
    const endpoint = `${getbaseURL()}/api/lockCategories`;
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("getLockCategoriesHashVIP")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason", "hashedVideoID") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash1", "sponsor", "1-reason-short", getHash("getLockHash1", 1)]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash1", "interaction", "1-reason-longer", getHash("getLockHash1", 1)]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash2", "preview", "2-reason", getHash("getLockHash2", 1)]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "getLockHash3", "nonmusic", "3-reason", getHash("getLockHash3", 1)]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-1", "outro", "fake1-reason", fakeHash]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-2", "intro", "fake2-longer-reason", fakeHash]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesHashVIP"), "fakehash-2", "preview", "fake2-short", fakeHash]);
    });

    it("Database should be greater or equal to version 20", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert(
            version >= 20,
            `Version isn't greater than 20. Version is ${version}`);
    });

    it("Should be able to get multiple locks in one object", (done: Done) => {
        const videoID = "getLockHash1";
        const hash = getHash(videoID, 1);
        fetch(`${endpoint}/${hash.substring(0,4)}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID,
                    hash,
                    categories: [
                        "sponsor",
                        "interaction"
                    ],
                    reason: "1-reason-longer"
                }];
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get single lock", (done: Done) => {
        const videoID = "getLockHash2";
        const hash = getHash(videoID, 1);
        fetch(`${endpoint}/${hash.substring(0,6)}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID,
                    hash,
                    categories: [
                        "preview"
                    ],
                    reason: "2-reason"
                }];
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get by half full hash", (done: Done) => {
        const videoID = "getLockHash3";
        const hash = getHash(videoID, 1);
        fetch(`${endpoint}/${hash.substring(0,32)}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = [{
                    videoID,
                    hash,
                    categories: [
                        "nonmusic"
                    ],
                    reason: "3-reason"
                }];
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get multiple by similar hash with multiple categories", (done: Done) => {
        fetch(`${endpoint}/${fakeHash.substring(0,5)}`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
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
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 once hash prefix varies", (done: Done) => {
        fetch(`${endpoint}/b05aa`)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 if no lock exists", (done: Done) => {
        fetch(`${endpoint}/aaaaaa`)
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if no videoID specified", (done: Done) => {
        fetch(`${endpoint}/`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if full hash sent", (done: Done) => {
        fetch(`${endpoint}/${fakeHash}`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if hash too short", (done: Done) => {
        fetch(`${endpoint}/00`)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 400 if no hash specified", (done: Done) => {
        fetch(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
});

import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { mixedDeepEquals } from "../utils/partialDeepEquals";
const endpoint = "/api/lockCategories";
const defaultActionTypes = ["skip", "mute"];
const getLockCategories = (videoID: string, actionTypes = defaultActionTypes, service = "YouTube") => client.get(endpoint, { params: { videoID, actionTypes, service } });

describe("getLockCategories", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("getLockCategoriesVIP")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "actionType","category", "reason", "service") VALUES (?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesVIP"), "getLockCategory1", "skip", "sponsor", "1-short", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesVIP"), "getLockCategory1", "mute", "interaction", "1-longer-reason", "YouTube"]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesVIP"), "getLockCategory2", "skip", "preview", "2-reason", "YouTube"]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesVIP"), "getLockCategory3", "mute", "nonmusic", "3-reason", "PeerTube"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesVIP"), "getLockCategory3", "skip", "sponsor", "3-reason", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("getLockCategoriesVIP"), "getLockCategory3", "full", "outro", "3-longer-reason", "YouTube"]);
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert.ok(version >= 29, `Version isn't greater than 29. Version is ${version}`);
    });

    it("Should be able to get multiple locks", (done) => {
        getLockCategories("getLockCategory1")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "sponsor",
                        "interaction"
                    ],
                    reason: "1-longer-reason",
                    actionTypes: defaultActionTypes
                };
                assert.ok(mixedDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get single locks", (done) => {
        getLockCategories("getLockCategory2")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "preview"
                    ],
                    reason: "2-reason",
                    actionTypes: defaultActionTypes
                };
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 if no lock exists", (done) => {
        getLockCategories("getLockCategoryNull")
            .then(res => {
                assert.strictEqual(res.status, 404);
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

    it("Should be able to get multiple locks with service", (done) => {
        getLockCategories("getLockCategory1", defaultActionTypes, "YouTube")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "sponsor",
                        "interaction"
                    ],
                    reason: "1-longer-reason",
                    actionTypes: defaultActionTypes
                };
                assert.ok(mixedDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get single locks with service", (done) => {
        getLockCategories("getLockCategory3", defaultActionTypes, "PeerTube")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "nonmusic"
                    ],
                    reason: "3-reason",
                    actionTypes: defaultActionTypes
                };
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get single locks with service", (done) => {
        getLockCategories("getLockCategory3", defaultActionTypes, "Youtube")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "sponsor"
                    ],
                    reason: "3-reason",
                    actionTypes: defaultActionTypes
                };
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return result from Youtube service if service not match", (done) => {
        getLockCategories("getLockCategory3", defaultActionTypes, "Dailymotion")
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "sponsor"
                    ],
                    reason: "3-reason",
                    actionTypes: defaultActionTypes
                };
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("should return 404 if invalid actionTypes specified", (done) => {
        getLockCategories("getLockCategory1", ["ban"])
            .then(res => {
                assert.strictEqual(res.status, 404);
                done();
            })
            .catch(err => done(err));
    });

    it("should be able to get with specific actionType", (done) => {
        getLockCategories("getLockCategory1", ["mute"])
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "sponsor",
                        "interaction"
                    ],
                    reason: "1-longer-reason",
                    actionTypes: ["mute"]
                };
                mixedDeepEquals(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get skip, mute, full", (done) => {
        const actionTypes = [...defaultActionTypes, "full"]
        getLockCategories("getLockCategory3",actionTypes )
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    categories: [
                        "nonmusic",
                        "outro"
                    ],
                    reason: "3-longer-reason",
                    actionTypes
                };
                mixedDeepEquals(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });
});

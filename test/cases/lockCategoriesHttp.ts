import assert from "assert";
import { client } from "../utils/httpClient";
import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import { UserID } from "../../src/types/user.model";
import { Category, VideoID } from "../../src/types/segments.model";

interface LockCategory {
    category: Category,
    reason: string,
    videoID: VideoID,
    userID: UserID
}
const lockVIPUser = "lockCategoriesHttpVIPUser";
const lockVIPUserHash = getHash(lockVIPUser);
const endpoint = "/api/lockCategories";
const checkLockCategories = (videoID: string): Promise<LockCategory[]> => db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', [videoID]);


const goodResponse = (): any => ({
    videoID: "test-videoid",
    userID: "not-vip-test-userid",
    categories: ["sponsor"],
    actionTypes: ["skip"]
});

describe("POST lockCategories HTTP submitting", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [lockVIPUserHash]);
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert.ok(version > 1);
    });

    it("should be able to add poi type category by type skip", (done) => {
        const videoID = "add-record-poi";
        client.post(endpoint, {
            videoID,
            userID: lockVIPUser,
            categories: ["poi_highlight"],
            actionTypes: ["skip"]
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                checkLockCategories(videoID)
                    .then(result => {
                        assert.strictEqual(result.length, 1);
                        assert.strictEqual(result[0], "poi_highlight");
                    });
                done();
            })
            .catch(err => done(err));
    });

    it("Should not add lock of invalid type", (done) => {
        const videoID = "add_invalid_type";
        client.post(endpoint, {
            videoID,
            userID: lockVIPUser,
            categories: ["future_unused_invalid_type"],
            actionTypes: ["skip"]
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                checkLockCategories(videoID)
                    .then(result => {
                        assert.strictEqual(result.length, 0);
                    });
                done();
            })
            .catch(err => done(err));
    });
});

describe("DELETE lockCategories 403/400 tests", () => {
    it(" Should return 400 for no data", (done) => {
        client.delete(endpoint, {})
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no categories", (done) => {
        const json: any = {
            videoID: "test",
            userID: "test",
            categories: [],
        };
        client.delete(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no userID", (done) => {
        const json: any = {
            videoID: "test",
            userID: null,
            categories: ["sponsor"],
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no videoID", (done) => {
        const json: any = {
            videoID: null,
            userID: "test",
            categories: ["sponsor"],
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for invalid category array", (done) => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: {},
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for bad format categories", (done) => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: "sponsor",
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 403 if user is not VIP", (done) => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: [
                "sponsor",
            ],
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });
});

describe("manual DELETE/POST lockCategories 400 tests", () => {
    it("DELETE Should return 400 for no data", (done) => {
        client.delete(endpoint, { data: {} })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("POST Should return 400 for no data", (done) => {
        client.post(endpoint, {})
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("DELETE Should return 400 for bad format categories", (done) => {
        const data = goodResponse();
        data.categories = "sponsor";
        client.delete(endpoint, { data })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("POST Should return 400 for bad format categories", (done) => {
        const data = goodResponse();
        data.categories = "sponsor";
        client.post(endpoint, data)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });
    it("DELETE Should return 403 if user is not VIP", (done) => {
        const data = goodResponse();
        client.delete(endpoint, { data })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });
    it("POST Should return 403 if user is not VIP", (done) => {
        const data = goodResponse();
        client.post(endpoint, data)
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });
});

describe("array of DELETE/POST lockCategories 400 tests", () => {
    for (const key of [ "videoID", "userID", "categories" ]) {
        for (const method of ["DELETE", "POST"]) {
            it(`${method} - Should return 400 for invalid ${key}`, (done) => {
                const data = goodResponse();
                data[key] = null;
                client(endpoint, { data, method })
                    .then(res => {
                        assert.strictEqual(res.status, 400);
                        done();
                    })
                    .catch(err => done(err));
            });
        }
    }
});
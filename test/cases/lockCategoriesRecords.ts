import {getHash} from "../../src/utils/getHash";
import {db} from "../../src/databases/databases";
import assert from "assert";
import {LockCategory } from "../../src/types/segments.model";
import { client } from "../utils/httpClient";

const stringDeepEquals = (a: string[] ,b: string[]): boolean => {
    let result = true;
    b.forEach((e) => {
        if (!a.includes(e)) result = false;
    });
    return result;
};

const endpoint = "/api/lockCategories";
const submitEndpoint = "/api/skipSegments";
const checkLockCategories = (videoID: string): Promise<LockCategory[]> => db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', [videoID]);
const lockVIPUser = "lockCategoriesRecordsVIPUser";
const lockVIPUserHash = getHash(lockVIPUser);

describe("lockCategoriesRecords", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [lockVIPUserHash]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id", "sponsor", "reason-1"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id", "intro", "reason-1"]);

        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id-1", "sponsor", "reason-2"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id-1", "intro", "reason-2"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "lockCategoryVideo", "sponsor", "reason-3"]);

        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record", "sponsor", "reason-4"]);

        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-1", "sponsor", "reason-5"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-1", "intro", "reason-5"]);
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert.ok(version > 1);
    });

    it("Should be able to submit categories not in video (http response)", (done) => {
        const json = {
            videoID: "no-segments-video-id",
            userID: "lockCategoriesRecordsVIPUser",
            categories: [
                "outro",
                "shilling",
                "shilling",
                "shil ling",
                "",
                "intro",
            ],
        };
        const expected = {
            submitted: [
                "outro",
                "shilling",
            ],
        };
        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.deepStrictEqual(res.data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories not in video (sql check)", (done) => {
        const videoID = "no-segments-video-id-1";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "outro",
                "shilling",
                "shilling",
                "shil ling",
                "",
                "intro",
            ],
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 4);
                const oldRecordNotChangeReason = result.filter(item =>
                    item.reason === "reason-2" && ["sponsor", "intro"].includes(item.category)
                );
                const newRecordWithEmptyReason = result.filter(item =>
                    item.reason === "" && ["outro", "shilling"].includes(item.category)
                );
                assert.strictEqual(newRecordWithEmptyReason.length, 2);
                assert.strictEqual(oldRecordNotChangeReason.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories not in video with reason (http response)", (done) => {
        const videoID = "no-segments-video-id";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "outro",
                "shilling",
                "shilling",
                "shil ling",
                "",
                "intro",
            ],
            reason: "new reason"
        };
        const expected = {
            submitted: [
                "outro",
                "shilling",
                "intro"
            ],
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.deepStrictEqual(res.data.submitted, expected.submitted);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories not in video with reason (sql check)", (done) => {
        const videoID = "no-segments-video-id-1";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "outro",
                "shilling",
                "shilling",
                "shil ling",
                "",
                "intro",
            ],
            reason: "new reason"
        };

        const expectedWithNewReason = [
            "outro",
            "shilling",
            "intro"
        ];

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 4);
                const newRecordWithNewReason = result.filter(item =>
                    expectedWithNewReason.includes(item.category) && item.reason === "new reason"
                );
                const oldRecordNotChangeReason = result.filter(item =>
                    item.reason === "reason-2"
                );

                assert.strictEqual(newRecordWithNewReason.length, 3);
                assert.strictEqual(oldRecordNotChangeReason.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories with _ in the category", (done) => {
        const json = {
            videoID: "underscore",
            userID: lockVIPUser,
            categories: [
                "word_word",
            ],
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories("underscore");
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories with upper and lower case in the category", (done) => {
        const json = {
            videoID: "bothCases",
            userID: lockVIPUser,
            categories: [
                "wordWord",
            ],
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories("bothCases");
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit categories with $ in the category", (done) => {
        const videoID = "specialChar";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "word&word",
            ],
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params", (done) => {
        client.post(endpoint, {})
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
        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no userID", (done) => {
        const json = {
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
        const json = {
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

    it("Should return 400 object categories", (done) => {
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

    it("Should return 400 bad format categories", (done) => {
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

    it("Should be able to delete a lockCategories record", (done) => {
        const videoID = "delete-record";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
        };

        client.delete(endpoint, { data: json })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to delete one lockCategories record without removing another", (done) => {
        const videoID = "delete-record-1";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
        };

        client.delete(endpoint, { data: json })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });


    /*
     * Submission tests in this file do not check database records, only status codes.
     * To test the submission code properly see ./test/cases/postSkipSegments.js
     */
    const lockedVideoID = "lockCategoryVideo";
    const testSubmitUser = "testman42-qwertyuiopasdfghjklzxcvbnm";
    it("Should not be able to submit a segment to a video with a lock-category record (single submission)", (done) => {
        client.post(submitEndpoint, {
            userID: testSubmitUser,
            videoID: lockedVideoID,
            segments: [{
                segment: [20, 40],
                category: "sponsor",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit segments to a video where any of the submissions with a no-segment record", (done) => {
        client.post(submitEndpoint, {
            userID: testSubmitUser,
            videoID: lockedVideoID,
            segments: [{
                segment: [20, 40],
                category: "sponsor",
            }, {
                segment: [50, 60],
                category: "intro",
            }]
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });


    it("Should be able to submit a segment to a video with a different no-segment record", (done) => {
        client.post(submitEndpoint, {
            userID: testSubmitUser,
            videoID: lockedVideoID,
            segments: [{
                segment: [20, 40],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a segment to a video with no no-segment records", (done) => {
        client.post(submitEndpoint, {
            userID: testSubmitUser,
            videoID: "normalVideo",
            segments: [{
                segment: [20, 40],
                category: "intro",
            }],
        })
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("should be able to get existing category lock", (done) => {
        const expected = {
            categories: [
                "sponsor",
                "intro",
                "outro",
                "shilling"
            ],
        };
        client.get(endpoint, { params: {videoID: "no-segments-video-id" }})
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.ok(stringDeepEquals(data.categories, expected.categories));
                done();
            })
            .catch(err => done(err));
    });
});

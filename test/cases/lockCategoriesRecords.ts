import fetch from "node-fetch";
import { Done, postJSON } from "../utils/utils";
import { getbaseURL } from "../utils/getBaseURL";
import {getHash} from "../../src/utils/getHash";
import {db} from "../../src/databases/databases";
import assert from "assert";
import {LockCategory } from "../../src/types/segments.model";

const stringDeepEquals = (a: string[] ,b: string[]): boolean => {
    let result = true;
    b.forEach((e) => {
        if (!a.includes(e)) result = false;
    });
    return result;
};

const endpoint = `${getbaseURL()}/api/lockCategories`;
const submitEndpoint = `${getbaseURL()}/api/skipSegments`;
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

    it("Should be able to submit categories not in video (http response)", (done: Done) => {
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
        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json)
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories not in video (sql check)", (done: Done) => {
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
        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json)
        })
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

    it("Should be able to submit categories not in video with reason (http response)", (done: Done) => {
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

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json)
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.deepStrictEqual(data.submitted, expected.submitted);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories not in video with reason (sql check)", (done: Done) => {
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

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json)
        })
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

    it("Should be able to submit categories with _ in the category", (done: Done) => {
        const json = {
            videoID: "underscore",
            userID: lockVIPUser,
            categories: [
                "word_word",
            ],
        };
        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories("underscore");
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories with upper and lower case in the category", (done: Done) => {
        const json = {
            videoID: "bothCases",
            userID: lockVIPUser,
            categories: [
                "wordWord",
            ],
        };
        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories("bothCases");
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit categories with $ in the category", (done: Done) => {
        const videoID = "specialChar";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "word&word",
            ],
        };

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params", (done: Done) => {
        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify({}),
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no categories", (done: Done) => {
        const json: any = {
            videoID: "test",
            userID: "test",
            categories: [],
        };
        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no userID", (done: Done) => {
        const json: any = {
            videoID: "test",
            userID: null,
            categories: ["sponsor"],
        };

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for no videoID", (done: Done) => {
        const json: any = {
            videoID: null,
            userID: "test",
            categories: ["sponsor"],
        };

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 object categories", (done: Done) => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: {},
        };

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 bad format categories", (done: Done) => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: "sponsor",
        };

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 403 if user is not VIP", (done: Done) => {
        const json = {
            videoID: "test",
            userID: "test",
            categories: [
                "sponsor",
            ],
        };

        fetch(endpoint, {
            ...postJSON,
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to delete a lockCategories record", (done: Done) => {
        const videoID = "delete-record";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
        };

        fetch(endpoint, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to delete one lockCategories record without removing another", (done: Done) => {
        const videoID = "delete-record-1";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
        };

        fetch(endpoint, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
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
    it("Should not be able to submit a segment to a video with a lock-category record (single submission)", (done: Done) => {
        fetch(submitEndpoint, {
            ...postJSON,
            body: JSON.stringify({
                userID: testSubmitUser,
                videoID: lockedVideoID,
                segments: [{
                    segment: [20, 40],
                    category: "sponsor",
                }],
            }),
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit segments to a video where any of the submissions with a no-segment record", (done: Done) => {
        fetch(submitEndpoint, {
            ...postJSON,
            body: JSON.stringify({
                userID: testSubmitUser,
                videoID: lockedVideoID,
                segments: [{
                    segment: [20, 40],
                    category: "sponsor",
                }, {
                    segment: [50, 60],
                    category: "intro",
                }],
            },),
        })
            .then(async res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });


    it("Should be able to submit a segment to a video with a different no-segment record", (done: Done) => {
        fetch(submitEndpoint, {
            ...postJSON,
            body: JSON.stringify({
                userID: testSubmitUser,
                videoID: lockedVideoID,
                segments: [{
                    segment: [20, 40],
                    category: "intro",
                }],
            }),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit a segment to a video with no no-segment records", (done: Done) => {
        fetch(submitEndpoint, {
            ...postJSON,
            body: JSON.stringify({
                userID: testSubmitUser,
                videoID: "normalVideo",
                segments: [{
                    segment: [20, 40],
                    category: "intro",
                }],
            }),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("should be able to get existing category lock", (done: Done) => {
        const expected = {
            categories: [
                "sponsor",
                "intro",
                "outro",
                "shilling"
            ],
        };
        fetch(`${endpoint}?videoID=no-segments-video-id`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.ok(stringDeepEquals(data.categories, expected.categories));
                done();
            })
            .catch(err => done(err));
    });
});

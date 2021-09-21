import fetch from "node-fetch";
import { Done, getbaseURL } from "../utils.js";
import { getHash } from "../../src/utils/getHash.js";
import { db } from "../../src/databases/databases.js";
import assert from "assert";
import { LockCategory } from "../../src/types/segments.model.js";

const stringDeepEquals = (a: string[] ,b: string[]): boolean => {
    let result = true;
    b.forEach((e) => {
        if (!a.includes(e)) result = false;
    });
    return result;
};

describe("lockCategoriesRecords", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [getHash("VIPUser-lockCategories")]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "category", "reason") VALUES (?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "no-segments-video-id", "sponsor", "reason-1"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "no-segments-video-id", "intro", "reason-1"]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "no-segments-video-id-1", "sponsor", "reason-2"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "no-segments-video-id-1", "intro", "reason-2"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "lockCategoryVideo", "sponsor", "reason-3"]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "delete-record", "sponsor", "reason-4"]);

        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "delete-record-1", "sponsor", "reason-5"]);
        await db.prepare("run", insertLockCategoryQuery, [getHash("VIPUser-lockCategories"), "delete-record-1", "intro", "reason-5"]);
    });

    it("Should update the database version when starting the application", async () => {
        const version = (await db.prepare("get", "SELECT key, value FROM config where key = ?", ["version"])).value;
        assert.ok(version > 1);
    });

    it("Should be able to submit categories not in video (http response)", (done: Done) => {
        const json = {
            videoID: "no-segments-video-id",
            userID: "VIPUser-lockCategories",
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
        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
        const json = {
            videoID: "no-segments-video-id-1",
            userID: "VIPUser-lockCategories",
            categories: [
                "outro",
                "shilling",
                "shilling",
                "shil ling",
                "",
                "intro",
            ],
        };
        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json)
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["no-segments-video-id-1"]) as LockCategory[];
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
        const json = {
            videoID: "no-segments-video-id",
            userID: "VIPUser-lockCategories",
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
        const json = {
            videoID: "no-segments-video-id-1",
            userID: "VIPUser-lockCategories",
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json)
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["no-segments-video-id-1"]) as LockCategory[];
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
            userID: "VIPUser-lockCategories",
            categories: [
                "word_word",
            ],
        };
        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["underscore"]);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories with upper and lower case in the category", (done: Done) => {
        const json = {
            videoID: "bothCases",
            userID: "VIPUser-lockCategories",
            categories: [
                "wordWord",
            ],
        };
        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["bothCases"]);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to submit categories with $ in the category", (done: Done) => {
        const json = {
            videoID: "specialChar",
            userID: "VIPUser-lockCategories",
            categories: [
                "word&word",
            ],
        };

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["specialChar"]);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 for missing params", (done: Done) => {
        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to delete a lockCategories record", (done: Done) => {
        const json = {
            videoID: "delete-record",
            userID: "VIPUser-lockCategories",
            categories: [
                "sponsor",
            ],
        };

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["delete-record"]);
                assert.strictEqual(result.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to delete one lockCategories record without removing another", (done: Done) => {
        const json = {
            videoID: "delete-record-1",
            userID: "VIPUser-lockCategories",
            categories: [
                "sponsor",
            ],
        };

        fetch(`${getbaseURL()}/api/lockCategories`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(json),
        })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', ["delete-record-1"]);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });


    /*
     * Submission tests in this file do not check database records, only status codes.
     * To test the submission code properly see ./test/cases/postSkipSegments.js
     */

    it("Should not be able to submit a segment to a video with a lock-category record (single submission)", (done: Done) => {
        fetch(`${getbaseURL()}/api/postVideoSponsorTimes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
                videoID: "lockCategoryVideo",
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
        fetch(`${getbaseURL()}/api/postVideoSponsorTimes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
                videoID: "lockCategoryVideo",
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
        fetch(`${getbaseURL()}/api/postVideoSponsorTimes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
                videoID: "lockCategoryVideo",
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
        fetch(`${getbaseURL()}/api/postVideoSponsorTimes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userID: "testman42-qwertyuiopasdfghjklzxcvbnm",
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

        fetch(`${getbaseURL()}/api/lockCategories?videoID=` + `no-segments-video-id`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.ok(stringDeepEquals(data.categories, expected.categories));
                done();
            })
            .catch(err => done(err));
    });
});

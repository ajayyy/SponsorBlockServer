import { getHash } from "../../src/utils/getHash";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { UserID } from "../../src/types/user.model";
import { Category, VideoID } from "../../src/types/segments.model";
import { client } from "../utils/httpClient";
import { partialDeepEquals } from "../utils/partialDeepEquals";

const stringDeepEquals = (a: string[], b: string[]): boolean => {
    let result = true;
    b.forEach((e) => {
        if (!a.includes(e)) result = false;
    });
    return result;
};

interface LockCategory {
    category: Category,
    reason: string,
    videoID: VideoID,
    userID: UserID
}

const endpoint = "/api/lockCategories";
const submitEndpoint = "/api/skipSegments";
const checkLockCategories = (videoID: string): Promise<LockCategory[]> => db.prepare("all", 'SELECT * FROM "lockCategories"  WHERE "videoID" = ?', [videoID]);
const lockVIPUser = "lockCategoriesRecordsVIPUser";
const lockVIPUserHash = getHash(lockVIPUser);

describe("lockCategoriesRecords", () => {
    before(async () => {
        const insertVipUserQuery = 'INSERT INTO "vipUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertVipUserQuery, [lockVIPUserHash]);

        const insertLockCategoryQuery = 'INSERT INTO "lockCategories" ("userID", "videoID", "actionType", "category", "reason", "service") VALUES (?, ?, ?, ?, ?, ?)';
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id", "skip", "sponsor", "reason-1", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id", "mute", "sponsor", "reason-1", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id", "skip", "intro", "reason-1", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id", "mute", "intro", "reason-1", "YouTube"]);

        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id-1", "skip", "sponsor", "reason-2", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id-1", "mute", "sponsor", "reason-2", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id-1", "skip", "intro", "reason-2", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "no-segments-video-id-1", "mute", "intro", "reason-2", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "lockCategoryVideo", "skip", "sponsor", "reason-3", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "lockCategoryVideo", "mute", "sponsor", "reason-3", "YouTube"]);

        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "lockCategoryVideo-2", "skip", "sponsor", "reason-4", "YouTube"]);

        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record", "skip", "sponsor", "reason-4", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record", "mute", "sponsor", "reason-4", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record", "full", "sponsor", "reason-4", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-1", "skip", "sponsor", "reason-5", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-1", "mute", "sponsor", "reason-5", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-1", "skip", "intro", "reason-5", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-1", "mute", "intro", "reason-5", "YouTube"]);
        await db.prepare("run", insertLockCategoryQuery, [lockVIPUserHash, "delete-record-poi", "poi", "poi_highlight", "reason-6", "YouTube"]);
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
                "intro"
            ],
            submittedValues: [
                {
                    actionType: "skip",
                    category: "outro"
                },
                {
                    actionType: "mute",
                    category: "outro"
                },
                {
                    actionType: "skip",
                    category: "intro"
                },
                {
                    actionType: "mute",
                    category: "intro"
                }
            ]
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
                assert.strictEqual(result.length, 6);
                const oldRecordNotChangeReason = result.filter(item =>
                    item.reason === "reason-2" && ["sponsor", "intro"].includes(item.category)
                );
                const newRecordWithEmptyReason = result.filter(item =>
                    item.reason === "" && ["outro"].includes(item.category)
                );
                assert.strictEqual(newRecordWithEmptyReason.length, 2);
                assert.strictEqual(oldRecordNotChangeReason.length, 4);
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
            "intro"
        ];

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 6);
                const newRecordWithNewReason = result.filter(item =>
                    expectedWithNewReason.includes(item.category) && item.reason === "new reason"
                );
                const oldRecordNotChangeReason = result.filter(item =>
                    item.reason === "reason-2"
                );

                assert.strictEqual(newRecordWithNewReason.length, 4);
                assert.strictEqual(oldRecordNotChangeReason.length, 2);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit categories with _ in the category", (done) => {
        const videoID = "underscore";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "exclusive_access",
            ],
            actionTypes: ["full"]
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 1);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to submit specific action type not in video (sql check)", (done) => {
        const videoID = "lockCategoryVideo-2";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
            actionTypes: [
                "mute"
            ],
            reason: "custom-reason",
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 2);
                assert.ok(partialDeepEquals(result, [
                    {
                        category: "sponsor",
                        actionType: "skip",
                        reason: "reason-4",
                    },
                    {
                        category: "sponsor",
                        actionType: "mute",
                        reason: "custom-reason",
                    }
                ]));
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
            actionTypes: ["skip", "mute"]
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

    it("Should be able to delete one lockCategories record without removing another", (done) => {
        const videoID = "delete-record-1";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
            actionTypes: ["skip", "mute"]
        };

        client.delete(endpoint, { data: json })
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const result = await checkLockCategories(videoID);
                assert.strictEqual(result.length, 2);
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
            ],
        };
        client.get(endpoint, { params: { videoID: "no-segments-video-id" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const data = res.data;
                assert.ok(stringDeepEquals(data.categories, expected.categories));
                done();
            })
            .catch(err => done(err));
    });

    it("should be able to delete individual category lock", (done) => {
        const videoID = "delete-record";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "sponsor",
            ],
            actionTypes: ["full"]
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

    it("should be able to delete poi type category by type poi", (done) => {
        const videoID = "delete-record-poi";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "poi_highlight",
            ],
            actionTypes: ["poi"]
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

    it("should be able to delete poi type category by type poi", (done) => {
        const videoID = "delete-record-poi";
        const json = {
            videoID,
            userID: lockVIPUser,
            categories: [
                "poi_highlight",
            ],
            actionTypes: ["poi"]
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
});

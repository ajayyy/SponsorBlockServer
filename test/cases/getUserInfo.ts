import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import assert from "assert";
import { client } from "../utils/httpClient";
import { insertSegment, insertThumbnail, insertThumbnailVote, insertTitle, insertTitleVote } from "../utils/segmentQueryGen";
import { genUsers, User } from "../utils/genUser";
import { genRandomValue } from "../utils/genRandom";
import { insertBan, insertUsername, insertWarning } from "../utils/queryGen";

describe("getUserInfo", () => {
    const endpoint = "/api/userInfo";

    const cases = [
        "n-0",
        "n-1",
        "n-2",
        "n-3",
        "n-4",
        "n-5",
        "n-6",
        "null",
        "vip",
        "warn-0",
        "warn-1",
        "warn-2",
        "warn-3",
        "ban-1",
        "ban-2",
    ];

    const users = genUsers("endpoint", cases);
    for (const [id, user] of Object.entries(users))
        // generate last segment UUIDs
        user.info["last"] = genRandomValue("uuid", id);

    const checkValues = (user: User, expected: Record<string, string | number | boolean>) =>
        client.get(endpoint, { params: { userID: user.privID, value: Object.keys(expected) } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.ok(partialDeepEquals(res.data, expected));
            });

    before(async () => {
        users["n-1"].info["username"] = genRandomValue("username", "n-1");
        await insertUsername(db, users["n-1"].pubID, users["n-1"].info["username"]);

        // insert segments
        const defaultSegmentParams = { startTime: 0, endTime: 10, votes: 2, views: 10 };
        // user["n-1"]
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-1"].pubID });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-1"].pubID });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-1"].pubID, votes: -1 });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-1"].pubID, votes: -2 });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-1"].pubID, votes: -5, timeSubmitted: 5, UUID: users["n-1"].info.last });
        // user["n-2"]
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-2"].pubID, shadowHidden: true });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-2"].pubID, shadowHidden: true });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-2"].pubID, timeSubmitted: 5, UUID: users["n-2"].info.last });
        // users n-3 to n-6
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-3"].pubID, UUID: users["n-3"].info.last, endTime: 36000 });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-4"].pubID, UUID: users["n-4"].info.last, category: "chapter", actionType: "chapter" });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-5"].pubID, UUID: users["n-5"].info.last });
        await insertSegment(db, { ...defaultSegmentParams, userID: users["n-6"].pubID, UUID: users["n-6"].info.last, shadowHidden: true });
        // ban-2
        await insertSegment(db, { ...defaultSegmentParams, userID: users["ban-2"].pubID, UUID: users["ban-2"].info.last, shadowHidden: true });

        // user["n-1"]
        const userN1Video = genRandomValue("video", "getUserInfo-n1");
        // title 1
        const userN1UUID1 = genRandomValue("uuid", "getUserInfo-n1-u1");
        await insertTitle(db, { userID: users["n-1"].pubID, timeSubmitted: 1, videoID: userN1Video, UUID: userN1UUID1 });
        await insertTitleVote(db, userN1UUID1, 0);
        // title 2
        const userN1UUID2 = genRandomValue("uuid", "getUserInfo-n1-u2");
        await insertTitle(db, { userID: users["n-1"].pubID, timeSubmitted: 2, videoID: userN1Video, UUID: userN1UUID2 });
        await insertTitleVote(db, userN1UUID2, -1);
        // thumbnail 1
        const userN1UUID3 = genRandomValue("uuid", "getUserInfo-n1-u3");
        await insertThumbnail(db, { userID: users["n-1"].pubID, UUID: userN1UUID3 });
        await insertThumbnailVote(db, userN1UUID3, 0);

        // warnings & bans
        // warn-0
        insertWarning(db, users["warn-0"].pubID, { reason: "warning0-0", issueTime: 10 });
        // warn-1
        insertWarning(db, users["warn-1"].pubID, { reason: "warning1-0", issueTime: 20 });
        insertWarning(db, users["warn-1"].pubID, { reason: "warning1-1", issueTime: 30 });
        // warn -2
        insertWarning(db, users["warn-2"].pubID, { reason: "warning2-0", issueTime: 40, enabled: false });
        // warn-3
        insertWarning(db, users["warn-3"].pubID, { reason: "warning3-0", issueTime: 50 });
        insertWarning(db, users["warn-3"].pubID, { reason: "warning3-1", issueTime: 60, enabled: false });

        // ban-
        insertBan(db, users["ban-1"].pubID);
        insertBan(db, users["ban-2"].pubID);
    });

    it("Should be able to get a 200", () => statusTest(200, { userID: users["n-1"].privID }));

    // value tests

    it("Should get title and vote submission counts", () =>
        checkValues(users["n-1"], {
            titleSubmissionCount: 1,
            thumbnailSubmissionCount: 1
        })
    );

    // fallback/ null tests
    it("Should return publidID if no username set", () => {
        const user = users["n-2"];
        return checkValues(user, {
            userName: user.pubID,
        });
    });

    it("Should return null segment if none", (done) => {
        const user = users["null"];
        client.get(endpoint, { params: { userID: user.privID, value: "lastSegmentID" } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.data.lastSegmentID, null);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return zeroes if userid does not exist", (done) => {
        const user = users["null"];
        client.get(endpoint, { params: { userID: user.privID, value: "lastSegmentID" } })
            .then(res => {
                const data = res.data;
                for (const value in data) {
                    if (data[value] === null && value !== "lastSegmentID")  {
                        done(`returned null for ${value}`);
                    }
                    done(); // pass
                }
            })
            .catch(err => done(err));
    });

    // warnings
    it("Should get warning data with public ID", (done) => {
        const user = users["warn-0"];
        client.get(endpoint, { params: { publicUserID: user.pubID, values: `["warnings"]` } })
            .then(res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    warnings: 1
                };
                assert.ok(partialDeepEquals(res.data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should get warning reason from from single enabled warning", () =>
        checkValues(users["warn-0"], {
            warnings: 1,
            warningReason: "warning0-0",
        })
    );

    it("Should get most recent warning from two enabled warnings", () =>
        checkValues(users["warn-1"], {
            warnings: 2,
            warningReason: "warning1-1"
        })
    );

    it("Should not get disabled warning", () =>
        checkValues(users["warn-2"], {
            warnings: 0,
            warningReason: ""
        })
    );

    it("Should not get newer disabled warning", () =>
        checkValues(users["warn-3"], {
            warnings: 1,
            warningReason: "warning3-0"
        })
    );

    // shadowban tests
    it("Should get ban data for banned user (only appears when specifically requested)", () =>
        checkValues(users["ban-1"], {
            banned: true
        })
    );

    it("Should return all segments of banned user", () =>
        checkValues(users["ban-2"], {
            segmentCount: 1
        })
    );

    it("Should not return shadowhidden segments of not-banned user", () =>
        checkValues(users["n-6"], {
            segmentCount: 0,
            banned: false
        })
    );

    // error 400 testing
    const statusTest = (status: number, params: Record<string, any>) =>
        client.get(endpoint, { params })
            .then(res => {
                assert.strictEqual(res.status, status);
            });

    it("Should throw 400 on bad json in values", () => statusTest(400, { userID: "x", values: `[userID]` }));
    it("Should throw 400 with invalid array", () => statusTest(400, { userID: "x", values: 123 }));
    it("Should throw 400 with empty userID)", () => statusTest(400, { userID: "" }));
    it("Should throw 400 if bad values specified", () => statusTest(400, { userID: users["warn-3"].privID, value: "invalid-value" }));

    // full user stats
    const fullUserStats = (params: Record<string, any>, expected: Record<string, any>) =>
        client.get(endpoint, { params })
            .then(res => {
                assert.strictEqual(res.status, 200);
                assert.deepStrictEqual(res.data, expected);
            });

    const defaultUserInfo = {
        minutesSaved: 0,
        segmentCount: 0,
        ignoredSegmentCount: 0,
        viewCount: 0,
        ignoredViewCount: 0,
        warnings: 0,
        warningReason: "",
        reputation: 0,
        lastSegmentID: "",
        vip: false,
    };

    it("Should be able to get user info", () => {
        const user = users["n-1"];
        const params = { userID: user.privID };
        return fullUserStats(params, {
            ...defaultUserInfo,
            userName: user.info.username,
            userID: user.pubID,
            minutesSaved: 5,
            viewCount: 30,
            ignoredViewCount: 20,
            segmentCount: 3,
            ignoredSegmentCount: 2,
            reputation: -1.5,
            lastSegmentID: user.info.last,
        });
    });

    it("Should only count long segments as 10 minutes", () => {
        const user = users["n-3"];
        const params = { userID: user.privID };
        return fullUserStats(params, {
            ...defaultUserInfo,
            userName: user.pubID,
            userID: user.pubID,
            minutesSaved: 100,
            viewCount: 10,
            segmentCount: 1,
            lastSegmentID: user.info.last,
        });
    });

    it("Should be able to get permissions", () => {
        const user = users["n-1"];
        const params = { userID: user.privID, value: "permissions" };
        return fullUserStats(params, {
            permissions: {
                sponsor: true,
                selfpromo: true,
                exclusive_access: true,
                interaction: true,
                intro: true,
                outro: true,
                preview: true,
                music_offtopic: true,
                filler: true,
                poi_highlight: true,
                chapter: false,
            },
        });
    });

    it("Should ignore chapters for saved time calculations", () => {
        const user = users["n-4"];
        const params = { userID: user.privID };
        return fullUserStats(params, {
            ...defaultUserInfo,
            userName: user.pubID,
            userID: user.pubID,
            viewCount: 10,
            segmentCount: 1,
            lastSegmentID: user.info.last,
        });
    });

    it("Should return 200 on userID not found", () => {
        const user = users["null"];
        const params = { userID: user.privID };
        return fullUserStats(params, {
            ...defaultUserInfo,
            userName: user.pubID,
            userID: user.pubID,
            lastSegmentID: null
        });
    });
});

import fetch from "node-fetch";
import {Done, getbaseURL, partialDeepEquals} from "../utils";
import {db} from "../../src/databases/databases";
import {getHash} from "../../src/utils/getHash";
import assert from "assert";

describe("getUserInfo", () => {
    const endpoint = `${getbaseURL()}/api/userInfo`;
    before(async () => {
        const insertUserNameQuery = 'INSERT INTO "userNames" ("userID", "userName") VALUES(?, ?)';
        await db.prepare("run", insertUserNameQuery, [getHash("getuserinfo_user_01"), "Username user 01"]);

        const sponsorTimesQuery = 'INSERT INTO "sponsorTimes" ("videoID", "startTime", "endTime", "votes", "UUID", "userID", "timeSubmitted", views, category, "shadowHidden") VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo0", 1, 11, 2,   "uuid000001", getHash("getuserinfo_user_01"), 1, 10, "sponsor", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo0", 1, 11, 2,   "uuid000002", getHash("getuserinfo_user_01"), 2, 10, "sponsor", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo1", 1, 11, -1,  "uuid000003", getHash("getuserinfo_user_01"), 3, 10, "sponsor", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo1", 1, 11, -2,  "uuid000004", getHash("getuserinfo_user_01"), 4, 10, "sponsor", 1]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo2", 1, 11, -5,  "uuid000005", getHash("getuserinfo_user_01"), 5, 10, "sponsor", 1]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo0", 1, 11, 2,   "uuid000007", getHash("getuserinfo_user_02"), 7, 10, "sponsor", 1]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo0", 1, 11, 2,   "uuid000008", getHash("getuserinfo_user_02"), 8, 10, "sponsor", 1]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo0", 0, 36000, 2,"uuid000009", getHash("getuserinfo_user_03"), 8, 10, "sponsor", 0]);
        await db.prepare("run", sponsorTimesQuery, ["getUserInfo3", 1, 11, 2,   "uuid000006", getHash("getuserinfo_user_02"), 6, 10, "sponsor", 0]);


        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issueTime", "issuerUserID", "enabled", "reason") VALUES (?, ?, ?, ?, ?)';
        await db.prepare("run", insertWarningQuery, [getHash("getuserinfo_warning_0"), 10, "getuserinfo_vip", 1, "warning0-0"]);
        await db.prepare("run", insertWarningQuery, [getHash("getuserinfo_warning_1"), 20, "getuserinfo_vip", 1, "warning1-0"]);
        await db.prepare("run", insertWarningQuery, [getHash("getuserinfo_warning_1"), 30, "getuserinfo_vip", 1, "warning1-1"]);
        await db.prepare("run", insertWarningQuery, [getHash("getuserinfo_warning_2"), 40, "getuserinfo_vip", 0, "warning2-0"]);
        await db.prepare("run", insertWarningQuery, [getHash("getuserinfo_warning_3"), 50, "getuserinfo_vip", 1, "warning3-0"]);
        await db.prepare("run", insertWarningQuery, [getHash("getuserinfo_warning_3"), 60, "getuserinfo_vip", 0, "warning3-1"]);

        const insertBanQuery = 'INSERT INTO "shadowBannedUsers" ("userID") VALUES (?)';
        await db.prepare("run", insertBanQuery, [getHash("getuserinfo_ban_01")]);
    });

    it("Should be able to get a 200", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_user_01`)
            .then(res => {
                assert.strictEqual(res.status, 200);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get a 400 (No userID parameter)", (done: Done) => {
        fetch(endpoint)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to get user info", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_user_01`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    userName: "Username user 01",
                    userID: "66e7c974039ffb870a500a33eca3a3989861018909b938c313cf1a8a366800b8",
                    minutesSaved: 5,
                    viewCount: 30,
                    ignoredViewCount: 20,
                    segmentCount: 3,
                    ignoredSegmentCount: 2,
                    reputation: -2,
                    lastSegmentID: "uuid000005",
                    vip: false,
                    warnings: 0,
                    warningReason: ""
                };
                const data = await res.json();
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });

    it("Should get warning data", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_0&value=warnings`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warnings: 1
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should get warning data with public ID", (done: Done) => {
        fetch(`${endpoint}?publicUserID=${getHash("getuserinfo_warning_0")}&values=["warnings"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warnings: 1
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should get multiple warnings", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_1&value=warnings`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warnings: 2
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not get warnings if none", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_2&value=warnings`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warnings: 0,
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should done(userID for userName (No userName set)", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_user_02&value=userName`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    userName: "c2a28fd225e88f74945794ae85aef96001d4a1aaa1022c656f0dd48ac0a3ea0f"
                };
                assert.ok(partialDeepEquals(data, expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should return null segment if none", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_null&value=lastSegmentID`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                assert.strictEqual(data.lastSegmentID, null);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return zeroes if userid does not exist", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_null&value=lastSegmentID`)
            .then(async res => {
                const data = await res.json();
                for (const value in data) {
                    if (data[value] === null && value !== "lastSegmentID")  {
                        done(`returned null for ${value}`);
                    }
                    done(); // pass
                }
            })
            .catch(err => done(err));
    });

    it("Should get warning reason from from single enabled warning", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_0&values=["warningReason"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warningReason: "warning0-0",
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should get most recent warning from two enabled warnings", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_1&value=warningReason`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warningReason: "warning1-1"
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should not get disabled warning", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_2&values=["warnings","warningReason"]`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warnings: 0,
                    warningReason: ""
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should not get newer disabled warning", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_3&value=warnings&value=warningReason`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    warnings: 1,
                    warningReason: "warning3-0"
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should get 400 if bad values specified", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_warning_3&value=invalid-value`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should get ban data for banned user (only appears when specifically requested)", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_ban_01&value=banned`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    banned: true
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should get ban data for unbanned user (only appears when specifically requested)", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_notban_01&value=banned`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    banned: false
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should throw 400 on bad json in values", (done: Done) => {
        fetch(`${endpoint}?userID=x&values=[userID]`)
            .then(async res => {
                assert.strictEqual(res.status, 400);
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should return 200 on userID not found", (done: Done) => {
        fetch(`${endpoint}?userID=notused-userid`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const data = await res.json();
                const expected = {
                    minutesSaved: 0,
                    segmentCount: 0,
                    ignoredSegmentCount: 0,
                    viewCount: 0,
                    ignoredViewCount: 0,
                    warnings: 0,
                    warningReason: "",
                    reputation: 0,
                    vip: false,
                };
                assert.ok(partialDeepEquals(data, expected));
                done(); // pass
            })
            .catch(err => done(err));
    });

    it("Should only count long segments as 10 minutes", (done: Done) => {
        fetch(`${endpoint}?userID=getuserinfo_user_03`)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const expected = {
                    userName: "807e0a5d0a62c9c4365fae3d403e4618a3226f231314a898fa1555a0e55eab9e",
                    userID: "807e0a5d0a62c9c4365fae3d403e4618a3226f231314a898fa1555a0e55eab9e",
                    minutesSaved: 100,
                    viewCount: 10,
                    ignoredViewCount: 0,
                    segmentCount: 1,
                    ignoredSegmentCount: 0,
                    reputation: 0,
                    lastSegmentID: "uuid000009",
                    vip: false,
                    warnings: 0,
                    warningReason: ""
                };
                const data = await res.json();
                assert.deepStrictEqual(data, expected);
                done();
            })
            .catch(err => done(err));
    });
});

import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";

describe("postWarning", () => {
    // constants
    const endpoint = "/api/warnUser";
    const getWarning = (userID: string, type = 0) => db.prepare("all", `SELECT "userID", "issueTime", "issuerUserID", enabled, "reason" FROM warnings WHERE "userID" = ? AND "type" = ? ORDER BY "issueTime" ASC`, [userID, type]);

    const userID0 = "warning-0";
    const userID1 = "warning-1";
    const userID2 = "warning-2";
    const userID3 = "warning-3";
    const userID4 = "warning-4";
    const userID5 = "warning-5";
    const userID6 = "warning-6";
    const userID7 = "warning-7";
    const userID8 = "warning-8";
    const userID9 = "warning-9";
    const userID10 = "warning-10";
    const userID11 = "warning-11";
    const userID12 = "warning-12";
    const userID13 = "warning-13";
    const publicUserID0 = getHash(userID0);
    const publicUserID1 = getHash(userID1);
    const publicUserID2 = getHash(userID2);
    const publicUserID3 = getHash(userID3);
    const publicUserID4 = getHash(userID4);
    const publicUserID5 = getHash(userID5);
    const publicUserID6 = getHash(userID6);
    const publicUserID7 = getHash(userID7);
    const publicUserID8 = getHash(userID8);
    const publicUserID9 = getHash(userID9);
    const publicUserID10 = getHash(userID10);
    const publicUserID11 = getHash(userID11);
    const publicUserID12 = getHash(userID12);
    const publicUserID13 = getHash(userID13);
    const vipID1 = "warning-vip-1";
    const vipID2 = "warning-vip-2";
    const publicVipID1 = getHash(vipID1);
    const publicVipID2 = getHash(vipID2);
    const nonVipUser = "warning-non-vip";

    before(async () => {
        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime") VALUES(?, ?, ?, ?, ?)';
        const HOUR = 60 * 60 * 1000;

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [publicVipID1]);
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [publicVipID2]);

        await db.prepare("run", insertWarningQuery, [publicUserID1, publicVipID1, 1, "warn reason 1", (Date.now() - 24 * HOUR)]); // 24 hours is much past the edit deadline
        await db.prepare("run", insertWarningQuery, [publicUserID2, publicVipID1, 1, "warn reason 2", (Date.now() - 24 * HOUR)]);
        await db.prepare("run", insertWarningQuery, [publicUserID3, publicVipID1, 1, "warn reason 3", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID4, publicVipID1, 1, "warn reason 4", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID6, publicVipID1, 1, "warn reason 6", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID9, publicVipID1, 0, "warn reason 9", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID10, publicVipID1, 1, "warn reason 10", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID11, publicVipID1, 1, "warn reason 11", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID12, publicVipID1, 0, "warn reason 12", Date.now()]);
        await db.prepare("run", insertWarningQuery, [publicUserID13, publicVipID1, 0, "warn reason 13", Date.now()]);
    });

    it("Should be able to create warning if vip (exp 200)", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID0,
            reason: "warning-reason-0"
        };
        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 1,
                    issuerUserID: getHash(json.issuerUserID),
                    reason: json.reason,
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be not be able to edit a warning if past deadline and same vip", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID1,
            reason: "edited reason 1",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 1,
                    issuerUserID: publicVipID1,
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be not be able to edit a warning if past deadline and different vip", (done) => {
        const json = {
            issuerUserID: vipID2,
            userID: publicUserID2,
            reason: "edited reason 2",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 1,
                    issuerUserID: publicVipID1,
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to remove warning if same vip as issuer", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID3,
            enabled: false
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 0
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to remove warning if not the same vip as issuer", (done) => {
        const json = {
            issuerUserID: vipID2,
            userID: publicUserID4,
            enabled: false
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 0
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to create warning if not vip (exp 403)", (done) => {
        const json = {
            issuerUserID: nonVipUser,
            userID: publicUserID5,
            reason: "warn reason 5",
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 403);
                done();
            })
            .catch(err => done(err));
    });

    it("Should return 400 if missing body", (done) => {
        client.post(endpoint, {})
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to remove your own warning", (done) => {
        const json = {
            userID: userID6,
            enabled: false
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(publicUserID6);
                const expected = {
                    enabled: 0
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to add your own warning", (done) => {
        const json = {
            userID: userID7,
            enabled: true,
            reason: "warn reason 7",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 403);
                const data = await getWarning(publicUserID7);
                assert.equal(data.length, 0);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to warn a user without reason", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID8,
            enabled: true
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to re-warn a user without reason", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID9,
            enabled: true
        };

        client.post(endpoint, json)
            .then(res => {
                assert.strictEqual(res.status, 400);
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to edit a warning if within deadline and same vip", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID10,
            enabled: true,
            reason: "edited reason 10",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 1,
                    issuerUserID: publicVipID1,
                    reason: json.reason,
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should not be able to edit a warning if within deadline and different vip", (done) => {
        const json = {
            issuerUserID: vipID2,
            userID: publicUserID11,
            enabled: true,
            reason: "edited reason 11",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 409);
                const row = await getWarning(json.userID);
                const expected = {
                    enabled: 1,
                    issuerUserID: publicVipID1,
                    reason: "warn reason 11",
                };
                assert.equal(row.length, 1);
                assert.ok(partialDeepEquals(row[0], expected));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to warn a previously warned user again (same vip)", (done) => {
        const json = {
            issuerUserID: vipID1,
            userID: publicUserID12,
            enabled: true,
            reason: "new reason 12",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = [
                    {
                        enabled: 0,
                        issuerUserID: publicVipID1,
                        reason: "warn reason 12",
                    },
                    {
                        enabled: 1,
                        issuerUserID: publicVipID1,
                        reason: "new reason 12",
                    }
                ];
                assert.equal(row.length, 2);
                assert.ok(partialDeepEquals(row[0], expected[0]));
                assert.ok(partialDeepEquals(row[1], expected[1]));
                done();
            })
            .catch(err => done(err));
    });

    it("Should be able to warn a previously warned user again (different vip)", (done) => {
        const json = {
            issuerUserID: vipID2,
            userID: publicUserID13,
            enabled: true,
            reason: "new reason 13",
        };

        client.post(endpoint, json)
            .then(async res => {
                assert.strictEqual(res.status, 200);
                const row = await getWarning(json.userID);
                const expected = [
                    {
                        enabled: 0,
                        issuerUserID: publicVipID1,
                        reason: "warn reason 13",
                    },
                    {
                        enabled: 1,
                        issuerUserID: publicVipID2,
                        reason: "new reason 13",
                    }
                ];
                assert.equal(row.length, 2);
                assert.ok(partialDeepEquals(row[0], expected[0]));
                assert.ok(partialDeepEquals(row[1], expected[1]));
                done();
            })
            .catch(err => done(err));
    });
});

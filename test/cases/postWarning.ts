import { partialDeepEquals } from "../utils/partialDeepEquals";
import { db } from "../../src/databases/databases";
import { getHash } from "../../src/utils/getHash";
import assert from "assert";
import { client } from "../utils/httpClient";
import { usersForSuite } from "../utils/randomUsers";

describe("postWarning", () => {
    // constants
    const endpoint = "/api/warnUser";
    const getWarning = (userID: string, type = 0) => db.prepare("all", `SELECT * FROM warnings WHERE "userID" = ? AND "type" = ? ORDER BY "issueTime" ASC`, [userID, type]);

    const users = usersForSuite("postWarning");

    before(async () => {
        const insertWarningQuery = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime") VALUES(?, ?, ?, ?, ?)';
        const insertWarningQueryWithDisableTime = 'INSERT INTO warnings ("userID", "issuerUserID", "enabled", "reason", "issueTime", "disableTime") VALUES(?, ?, ?, ?, ?, ?)';
        const HOUR = 60 * 60 * 1000;

        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [users.vip1.public]);
        await db.prepare("run", `INSERT INTO "vipUsers" ("userID") VALUES (?)`, [users.vip2.public]);

        await db.prepare("run", insertWarningQuery, [users.u1.public, users.vip1.public, 1, "warn reason 1", (Date.now() - 24 * HOUR)]); // 24 hours is much past the edit deadline
        await db.prepare("run", insertWarningQuery, [users.u2.public, users.vip1.public, 1, "warn reason 2", (Date.now() - 24 * HOUR)]);
        await db.prepare("run", insertWarningQuery, [users.u3.public, users.vip1.public, 1, "warn reason 3", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u4.public, users.vip1.public, 1, "warn reason 4", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u6.public, users.vip1.public, 1, "warn reason 6", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u9.public, users.vip1.public, 0, "warn reason 9", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u10.public, users.vip1.public, 1, "warn reason 10", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u11.public, users.vip1.public, 1, "warn reason 11", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u12.public, users.vip1.public, 0, "warn reason 12", Date.now()]);
        await db.prepare("run", insertWarningQuery, [users.u13.public, users.vip1.public, 0, "warn reason 13", Date.now()]);
        await db.prepare("run", insertWarningQueryWithDisableTime, [users.u14.public, users.vip1.public, 0, "warn reason 14", 123, 12345]);
        await db.prepare("run", insertWarningQuery, [users.u14.public, users.vip1.public, 1, "another reason 14", Date.now()]);
    });

    it("Should be able to create warning if vip (exp 200)", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u0.public,
            reason: "warning-reason-0"
        };
        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 1,
            issuerUserID: getHash(json.issuerUserID),
            reason: json.reason,
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
    });

    it("Should be not be able to edit a warning if past deadline and same vip", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u1.public,
            reason: "edited reason 1",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 409);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 1,
            issuerUserID: users.vip1.public,
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
    });

    it("Should be not be able to edit a warning if past deadline and different vip", async () => {
        const json = {
            issuerUserID: users.vip2.private,
            userID: users.u2.public,
            reason: "edited reason 2",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 409);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 1,
            issuerUserID: users.vip1.public,
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
    });

    it("Should be able to remove warning if same vip as issuer", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u3.public,
            enabled: false
        };
        const beforeTime = Date.now();

        const res = await client.post(endpoint, json);
        const afterTime = Date.now();
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 0
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
        // check disableTime
        assert.ok(row[0].disableTime >= beforeTime && row[0].disableTime <= afterTime, "expected disableTime to be somewhere between execution start and end");
    });

    it("Should be able to remove warning if not the same vip as issuer", async () => {
        const json = {
            issuerUserID: users.vip2.private,
            userID: users.u4.public,
            enabled: false
        };
        const beforeTime = Date.now();

        const res = await client.post(endpoint, json);
        const afterTime = Date.now();
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 0
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
        // check disableTime
        assert.ok(row[0].disableTime >= beforeTime && row[0].disableTime <= afterTime, "expected disableTime to be somewhere between execution start and end");
    });

    it("Should not be able to create warning if not vip (exp 403)", async () => {
        const json = {
            issuerUserID: users.nonvip.private,
            userID: users.u5.public,
            reason: "warn reason 5",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 403);
    });

    it("Should return 400 if missing body", async () => {
        const res = await client.post(endpoint, {});
        assert.strictEqual(res.status, 400);
    });

    it("Should be able to remove your own warning", async () => {
        const json = {
            userID: users.u6.private,
            enabled: false
        };
        const beforeTime = Date.now();

        const res = await client.post(endpoint, json);
        const afterTime = Date.now();
        assert.strictEqual(res.status, 200);
        const row = await getWarning(users.u6.public);
        const expected = {
            enabled: 0
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
        // check disableTime
        assert.ok(row[0].disableTime >= beforeTime && row[0].disableTime <= afterTime, "expected disableTime to be somewhere between execution start and end");
    });

    it("Should not be able to add your own warning", async () => {
        const json = {
            userID: users.u7.private,
            enabled: true,
            reason: "warn reason 7",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 403);
        const data = await getWarning(users.u7.public);
        assert.equal(data.length, 0);
    });

    it("Should not be able to warn a user without reason", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u8.public,
            enabled: true
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 400);
    });

    it("Should not be able to re-warn a user without reason", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u9.public,
            enabled: true
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 400);
    });

    it("Should be able to edit a warning if within deadline and same vip", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u10.public,
            enabled: true,
            reason: "edited reason 10",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 1,
            issuerUserID: users.vip1.public,
            reason: json.reason,
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
    });

    it("Should not be able to edit a warning if within deadline and different vip", async () => {
        const json = {
            issuerUserID: users.vip2.private,
            userID: users.u11.public,
            enabled: true,
            reason: "edited reason 11",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 409);
        const row = await getWarning(json.userID);
        const expected = {
            enabled: 1,
            issuerUserID: users.vip1.public,
            reason: "warn reason 11",
        };
        assert.equal(row.length, 1);
        assert.ok(partialDeepEquals(row[0], expected));
    });

    it("Should be able to warn a previously warned user again (same vip)", async () => {
        const json = {
            issuerUserID: users.vip1.private,
            userID: users.u12.public,
            enabled: true,
            reason: "new reason 12",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = [
            {
                enabled: 0,
                issuerUserID: users.vip1.public,
                reason: "warn reason 12",
            },
            {
                enabled: 1,
                issuerUserID: users.vip1.public,
                reason: "new reason 12",
            }
        ];
        assert.equal(row.length, 2);
        assert.ok(partialDeepEquals(row[0], expected[0]), "warning 1");
        assert.ok(partialDeepEquals(row[1], expected[1]), "warning 2");
    });

    it("Should be able to warn a previously warned user again (different vip)", async () => {
        const json = {
            issuerUserID: users.vip2.private,
            userID: users.u13.public,
            enabled: true,
            reason: "new reason 13",
        };

        const res = await client.post(endpoint, json);
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = [
            {
                enabled: 0,
                issuerUserID: users.vip1.public,
                reason: "warn reason 13",
            },
            {
                enabled: 1,
                issuerUserID: users.vip2.public,
                reason: "new reason 13",
            }
        ];
        assert.equal(row.length, 2);
        assert.ok(partialDeepEquals(row[0], expected[0]), "warning 1");
        assert.ok(partialDeepEquals(row[1], expected[1]), "warning 2");
    });

    it("Disabling a warning should only set disableTime for the active warning", async () => {
        const json = {
            issuerUserID: users.vip2.private,
            userID: users.u14.public,
            enabled: false,
        };
        const beforeTime = Date.now();

        const res = await client.post(endpoint, json);
        const afterTime = Date.now();
        assert.strictEqual(res.status, 200);
        const row = await getWarning(json.userID);
        const expected = [
            {
                enabled: 0,
                issuerUserID: users.vip1.public,
                reason: "warn reason 14",
                disableTime: 12345,
            },
            {
                enabled: 0,
                issuerUserID: users.vip1.public,
                reason: "another reason 14",
            }
        ];
        assert.equal(row.length, 2);
        assert.ok(partialDeepEquals(row[0], expected[0]), "warning 1");
        assert.ok(partialDeepEquals(row[1], expected[1]), "warning 2");
        // check disableTime
        assert.ok(row[1].disableTime >= beforeTime && row[1].disableTime <= afterTime, "expected disableTime to be somewhere between execution start and end");
    });
});
